import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Conversation from '../models/Conversation.js';
import { setIO, auctionRoom, conversationRoom, userRoom, adminRoom } from './io.js';

/** In-memory watcher counts per auction (socket id sets) */
const auctionWatchers = new Map();

function getWatcherCount(auctionId) {
  const set = auctionWatchers.get(auctionId);
  return set ? set.size : 0;
}

async function syncWatcherCountToDb(auctionId, count) {
  try {
    await Auction.findByIdAndUpdate(auctionId, { watcherCount: count });
  } catch {
    /* ignore */
  }
}

function broadcastWatchers(io, auctionId) {
  const count = getWatcherCount(auctionId);
  io.to(auctionRoom(auctionId)).emit('auction:watchers', { auctionId, watcherCount: count });
  void syncWatcherCountToDb(auctionId, count);
}

export function attachSocket(httpServer, corsOptions) {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [
        'http://localhost:4000',
        'http://localhost:4001',
        'http://localhost:5173',
      ];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    path: '/socket.io',
  });

  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.userId = null;
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshToken -refreshTokenExpiry');
      if (!user || !user.isActive) {
        return next(new Error('Unauthorized'));
      }
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(userRoom(socket.userId));
      if (socket.user?.role === 'SUPER_ADMIN') {
        socket.join(adminRoom());
      }
    }

    socket.on('auction:watch', async ({ auctionId }) => {
      if (!auctionId) return;
      const room = auctionRoom(auctionId);
      socket.join(room);
      if (!auctionWatchers.has(auctionId)) {
        auctionWatchers.set(auctionId, new Set());
      }
      auctionWatchers.get(auctionId).add(socket.id);
      broadcastWatchers(io, auctionId);
    });

    socket.on('auction:unwatch', ({ auctionId }) => {
      if (!auctionId) return;
      const room = auctionRoom(auctionId);
      socket.leave(room);
      const set = auctionWatchers.get(auctionId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) auctionWatchers.delete(auctionId);
      }
      broadcastWatchers(io, auctionId);
    });

    socket.on('chat:join', async ({ conversationId }) => {
      if (!socket.userId || !conversationId) return;
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;
        const members = conv.participants.map((p) => String(p));
        if (!members.includes(socket.userId)) return;
        socket.join(conversationRoom(conversationId));
      } catch {
        /* ignore */
      }
    });

    socket.on('chat:typing', async ({ conversationId }) => {
      if (!socket.userId || !conversationId) return;
      socket.to(conversationRoom(conversationId)).emit('chat:typing', {
        conversationId,
        userId: socket.userId,
        userName: socket.user?.name || 'User',
      });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('auction:')) {
          const auctionId = room.replace('auction:', '');
          const set = auctionWatchers.get(auctionId);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) auctionWatchers.delete(auctionId);
            broadcastWatchers(io, auctionId);
          }
        }
      }
    });
  });

  return io;
}
