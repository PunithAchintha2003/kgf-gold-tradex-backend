import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { requireMerchant } from '../../middleware/merchant.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { downloadMerchantBackup } from '../../controllers/merchantBackup.controller.js';
import {
  getMerchantDashboardStats,
  getMerchantOrders,
  updateMerchantOrderLineDelivery,
  getMyProducts,
  getMyProductById,
  uploadProductImages,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/merchant.controller.js';
import { productImagesUpload, handleProductImagesMulterError } from '../../middleware/productImageUpload.js';
import { PRODUCT_CATEGORIES } from '../../constants/productCategories.js';

const router = express.Router();

const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many backup requests. Please wait before exporting again.',
  },
});

router.use(authenticate);
router.use(requireMerchant);

const mongoId = param('id')
  .notEmpty()
  .withMessage('ID is required')
  .isMongoId()
  .withMessage('Invalid ID');

const createProductValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('sku').optional().isString().isLength({ max: 64 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('currency').optional().isString().trim().isLength({ min: 2, max: 8 }),
  body('category').optional().isIn(PRODUCT_CATEGORIES).withMessage('Invalid category'),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray({ max: 5 }),
  body('images.*').optional().isString().isLength({ max: 2048 }),
  body('imageUrl').optional().isString().isLength({ max: 2048 }),
  body('isPublished').optional().isBoolean(),
];

const updateProductValidation = [
  mongoId,
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('sku').optional().isString().isLength({ max: 64 }),
  body('price').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().trim().isLength({ min: 2, max: 8 }),
  body('category').optional().isIn(PRODUCT_CATEGORIES).withMessage('Invalid category'),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray({ max: 5 }),
  body('images.*').optional().isString().isLength({ max: 2048 }),
  body('imageUrl').optional().isString().isLength({ max: 2048 }),
  body('isPublished').optional().isBoolean(),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('search').optional().isString().isLength({ max: 120 }),
];

const uploadProductImagesQuery = [
  query('productId').optional().isMongoId().withMessage('Invalid product ID'),
];

const orderLineParams = [
  param('orderId').notEmpty().isMongoId().withMessage('Invalid order ID'),
  param('lineItemId').notEmpty().isMongoId().withMessage('Invalid line item ID'),
];

const updateLineDeliveryValidation = [
  ...orderLineParams,
  body('deliveryStatus')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid delivery status'),
];

router.get('/dashboard/stats', getMerchantDashboardStats);
router.get('/backup', backupLimiter, downloadMerchantBackup);
router.get('/orders', getMerchantOrders);
router.patch(
  '/orders/:orderId/line-items/:lineItemId',
  updateLineDeliveryValidation,
  validateRequest,
  updateMerchantOrderLineDelivery
);
router.get('/products', listValidation, validateRequest, getMyProducts);
router.post(
  '/products/images',
  uploadProductImagesQuery,
  validateRequest,
  productImagesUpload,
  handleProductImagesMulterError,
  uploadProductImages
);
router.get('/products/:id', mongoId, validateRequest, getMyProductById);
router.post('/products', createProductValidation, validateRequest, createProduct);
router.put('/products/:id', updateProductValidation, validateRequest, updateProduct);
router.delete('/products/:id', mongoId, validateRequest, deleteProduct);

export default router;
