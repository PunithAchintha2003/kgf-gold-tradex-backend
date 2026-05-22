import express from 'express';
import { param, body } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';
import { optionalAuth } from '../../middleware/auth.js';
import {
  getARConfig,
  startSession,
  endSession,
  recordSnapshot,
} from '../../controllers/arTryOn.controller.js';

const router = express.Router();

const productIdParam = param('productId').isMongoId().withMessage('Invalid product id');
const sessionIdParam = param('sessionId').isMongoId().withMessage('Invalid session id');

router.get('/config/:productId', productIdParam, validateRequest, getARConfig);

router.post(
  '/sessions',
  optionalAuth,
  body('productId').isMongoId().withMessage('Invalid product id'),
  body('anchor').optional().isIn(['finger', 'wrist', 'ear', 'neck', 'palm']),
  body('camera').optional().isIn(['user', 'environment']),
  body('client').optional().isObject(),
  body('client.userAgent').optional().isString().isLength({ max: 500 }),
  body('client.viewport').optional().isObject(),
  body('client.viewport.width').optional().isInt({ min: 0, max: 10000 }),
  body('client.viewport.height').optional().isInt({ min: 0, max: 10000 }),
  validateRequest,
  startSession
);

router.patch(
  '/sessions/:sessionId',
  optionalAuth,
  sessionIdParam,
  body('frameCount').optional().isInt({ min: 0 }),
  body('trackedFrameCount').optional().isInt({ min: 0 }),
  body('snapshotCount').optional().isInt({ min: 0 }),
  body('shareCount').optional().isInt({ min: 0 }),
  body('endReason').optional().isIn(['closed', 'error', 'addedToCart', 'navigated', 'timeout']),
  body('errorMessage').optional().isString().isLength({ max: 500 }),
  validateRequest,
  endSession
);

router.post(
  '/sessions/:sessionId/snapshots',
  optionalAuth,
  sessionIdParam,
  body('kind').optional().isIn(['snapshot', 'share']),
  validateRequest,
  recordSnapshot
);

export default router;
