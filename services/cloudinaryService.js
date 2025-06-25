const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  // Upload profile picture
  async uploadProfilePicture(file, userId) {
    try {
      const options = {
        folder: "chat-app/profiles",
        public_id: `profile_${userId}`,
        overwrite: true,
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      };

      const result = await cloudinary.uploader.upload(file.path, options);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload profile picture");
    }
  }

  // Upload chat image
  async uploadChatImage(file, senderId, receiverId) {
    try {
      const options = {
        folder: "chat-app/messages",
        public_id: `chat_${senderId}_${receiverId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      };

      const result = await cloudinary.uploader.upload(file.path, options);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        size: result.bytes,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload chat image");
    }
  }

  // Upload chat file
  async uploadChatFile(file, senderId, receiverId) {
    try {
      const options = {
        folder: "chat-app/files",
        public_id: `file_${senderId}_${receiverId}_${Date.now()}`,
        resource_type: "auto",
      };

      const result = await cloudinary.uploader.upload(file.path, options);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname,
        fileSize: result.bytes,
        format: result.format,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload file");
    }
  }

  // Delete file from Cloudinary
  async deleteFile(publicId, resourceType = "image") {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      throw new Error("Failed to delete file");
    }
  }

  // Get file info
  async getFileInfo(publicId, resourceType = "image") {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return {
        success: true,
        info: result,
      };
    } catch (error) {
      console.error("Cloudinary get info error:", error);
      throw new Error("Failed to get file info");
    }
  }

  // Generate signed upload URL for direct uploads
  generateUploadSignature(params = {}) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: params.folder || "chat-app/uploads",
        ...params,
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  }
}

module.exports = new CloudinaryService();
