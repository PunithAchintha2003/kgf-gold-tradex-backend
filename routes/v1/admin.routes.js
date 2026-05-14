import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats,
} from '../../controllers/admin.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/admin.js';
import {
  body,
  param,
  query,
} from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Validation rules
const updateUserValidation = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
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
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'USER', 'MERCHANT'])
    .withMessage('Role must be SUPER_ADMIN, USER, or MERCHANT'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('merchantVerified')
    .optional()
    .isBoolean()
    .withMessage('merchantVerified must be a boolean'),
];

const getUserByIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const deleteUserValidation = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search is too long'),
  query('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'USER', 'MERCHANT'])
    .withMessage('role must be SUPER_ADMIN, USER, or MERCHANT'),
];

const createUserValidation = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Name is required (2–100 characters)'),
  body('email').trim().notEmpty().isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password')
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'USER', 'MERCHANT'])
    .withMessage('Invalid role'),
  body('merchantVerified').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

// Routes
router.get('/dashboard/stats', getDashboardStats);
router.post('/users', createUserValidation, validateRequest, createUser);
router.get('/users', listUsersValidation, validateRequest, getAllUsers);
router.get('/users/:id', getUserByIdValidation, validateRequest, getUserById);
router.put('/users/:id', updateUserValidation, validateRequest, updateUser);
router.delete('/users/:id', deleteUserValidation, validateRequest, deleteUser);

export default router;

