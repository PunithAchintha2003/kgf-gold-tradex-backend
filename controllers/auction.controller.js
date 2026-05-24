import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { serializeAuctionForPublic } from '../utils/auctionHelpers.js';

const CATEGORY_SLUG_MAP = {
  rings: 'Rings',
  necklaces: 'Necklaces',
  earrings: 'Earrings',
  bracelets: 'Bracelets',
  pendants: 'Pendants',
  biscuits: 'Biscuits',
  coins: 'Coins',
  bars: 'Bars',
};

function resolveCategoryFilter(categoryQuery) {
  if (!categoryQuery || categoryQuery === 'all') return null;
  const lower = String(categoryQuery).toLowerCase();
  return CATEGORY_SLUG_MAP[lower] || categoryQuery;
}

/**
 * Public list of active (and recently ended) auctions
 */
export const listPublicAuctions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;
    const category = resolveCategoryFilter(req.query.category);
    const endingSoon = req.query.endingSoon === 'true';
    const sortLatest = req.query.sort === 'latest';

    const query = { status: { $in: ['active', 'ended'] } };
    if (category) {
      query.category = category;
    }
    if (endingSoon) {
      const twoHoursFromNow = new Date(Date.now() + 2 * 3600 * 1000);
      query.status = 'active';
      query.endsAt = { $lte: twoHoursFromNow, $gt: new Date() };
    }

    let sortOption = { status: 1, endsAt: 1 };
    if (sortLatest) {
      sortOption = { createdAt: -1 };
    }

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('merchant', 'name merchantVerified')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Auction.countDocuments(query),
    ]);

    const items = auctions.map((a) =>
      serializeAuctionForPublic(a, a.merchant?.name)
    );

    res.status(200).json({
      success: true,
      data: {
        auctions: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public auction detail + recent bids
 */
export const getPublicAuctionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid auction ID', 400));
    }

    const auction = await Auction.findOne({
      _id: id,
      status: { $in: ['active', 'ended'] },
    })
      .populate('merchant', 'name merchantVerified')
      .populate('winner', 'name')
      .lean();

    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }

    const bids = await Bid.find({ auction: id })
      .populate('bidder', 'name')
      .sort({ amount: -1, placedAt: -1 })
      .limit(50)
      .lean();

    const serialized = serializeAuctionForPublic(auction, auction.merchant?.name);
    if (auction.winner) {
      serialized.winnerName = auction.winner?.name || null;
    }

    res.status(200).json({
      success: true,
      data: {
        auction: serialized,
        bids: bids.map((b) => ({
          id: String(b._id),
          amount: b.amount,
          placedAt: b.placedAt,
          bidderName: b.bidder?.name || 'Bidder',
          bidderId: String(b.bidder?._id || b.bidder),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bid history for an auction (public)
 */
export const getAuctionBids = async (req, res, next) => {
  try {
    const { id } = req.params;
    const auction = await Auction.findById(id).select('status').lean();
    if (!auction) {
      return next(new AppError('Auction not found', 404));
    }

    const bids = await Bid.find({ auction: id })
      .populate('bidder', 'name email')
      .sort({ amount: -1, placedAt: -1 })
      .lean();

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
              }
            : null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
