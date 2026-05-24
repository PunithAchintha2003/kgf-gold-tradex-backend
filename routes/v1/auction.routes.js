import express from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  listPublicAuctions,
  getPublicAuctionById,
  getAuctionBids,
} from '../../controllers/auction.controller.js';

const router = express.Router();

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString().isLength({ max: 32 }),
  query('endingSoon').optional().isIn(['true', 'false']),
  query('sort').optional().isIn(['latest', 'ending']),
];

const idParam = param('id').isMongoId().withMessage('Invalid auction ID');

router.get('/', listValidation, validateRequest, listPublicAuctions);
router.get('/:id', idParam, validateRequest, getPublicAuctionById);
router.get('/:id/bids', idParam, validateRequest, getAuctionBids);

export default router;
