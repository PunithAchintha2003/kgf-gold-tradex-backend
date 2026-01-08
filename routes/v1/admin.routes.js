import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats,
} from '../../controllers/admin.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/admin.js';
import {
  body,
  param,
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
    .isIn(['SUPER_ADMIN', 'USER'])
    .withMessage('Role must be either SUPER_ADMIN or USER'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
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

// Routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserByIdValidation, validateRequest, getUserById);
router.put('/users/:id', updateUserValidation, validateRequest, updateUser);
router.delete('/users/:id', deleteUserValidation, validateRequest, deleteUser);

export default router;

