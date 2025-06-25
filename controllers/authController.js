const crypto = require("crypto");
const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const emailService = require("../services/emailService");

class AuthController {
  //#region Register new user
  static async register(req, res) {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          error: "User already exists",
          message:
            existingUser.email === email
              ? "Email is already registered"
              : "Username is already taken",
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(
          email,
          username,
          verificationToken
        );
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      // Generate JWT token
      const token = generateToken(user._id);

      res.status(201).json({
        message:
          "User registered successfully. Please check your email to verify your account.",
        user: user.getPublicProfile(),
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: "An error occurred during registration",
      });
    }
  }
  //#End region: Register new user

  //#region Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken(user._id);

      res.json({
        message: "Login successful",
        user: user.getPublicProfile(),
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Login failed",
        message: "An error occurred during login",
      });
    }
  }

  //#region Verify email
  static async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          error: "Verification token required",
          message: "Please provide a valid verification token",
        });
      }

      // Find user with this token
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired token",
          message: "The verification link is invalid or has expired",
        });
      }

      // Mark email as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.username);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      res.json({
        message:
          "Email verified successfully! You can now log in to your account.",
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        error: "Verification failed",
        message: "An error occurred during email verification",
      });
    }
  }
  //#End region: Verify email

  //#region Resend verification email
  static async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: "Email required",
          message: "Please provide your email address",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "No user found with this email address",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          error: "Email already verified",
          message: "This email address is already verified",
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(
        email,
        user.username,
        verificationToken
      );

      res.json({
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        error: "Failed to resend verification",
        message: "An error occurred while sending verification email",
      });
    }
  }
  //#End region: Resend verification email

  //#region Forgot password
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: "Email required",
          message: "Please provide your email address",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message:
            "If an account with this email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(
          email,
          user.username,
          resetToken
        );
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        return res.status(500).json({
          error: "Failed to send reset email",
          message: "An error occurred while sending password reset email",
        });
      }

      res.json({
        message:
          "If an account with this email exists, a password reset link has been sent",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        error: "Password reset failed",
        message: "An error occurred while processing password reset request",
      });
    }
  }
  //#End region: Forgot password  

  //#region Reset password
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: "Token and new password required",
          message: "Please provide both the reset token and new password",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "Password too short",
          message: "Password must be at least 6 characters long",
        });
      }

      // Find user with this token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired token",
          message: "The password reset link is invalid or has expired",
        });
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.json({
        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        error: "Password reset failed",
        message: "An error occurred while resetting password",
      });
    }
  }
  //#End region: Reset password
}

module.exports = AuthController;
