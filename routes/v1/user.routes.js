import express from 'express';
import { getProfile, updateProfile } from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import {
  body,
} from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty'),
  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),
];

// Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validateRequest, updateProfile);

export default router;

