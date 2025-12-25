const { body, param, validationResult } = require('express-validator');

/**
 * Validation Middleware for CampusBay API
 * Ensures data integrity and security
 */

// Helper function to check validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// ==================== AUTH VALIDATORS ====================

const registerValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),

    body('college')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('College name too long'),

    validate
];

const loginValidator = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    validate
];

// ==================== ITEM VALIDATORS ====================

const createItemValidator = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
        .escape(),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Description too long (max 2000 characters)')
        .escape(),

    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number')
        .toFloat(),

    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['Books', 'Electronics', 'Fashion', 'Furniture', 'Stationery', 'General'])
        .withMessage('Invalid category'),

    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Location too long')
        .escape(),

    validate
];

const updateItemValidator = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
        .escape(),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Description too long')
        .escape(),

    body('price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Price must be a positive number')
        .toFloat(),

    body('category')
        .optional()
        .isIn(['Books', 'Electronics', 'Fashion', 'Furniture', 'Stationery', 'General'])
        .withMessage('Invalid category'),

    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Location too long')
        .escape(),

    validate
];

const itemIdValidator = [
    param('id')
        .isMongoId().withMessage('Invalid item ID format'),

    validate
];

// ==================== MESSAGE VALIDATORS ====================

const sendMessageValidator = [
    body('to')
        .notEmpty().withMessage('Recipient is required')
        .isMongoId().withMessage('Invalid recipient ID'),

    body('text')
        .trim()
        .notEmpty().withMessage('Message text is required')
        .isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
        .escape(),

    body('itemId')
        .optional()
        .isMongoId().withMessage('Invalid item ID'),

    validate
];

module.exports = {
    registerValidator,
    loginValidator,
    createItemValidator,
    updateItemValidator,
    itemIdValidator,
    sendMessageValidator,
    validate
};
