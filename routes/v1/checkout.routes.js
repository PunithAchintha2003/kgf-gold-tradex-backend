import express from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  createCartCheckoutSession,
  verifyCartCheckoutSession,
  listPurchaseOrders,
} from '../../controllers/checkout.controller.js';

const router = express.Router();

const createSessionValidation = [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('items must include between 1 and 50 lines'),
  body('items.*.name').isString().trim().isLength({ min: 1, max: 200 }),
  body('items.*.priceLkr').isInt({ min: 1, max: 100000000 }),
  body('items.*.quantity').isInt({ min: 1, max: 99 }),
  body('items.*.productId').optional().isMongoId().withMessage('Invalid product ID'),
  body('items.*.merchantId').optional().isMongoId().withMessage('Invalid merchant ID'),
  body('items.*.imageUrl')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2048 })
    .withMessage('Invalid image URL'),
];

router.post(
  '/cart-session',
  authenticate,
  createSessionValidation,
  validateRequest,
  createCartCheckoutSession
);

router.get(
  '/verify-session',
  authenticate,
  query('session_id').isString().trim().isLength({ min: 10, max: 200 }),
  validateRequest,
  verifyCartCheckoutSession
);

router.get('/orders', authenticate, listPurchaseOrders);

export default router;
