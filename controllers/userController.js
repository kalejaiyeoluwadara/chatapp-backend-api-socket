const User = require("../models/User");
const cloudinaryService = require("../services/cloudinaryService");

class UserController {
  //#region Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select("-password");

      res.json({
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        error: "Failed to get profile",
        message: "An error occurred while fetching profile",
      });
    }
  }
  //#End region: Get current user profile

  //#region Get user profile by ID
  static async getUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Check if users are friends
      if (!currentUser.isFriendsWith(userId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only view profiles of your friends",
        });
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "The requested user does not exist",
        });
      }

      res.json({
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({
        error: "Failed to get user profile",
        message: "An error occurred while fetching user profile",
      });
    }
  }
  //#End region: Get user profile by ID (for friends)

  //#region Update user profile
  static async updateProfile(req, res) {
    try {
      const { firstName, lastName, bio } = req.body;
      const updateData = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (bio !== undefined) updateData.bio = bio;

      const user = await User.findByIdAndUpdate(req.user._id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      res.json({
        message: "Profile updated successfully",
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        error: "Failed to update profile",
        message: "An error occurred while updating profile",
      });
    }
  }
  //#End region: Update user profile

  //#region Upload profile picture
  static async uploadProfilePicture(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message: "Please select an image file to upload",
        });
      }

      // Convert buffer to file object for Cloudinary
      const file = {
        path: `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      };

      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadProfilePicture(
        file,
        req.user._id
      );

      // Update user profile
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profilePicture: uploadResult.url },
        { new: true }
      ).select("-password");

      res.json({
        message: "Profile picture uploaded successfully",
        profilePicture: uploadResult.url,
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Upload profile picture error:", error);
      res.status(500).json({
        error: "Failed to upload profile picture",
        message: "An error occurred while uploading profile picture",
      });
    }
  }
  //#End region: Upload profile picture

  //#region Delete profile picture
  static async deleteProfilePicture(req, res) {
    try {
      const user = await User.findById(req.user._id);

      if (!user.profilePicture) {
        return res.status(400).json({
          error: "No profile picture",
          message: "You don't have a profile picture to delete",
        });
      }

      // Extract public ID from Cloudinary URL
      const urlParts = user.profilePicture.split("/");
      const publicId = urlParts[urlParts.length - 1].split(".")[0];
      const fullPublicId = `chat-app/profiles/${publicId}`;

      // Delete from Cloudinary
      try {
        await cloudinaryService.deleteImage(fullPublicId);
      } catch (cloudinaryError) {
        console.error("Failed to delete from Cloudinary:", cloudinaryError);
        // Continue with local deletion even if Cloudinary fails
      }

      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { profilePicture: null },
        { new: true }
      ).select("-password");

      res.json({
        message: "Profile picture deleted successfully",
        user: updatedUser.getPublicProfile(),
      });
    } catch (error) {
      console.error("Delete profile picture error:", error);
      res.status(500).json({
        error: "Failed to delete profile picture",
        message: "An error occurred while deleting profile picture",
      });
    }
  }
  //#End region: Delete profile picture
}

module.exports = UserController;
