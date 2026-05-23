import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { getIO, auctionRoom, userRoom } from '../realtime/io.js';

/**
 * Close a single auction: pick winner, create conversation, emit events.
 */
export async function closeAuction(auctionId) {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.status !== 'active') {
    return null;
  }

  const now = new Date();
  if (new Date(auction.endsAt).getTime() > now.getTime()) {
    return null;
  }

  const topBid = await Bid.findOne({ auction: auction._id })
    .sort({ amount: -1, placedAt: 1 })
    .lean();

  auction.status = 'ended';
  if (topBid) {
    auction.winner = topBid.bidder;
    auction.winnerBid = topBid._id;
    auction.currentBid = topBid.amount;
  }
  await auction.save();

  let conversation = null;
  if (topBid) {
    conversation = await Conversation.findOneAndUpdate(
      { auction: auction._id },
      {
        $setOnInsert: {
          kind: 'auction_winner',
          auction: auction._id,
          participants: [auction.merchant, topBid.bidder],
          lastMessageAt: now,
          lastMessagePreview: 'Auction won — chat with the seller to arrange payment and delivery.',
        },
      },
      { upsert: true, new: true }
    );

    const merchant = await User.findById(auction.merchant).select('name').lean();
    const winner = await User.findById(topBid.bidder).select('name email').lean();

    const payload = {
      auctionId: String(auction._id),
      status: 'ended',
      currentBid: auction.currentBid,
      winnerId: String(topBid.bidder),
      winnerName: winner?.name || 'Winner',
      conversationId: conversation ? String(conversation._id) : null,
    };

    const io = getIO();
    if (io) {
      io.to(auctionRoom(String(auction._id))).emit('auction:ended', payload);
      if (conversation) {
        const convPayload = {
          conversation: {
            id: String(conversation._id),
            kind: conversation.kind,
            auctionId: String(auction._id),
            auctionTitle: auction.title,
            participants: conversation.participants.map((p) => String(p)),
            lastMessageAt: conversation.lastMessageAt,
            lastMessagePreview: conversation.lastMessagePreview,
            otherPartyName: null,
          },
        };
        io.to(userRoom(String(auction.merchant))).emit('conversation:created', {
          ...convPayload,
          conversation: {
            ...convPayload.conversation,
            otherPartyName: winner?.name || 'Winner',
          },
        });
        io.to(userRoom(String(topBid.bidder))).emit('conversation:created', {
          ...convPayload,
          conversation: {
            ...convPayload.conversation,
            otherPartyName: merchant?.name || 'Merchant',
          },
        });
      }
    }
  } else {
    const io = getIO();
    if (io) {
      io.to(auctionRoom(String(auction._id))).emit('auction:ended', {
        auctionId: String(auction._id),
        status: 'ended',
        currentBid: auction.currentBid,
        winnerId: null,
        winnerName: null,
        conversationId: null,
      });
    }
  }

  return { auction, conversation, topBid };
}

/**
 * Activate scheduled auctions whose startsAt has passed.
 */
export async function activateDueAuctions() {
  const now = new Date();
  await Auction.updateMany(
    { status: 'scheduled', startsAt: { $lte: now }, endsAt: { $gt: now } },
    { $set: { status: 'active' } }
  );
}

/**
 * Close all expired active auctions.
 */
export async function closeExpiredAuctions() {
  const now = new Date();
  const expired = await Auction.find({
    status: 'active',
    endsAt: { $lte: now },
  })
    .select('_id')
    .lean();

  for (const a of expired) {
    await closeAuction(a._id);
  }
}
