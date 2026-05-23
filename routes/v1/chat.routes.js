import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../../controllers/chat.controller.js';

const router = express.Router();

router.use(authenticate);

const convId = param('id').isMongoId().withMessage('Invalid conversation ID');

router.get('/conversations', listConversations);
router.get(
  '/conversations/:id/messages',
  convId,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('before').optional().isISO8601(),
  validateRequest,
  getMessages
);
router.post(
  '/conversations/:id/messages',
  convId,
  body('text').trim().notEmpty().isLength({ max: 2000 }),
  validateRequest,
  sendMessage
);
router.patch('/conversations/:id/read', convId, validateRequest, markConversationRead);

export default router;
