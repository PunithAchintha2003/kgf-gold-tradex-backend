import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { AppError } from '../utils/AppError.js';
import {
  applyAntiSnipe,
  computeNextMinimum,
} from '../utils/auctionHelpers.js';
import { getIO, auctionRoom } from '../realtime/io.js';

/**
 * Place a bid on an active auction
 */
export const placeBid = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const amount = Number(req.body.amount);
    const bidderId = req.userId;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Invalid bid amount', 400);
    }

    const auction = await Auction.findById(id).session(session);
    if (!auction) {
      throw new AppError('Auction not found', 404);
    }
    if (auction.status !== 'active') {
      throw new AppError('Auction is not accepting bids', 400);
    }
    if (String(auction.merchant) === String(bidderId)) {
      throw new AppError('Merchants cannot bid on their own auctions', 403);
    }
    if (new Date(auction.endsAt).getTime() <= Date.now()) {
      throw new AppError('Auction has ended', 400);
    }
    if (amount < auction.nextMinimum) {
      throw new AppError(`Minimum bid is LKR ${auction.nextMinimum.toLocaleString()}`, 400);
    }

    const bid = await Bid.create(
      [
        {
          auction: auction._id,
          bidder: bidderId,
          amount,
          placedAt: new Date(),
        },
      ],
      { session }
    );

    const newEndsAt = applyAntiSnipe(auction.endsAt);
    const extended = new Date(newEndsAt).getTime() !== new Date(auction.endsAt).getTime();

    auction.currentBid = amount;
    auction.nextMinimum = computeNextMinimum(amount, auction.minIncrement);
    auction.bidCount += 1;
    auction.endsAt = newEndsAt;
    await auction.save({ session });

    await session.commitTransaction();

    const bidder = req.user;
    const payload = {
      auctionId: String(auction._id),
      currentBid: auction.currentBid,
      nextMinimum: auction.nextMinimum,
      bidCount: auction.bidCount,
      endsAt: auction.endsAt,
      extended,
      bid: {
        id: String(bid[0]._id),
        amount,
        placedAt: bid[0].placedAt,
        bidderName: bidder?.name || 'Bidder',
        bidderId: String(bidderId),
      },
    };

    const io = getIO();
    if (io) {
      io.to(auctionRoom(String(auction._id))).emit('auction:bid', payload);
      if (extended) {
        io.to(auctionRoom(String(auction._id))).emit('auction:extended', {
          auctionId: String(auction._id),
          endsAt: auction.endsAt,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: payload,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
