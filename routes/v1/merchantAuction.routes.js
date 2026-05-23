import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { requireMerchant } from '../../middleware/merchant.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  getMyAuctions,
  getMyAuctionById,
  getMyAuctionBidders,
  getWinnerConversation,
  uploadAuctionImages,
  createAuction,
  updateAuction,
  cancelAuction,
  deleteAuction,
} from '../../controllers/merchantAuction.controller.js';
import { productImagesUpload, handleProductImagesMulterError } from '../../middleware/productImageUpload.js';
import { PRODUCT_CATEGORIES } from '../../constants/productCategories.js';

const router = express.Router();

router.use(authenticate);
router.use(requireMerchant);

const mongoId = param('id').isMongoId().withMessage('Invalid auction ID');

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').optional().isIn(PRODUCT_CATEGORIES),
  body('purity').optional().isString().isLength({ max: 32 }),
  body('weight').optional().isString().isLength({ max: 32 }),
  body('condition').optional().isString().isLength({ max: 64 }),
  body('startingBid').isFloat({ min: 0 }).withMessage('Starting bid must be non-negative'),
  body('minIncrement').optional().isFloat({ min: 1 }),
  body('durationHours').optional().isInt({ min: 1, max: 168 }),
  body('images').optional().isArray({ max: 5 }),
  body('images.*').optional().isString().isLength({ max: 2048 }),
];

const updateValidation = [
  mongoId,
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').optional().isIn(PRODUCT_CATEGORIES),
  body('purity').optional().isString().isLength({ max: 32 }),
  body('weight').optional().isString().isLength({ max: 32 }),
  body('condition').optional().isString().isLength({ max: 64 }),
  body('images').optional().isArray({ max: 5 }),
  body('images.*').optional().isString().isLength({ max: 2048 }),
  body('durationHours').optional().isInt({ min: 1, max: 168 }),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 120 }),
  query('status').optional().isIn(['scheduled', 'active', 'ended', 'cancelled']),
];

router.get('/', listValidation, validateRequest, getMyAuctions);
router.post(
  '/images',
  productImagesUpload,
  handleProductImagesMulterError,
  uploadAuctionImages
);
router.get('/:id', mongoId, validateRequest, getMyAuctionById);
router.get('/:id/bidders', mongoId, validateRequest, getMyAuctionBidders);
router.get('/:id/winner-conversation', mongoId, validateRequest, getWinnerConversation);
router.post('/', createValidation, validateRequest, createAuction);
router.put('/:id', updateValidation, validateRequest, updateAuction);
router.patch('/:id/cancel', mongoId, validateRequest, cancelAuction);
router.delete('/:id', mongoId, validateRequest, deleteAuction);

export default router;
