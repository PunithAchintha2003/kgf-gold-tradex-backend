import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { placeBid } from '../../controllers/bid.controller.js';

const router = express.Router({ mergeParams: true });

router.post(
  '/',
  authenticate,
  param('id').isMongoId().withMessage('Invalid auction ID'),
  body('amount').isFloat({ min: 1 }).withMessage('Bid amount must be a positive number'),
  validateRequest,
  placeBid
);

export default router;
