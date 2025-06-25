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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
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
