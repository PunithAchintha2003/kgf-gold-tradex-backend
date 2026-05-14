import express from 'express';
import { query, param, body } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  getPublishedProducts,
  getPublishedProductById,
  getProductReviews,
  createProductReview,
} from '../../controllers/catalog.controller.js';

const router = express.Router();

const listPublishedValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().isLength({ max: 120 }),
  query('category').optional().isString().isLength({ max: 32 }),
];

const productIdParam = param('productId').isMongoId().withMessage('Invalid product id');

router.get('/products', listPublishedValidation, validateRequest, getPublishedProducts);

router.get(
  '/products/:productId/reviews',
  productIdParam,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  getProductReviews
);

router.post(
  '/products/:productId/reviews',
  productIdParam,
  body('authorName').optional().isString().isLength({ max: 80 }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().isLength({ max: 2000 }),
  validateRequest,
  createProductReview
);

router.get('/products/:productId', productIdParam, validateRequest, getPublishedProductById);

export default router;
