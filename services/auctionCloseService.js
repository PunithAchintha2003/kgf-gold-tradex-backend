import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { getIO, auctionRoom, userRoom } from '../realtime/io.js';
import { buildNotification, notifyAdmin, notifyUser } from '../realtime/notify.js';
import {
  isEmailConfigured,
  sendAuctionWinnerEmailToMerchant,
  sendAuctionEndedNoBidsEmailToMerchant,
} from './emailService.js';

async function emailMerchantAuctionResult(merchant, auctionTitle, options) {
  if (!isEmailConfigured() || !merchant?.email) {
    return;
  }
  const portalUrl =
    process.env.ADMIN_PORTAL_URL?.trim() ||
    process.env.MERCHANT_PORTAL_URL?.trim() ||
    'http://localhost:4001';

  try {
    if (options.hasWinner) {
      await sendAuctionWinnerEmailToMerchant({
        to: merchant.email,
        merchantName: merchant.name,
        auctionTitle,
        winningBid: options.winningBid,
        winnerName: options.winnerName,
        winnerEmail: options.winnerEmail,
        winnerPhone: options.winnerPhone,
        portalUrl,
      });
    } else {
      await sendAuctionEndedNoBidsEmailToMerchant({
        to: merchant.email,
        merchantName: merchant.name,
        auctionTitle,
        portalUrl,
      });
    }
  } catch (err) {
    console.error('Failed to send auction result email to merchant:', err.message || err);
  }
}

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

    const merchant = await User.findById(auction.merchant).select('name email phone').lean();
    const winner = await User.findById(topBid.bidder).select('name email phone').lean();

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

    notifyAdmin(
      buildNotification({
        type: 'auction_ended',
        title: 'Auction ended',
        message: topBid
          ? `"${auction.title}" ended with a winning bid of LKR ${auction.currentBid.toLocaleString()}.`
          : `"${auction.title}" ended with no bids.`,
        severity: topBid ? 'success' : 'warning',
        data: { auctionId: String(auction._id) },
      })
    );

    notifyUser(
      auction.merchant,
      buildNotification({
        type: 'auction_ended',
        title: topBid ? 'Your auction ended with a winner' : 'Your auction ended',
        message: topBid
          ? `"${auction.title}" sold for LKR ${auction.currentBid.toLocaleString()} to ${winner?.name || 'the winner'}.`
          : `"${auction.title}" ended without any bids.`,
        severity: topBid ? 'success' : 'warning',
        link: '/merchant/auctions/management',
        data: { auctionId: String(auction._id) },
      })
    );

    if (topBid) {
      notifyUser(
        topBid.bidder,
        buildNotification({
          type: 'auction_won',
          title: 'You won an auction',
          message: `You won "${auction.title}" for LKR ${auction.currentBid.toLocaleString()}.`,
          severity: 'success',
          data: { auctionId: String(auction._id), conversationId: conversation ? String(conversation._id) : null },
        })
      );
      if (conversation) {
        notifyUser(
          auction.merchant,
          buildNotification({
            type: 'chat_conversation',
            title: 'Winner chat ready',
            message: `Chat with ${winner?.name || 'the winner'} is open for "${auction.title}".`,
            severity: 'info',
            link: '/merchant',
            data: { conversationId: String(conversation._id) },
          })
        );
      }
    }

    await emailMerchantAuctionResult(merchant, auction.title, {
      hasWinner: true,
      winningBid: auction.currentBid,
      winnerName: winner?.name,
      winnerEmail: winner?.email,
      winnerPhone: winner?.phone,
    });
  } else {
    const merchant = await User.findById(auction.merchant).select('name email phone').lean();

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

    notifyUser(
      auction.merchant,
      buildNotification({
        type: 'auction_ended',
        title: 'Your auction ended',
        message: `"${auction.title}" ended without any bids.`,
        severity: 'warning',
        link: '/merchant/auctions/management',
        data: { auctionId: String(auction._id) },
      })
    );

    await emailMerchantAuctionResult(merchant, auction.title, { hasWinner: false });
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
