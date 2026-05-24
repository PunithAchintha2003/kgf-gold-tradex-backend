import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  body,
} from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  verifyEmail,
  resendVerificationCode,
  verifyLogin,
  resendLoginCode,
  forgotPassword,
  verifyForgotPasswordCode,
  resendForgotPasswordCode,
  resetForgottenPassword,
} from '../../controllers/auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      message: `Rate limit exceeded. Please wait ${Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 60000)} minutes before trying again.`,
    });
  },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT || '10', 10),
  message: {
    success: false,
    error: 'Too many verification attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.EMAIL_RESEND_RATE_LIMIT || '3', 10),
  message: {
    success: false,
    error: 'Too many resend requests. Please wait before requesting another code.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('address')
    .optional({ values: 'null' })
    .trim(),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const verifyEmailValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits'),
];

const resendValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const verifyLoginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits'),
  body('loginSessionToken')
    .trim()
    .notEmpty()
    .withMessage('Login session token is required'),
];

const resendLoginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('loginSessionToken')
    .trim()
    .notEmpty()
    .withMessage('Login session token is required'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const verifyForgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits'),
  body('resetSessionToken')
    .trim()
    .notEmpty()
    .withMessage('Reset session token is required'),
];

const resendForgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('resetSessionToken')
    .trim()
    .notEmpty()
    .withMessage('Reset session token is required'),
];

const resetForgottenPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('resetSessionToken')
    .trim()
    .notEmpty()
    .withMessage('Reset session token is required'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

router.post('/register', authLimiter, registerValidation, validateRequest, register);
router.post('/verify-email', verificationLimiter, verifyEmailValidation, validateRequest, verifyEmail);
router.post('/resend-verification', resendLimiter, resendValidation, validateRequest, resendVerificationCode);
router.post('/login', authLimiter, loginValidation, validateRequest, login);
router.post('/verify-login', verificationLimiter, verifyLoginValidation, validateRequest, verifyLogin);
router.post('/resend-login-code', resendLimiter, resendLoginValidation, validateRequest, resendLoginCode);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validateRequest, forgotPassword);
router.post(
  '/verify-forgot-password',
  verificationLimiter,
  verifyForgotPasswordValidation,
  validateRequest,
  verifyForgotPasswordCode
);
router.post(
  '/resend-forgot-password',
  resendLimiter,
  resendForgotPasswordValidation,
  validateRequest,
  resendForgotPasswordCode
);
router.post(
  '/reset-forgotten-password',
  authLimiter,
  resetForgottenPasswordValidation,
  validateRequest,
  resetForgottenPassword
);
router.post('/refresh-token', refreshTokenValidation, validateRequest, refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
