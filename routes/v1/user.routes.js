import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getProfile,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  requestPasswordChange,
  confirmPasswordChange,
  resendCredentialOtp,
} from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';

const router = express.Router();

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT || '10', 10),
  message: {
    success: false,
    error: 'Too many verification attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.EMAIL_RESEND_RATE_LIMIT || '3', 10),
  message: {
    success: false,
    error: 'Too many resend requests. Please wait before requesting another code.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All user routes require authentication
router.use(authenticate);

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

const newEmailValidation = [
  body('newEmail')
    .trim()
    .notEmpty()
    .withMessage('New email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const otpCodeValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits'),
];

const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validateRequest, updateProfile);

router.post(
  '/request-email-change',
  credentialLimiter,
  newEmailValidation,
  validateRequest,
  requestEmailChange
);
router.post(
  '/confirm-email-change',
  credentialLimiter,
  otpCodeValidation,
  validateRequest,
  confirmEmailChange
);
router.post(
  '/request-password-change',
  credentialLimiter,
  passwordChangeValidation,
  validateRequest,
  requestPasswordChange
);
router.post(
  '/confirm-password-change',
  credentialLimiter,
  otpCodeValidation,
  validateRequest,
  confirmPasswordChange
);
router.post('/resend-credential-otp', resendCredentialLimiter, resendCredentialOtp);

export default router;
