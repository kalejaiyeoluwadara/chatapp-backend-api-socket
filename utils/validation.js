const { body } = require("express-validator");

// Auth validation middleware
const validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username must be 3-30 characters and contain only letters, numbers, and underscores"
    ),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("firstName")
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("First name is required and must be less than 50 characters"),
  body("lastName")
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Last name is required and must be less than 50 characters"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// User validation middleware
const validateProfileUpdate = [
  body("firstName")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("First name must be between 1 and 50 characters"),
  body("lastName")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage("Last name must be between 1 and 50 characters"),
  body("bio")
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage("Bio must be less than 500 characters"),
];

// Chat validation middleware
const validateMessage = [
  body("content")
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content must be between 1 and 2000 characters"),
  body("receiverId")
    .isMongoId()
    .withMessage("Please provide a valid receiver ID"),
];

// Friend validation middleware
const validateFriendRequest = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Please provide a valid username"),
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateMessage,
  validateFriendRequest,
};
