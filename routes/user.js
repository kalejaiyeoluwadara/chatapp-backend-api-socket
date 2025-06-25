const express = require("express");
const UserController = require("../controllers/userController");
const { validateProfileUpdate } = require("../utils/validation");
const { handleValidationErrors } = require("../utils/errorHandler");
const { profilePictureUpload } = require("../utils/upload");

const router = express.Router();

// Get current user profile
router.get("/profile", UserController.getProfile);

// Get user profile by ID (for friends)
router.get("/profile/:userId", UserController.getUserProfile);

// Update user profile
router.patch(
  "/profile",
  validateProfileUpdate,
  handleValidationErrors,
  UserController.updateProfile
);

// Upload profile picture
router.post(
  "/profile/picture",
  profilePictureUpload.single("profilePicture"),
  UserController.uploadProfilePicture
);

// Delete profile picture
router.delete("/profile/picture", UserController.deleteProfilePicture);

module.exports = router;
