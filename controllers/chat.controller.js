import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import { AppError } from '../utils/AppError.js';
import { getIO, conversationRoom, userRoom } from '../realtime/io.js';

function formatMessage(m, currentUserId) {
  const senderId = String(m.sender?._id || m.sender);
  const readBy = (m.readBy || []).map((id) => String(id));
  const isOwn = senderId === String(currentUserId);
  const otherHasRead = readBy.some((id) => id !== senderId);
  return {
    id: String(m._id),
    conversationId: String(m.conversation),
    senderId,
    senderName: m.sender?.name || 'User',
    text: m.text,
    createdAt: m.createdAt,
    isOwn,
    readBy,
    isRead: isOwn ? otherHasRead : readBy.includes(String(currentUserId)),
  };
}

async function assertConversationMember(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  const participantIds = conversation.participants.map((p) => String(p));
  if (!participantIds.includes(String(userId))) {
    throw new AppError('Access denied', 403);
  }
  return conversation;
}

function formatConversation(conv, currentUserId, otherUser, auction) {
  const unreadMap = conv.unread instanceof Map ? conv.unread : new Map(Object.entries(conv.unread || {}));
  const unread = unreadMap.get(String(currentUserId)) || 0;
  return {
    id: String(conv._id),
    kind: conv.kind,
    auctionId: conv.auction ? String(conv.auction) : null,
    auctionTitle: auction?.title || null,
    participants: conv.participants.map((p) => String(p)),
    otherPartyName: otherUser?.name || 'User',
    otherPartyId: otherUser ? String(otherUser._id) : null,
    lastMessageAt: conv.lastMessageAt,
    lastMessagePreview: conv.lastMessagePreview || '',
    unread,
  };
}

export const listConversations = async (req, res, next) => {
  try {
    const userId = req.userId;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    const otherIds = conversations
      .map((c) => c.participants.find((p) => String(p) !== String(userId)))
      .filter(Boolean);

    const auctionIds = conversations.map((c) => c.auction).filter(Boolean);

    const [users, auctions] = await Promise.all([
      User.find({ _id: { $in: otherIds } }).select('name').lean(),
      Auction.find({ _id: { $in: auctionIds } }).select('title').lean(),
    ]);

    const userById = new Map(users.map((u) => [String(u._id), u]));
    const auctionById = new Map(auctions.map((a) => [String(a._id), a]));

    const formatted = conversations.map((c) => {
      const otherId = c.participants.find((p) => String(p) !== String(userId));
      return formatConversation(
        c,
        userId,
        userById.get(String(otherId)),
        auctionById.get(String(c.auction))
      );
    });

    res.status(200).json({
      success: true,
      data: { conversations: formatted },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    await assertConversationMember(id, req.userId);

    const query = { conversation: id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const fetchLimit = limit + 1;
    const messages = await Message.find(query)
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    messages.reverse();

    res.status(200).json({
      success: true,
      data: {
        messages: messages.map((m) => formatMessage(m, req.userId)),
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || !String(text).trim()) {
      return next(new AppError('Message text is required', 400));
    }

    const conversation = await assertConversationMember(id, userId);
    const trimmed = String(text).trim().slice(0, 2000);

    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      text: trimmed,
      readBy: [userId],
    });

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = trimmed;
    const unread = conversation.unread instanceof Map ? conversation.unread : new Map();
    for (const pid of conversation.participants) {
      const pidStr = String(pid);
      if (pidStr !== String(userId)) {
        unread.set(pidStr, (unread.get(pidStr) || 0) + 1);
      } else {
        unread.set(pidStr, 0);
      }
    }
    conversation.unread = unread;
    await conversation.save();

    const sender = await User.findById(userId).select('name').lean();
    const populated = {
      ...message.toObject(),
      sender: { _id: userId, name: sender?.name || 'User' },
    };
    const formatted = formatMessage(populated, userId);
    const payload = {
      id: formatted.id,
      conversationId: formatted.conversationId,
      senderId: formatted.senderId,
      senderName: formatted.senderName,
      text: formatted.text,
      createdAt: formatted.createdAt,
      readBy: formatted.readBy,
      isRead: formatted.isRead,
    };

    const io = getIO();
    if (io) {
      io.to(conversationRoom(String(conversation._id))).emit('chat:message', payload);
      for (const pid of conversation.participants) {
        io.to(userRoom(String(pid))).emit('chat:message', payload);
      }
    }

    res.status(201).json({
      success: true,
      data: { message: { ...formatted, isOwn: true } },
    });
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const conversation = await assertConversationMember(id, userId);

    const unread = conversation.unread instanceof Map ? conversation.unread : new Map();
    unread.set(String(userId), 0);
    conversation.unread = unread;
    await conversation.save();

    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
      },
      { $addToSet: { readBy: userId } }
    );

    const io = getIO();
    if (io) {
      io.to(conversationRoom(String(conversation._id))).emit('chat:read', {
        conversationId: String(conversation._id),
        userId: String(userId),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
