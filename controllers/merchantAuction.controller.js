import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { uploadImageBuffer, isCloudinaryConfigured } from '../utils/cloudinaryUpload.js';
import {
  normalizeCategory,
  normalizeAuctionImages,
  computeNextMinimum,
  serializeAuctionForPublic,
} from '../utils/auctionHelpers.js';

const assertCanPublishAuction = async (userId) => {
  const user = await User.findById(userId).select('merchantVerified role');
  if (!user || user.role !== 'MERCHANT') {
    throw new AppError('Merchant account required', 403);
  }
  if (!user.merchantVerified) {
    throw new AppError('Verified seller status is required to publish auctions', 403);
  }
};

export const getMyAuctions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = req.query.status;

    const query = { merchant: req.userId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('winner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Auction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        auctions: auctions.map((a) => ({
          ...serializeAuctionForPublic(a),
          winner: a.winner
            ? {
                id: String(a.winner._id),
                name: a.winner.name,
                email: a.winner.email,
                phone: a.winner.phone,
              }
            : null,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAuctionById = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId })
      .populate('winner', 'name email phone')
      .lean();
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }
    res.status(200).json({
      success: true,
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAuctionBidders = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId });
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }

    const bids = await Bid.find({ auction: auction._id })
      .populate('bidder', 'name email phone')
      .sort({ amount: -1, placedAt: -1 })
      .lean();

    const uniqueBidders = new Map();
    for (const b of bids) {
      const id = String(b.bidder?._id || b.bidder);
      if (!uniqueBidders.has(id)) {
        uniqueBidders.set(id, {
          bidder: b.bidder
            ? {
                id,
                name: b.bidder.name,
                email: b.bidder.email,
                phone: b.bidder.phone,
              }
            : null,
          highestBid: b.amount,
          bidCount: 1,
          lastBidAt: b.placedAt,
        });
      } else {
        const entry = uniqueBidders.get(id);
        entry.bidCount += 1;
        if (b.amount > entry.highestBid) entry.highestBid = b.amount;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        bids: bids.map((b) => ({
          id: String(b._id),
          amount: b.amount,
          placedAt: b.placedAt,
          bidder: b.bidder
            ? {
                id: String(b.bidder._id),
                name: b.bidder.name,
                email: b.bidder.email,
                phone: b.bidder.phone,
              }
            : null,
        })),
        bidders: [...uniqueBidders.values()],
        winnerId: auction.winner ? String(auction.winner) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWinnerConversation = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId });
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }
    if (!auction.winner) {
      return next(new AppError('No winner for this auction yet', 400));
    }

    const conversation = await Conversation.findOne({ auction: auction._id }).lean();
    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { conversationId: String(conversation._id) },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAuctionImages = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return next(new AppError('Image uploads are not configured on the server', 503));
    }
    const files = req.files;
    if (!files?.length) {
      return next(new AppError('No images provided', 400));
    }

    const folder = `kgf-gold-tradex/merchants/${req.userId}/auctions`;
    const urls = [];
    for (const file of files) {
      const url = await uploadImageBuffer(file.buffer, folder);
      urls.push(url);
    }

    res.status(200).json({
      success: true,
      message: 'Images uploaded',
      data: { urls },
    });
  } catch (error) {
    next(error);
  }
};

export const createAuction = async (req, res, next) => {
  try {
    await assertCanPublishAuction(req.userId);

    const {
      title,
      description = '',
      purity = '22K',
      weight = '',
      condition = 'Excellent',
      startingBid,
      minIncrement = 2000,
      durationHours = 24,
    } = req.body;

    const category = normalizeCategory(req.body.category);
    const images = normalizeAuctionImages(req.body);
    const start = new Date();
    const hours = Math.max(1, Math.min(168, Number(durationHours) || 24));
    const endsAt = new Date(start.getTime() + hours * 3600 * 1000);
    const starting = Number(startingBid);
    if (!Number.isFinite(starting) || starting < 0) {
      return next(new AppError('Invalid starting bid', 400));
    }

    const increment = Number(minIncrement) || 2000;
    const auction = await Auction.create({
      merchant: req.userId,
      title,
      description,
      images,
      category,
      purity,
      weight,
      condition,
      startingBid: starting,
      currentBid: starting,
      minIncrement: increment,
      nextMinimum: computeNextMinimum(starting, increment),
      startsAt: start,
      endsAt,
      status: 'active',
      bidCount: 0,
      watcherCount: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Auction created',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId });
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }
    if (auction.status === 'ended') {
      return next(new AppError('Cannot edit an ended auction', 400));
    }
    if (auction.bidCount > 0) {
      const locked = ['startingBid', 'minIncrement', 'durationHours'];
      for (const key of locked) {
        if (req.body[key] !== undefined) {
          return next(new AppError('Cannot change pricing or duration after bids have been placed', 400));
        }
      }
    }

    const allowed = [
      'title',
      'description',
      'purity',
      'weight',
      'condition',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) auction[key] = req.body[key];
    }
    if (req.body.category !== undefined) {
      auction.category = normalizeCategory(req.body.category);
    }
    if (req.body.images !== undefined) {
      auction.images = normalizeAuctionImages(req.body);
    }

    if (auction.status === 'scheduled' && req.body.durationHours !== undefined) {
      const hours = Math.max(1, Math.min(168, Number(req.body.durationHours) || 24));
      auction.endsAt = new Date(auction.startsAt.getTime() + hours * 3600 * 1000);
    }

    await auction.save();
    res.status(200).json({
      success: true,
      message: 'Auction updated',
      data: { auction },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId });
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }
    if (auction.status === 'ended') {
      return next(new AppError('Auction already ended', 400));
    }
    if (auction.bidCount > 0) {
      return next(new AppError('Cannot cancel an auction with bids', 400));
    }
    auction.status = 'cancelled';
    await auction.save();
    res.status(200).json({
      success: true,
      message: 'Auction cancelled',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, merchant: req.userId });
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }
    if (auction.bidCount > 0 && auction.status !== 'cancelled') {
      return next(new AppError('Cannot delete an auction with bids', 400));
    }
    await Auction.deleteOne({ _id: auction._id });
    res.status(200).json({
      success: true,
      message: 'Auction deleted',
    });
  } catch (error) {
    next(error);
  }
};
