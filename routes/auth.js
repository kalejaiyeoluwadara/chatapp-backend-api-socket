const express = require("express");
const AuthController = require("../controllers/authController");
const { validateRegistration, validateLogin } = require("../utils/validation");
const { handleValidationErrors } = require("../utils/errorHandler");

const router = express.Router();

// Register new user
router.post(
  "/register",
  validateRegistration,
  handleValidationErrors,
  AuthController.register
);

// Login user
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  AuthController.login
);

// Verify email
router.get("/verify-email", AuthController.verifyEmail);

// Resend verification email
router.post("/resend-verification", AuthController.resendVerification);

// Forgot password
router.post("/forgot-password", AuthController.forgotPassword);

// Reset password
router.post("/reset-password", AuthController.resetPassword);

module.exports = router;
