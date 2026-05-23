import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { optionalAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { getSupportChatStatus, postSupportChat } from '../../controllers/supportChat.controller.js';

const router = express.Router();

const supportChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.SUPPORT_CHAT_RATE_LIMIT || '40', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many support chat requests. Please try again in a few minutes.',
  },
});

router.get('/status', getSupportChatStatus);

router.post(
  '/chat',
  supportChatLimiter,
  optionalAuth,
  body('messages').isArray({ min: 1, max: 24 }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().trim().notEmpty().isLength({ max: 2000 }),
  validateRequest,
  postSupportChat
);

export default router;
