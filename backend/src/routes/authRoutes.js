const express   = require('express');
const { body }  = require('express-validator');
const { register, login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 120 }).withMessage('Full name must be between 2 and 120 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Must be a valid phone number'),
];

module.exports = router;
