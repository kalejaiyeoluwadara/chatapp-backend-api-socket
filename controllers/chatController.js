const Message = require("../models/Message");
const User = require("../models/User");
const cloudinaryService = require("../services/cloudinaryService");

class ChatController {
  //#region Get conversation with a friend
  static async getConversation(req, res) {
    try {
      const { friendId } = req.params;
      const { limit = 50, skip = 0 } = req.query;
      const currentUser = req.user;

      // Check if users are friends
      if (!currentUser.isFriendsWith(friendId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only view conversations with your friends",
        });
      }

      // Get conversation messages
      const messages = await Message.getConversation(
        currentUser._id,
        friendId,
        parseInt(limit),
        parseInt(skip)
      );

      // Mark messages as read
      await Message.markConversationAsRead(
        currentUser._id,
        friendId,
        currentUser._id
      );

      res.json({
        messages: messages.reverse(), // Return in chronological order
        hasMore: messages.length === parseInt(limit),
      });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({
        error: "Failed to get conversation",
        message: "An error occurred while fetching conversation",
      });
    }
  }
  //#End region: Get conversation with a friend

  //#region Get all conversations (recent chats)
  static async getConversations(req, res) {
    try {
      const currentUser = req.user;

      // Get all friends
      const user = await User.findById(currentUser._id).populate("friends");
      const friends = user.friends;

      const conversations = [];

      // Get last message for each friend
      for (const friend of friends) {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: currentUser._id, receiver: friend._id },
            { sender: friend._id, receiver: currentUser._id },
          ],
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .populate("sender", "username firstName lastName profilePicture")
          .populate("receiver", "username firstName lastName profilePicture");

        if (lastMessage) {
          // Get unread count
          const unreadCount = await Message.countDocuments({
            sender: friend._id,
            receiver: currentUser._id,
            isRead: false,
            isDeleted: false,
          });

          conversations.push({
            friend: friend.getPublicProfile(),
            lastMessage: {
              _id: lastMessage._id,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              sender: lastMessage.sender.getPublicProfile(),
              receiver: lastMessage.receiver.getPublicProfile(),
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.isRead,
            },
            unreadCount,
          });
        }
      }

      // Sort by last message date
      conversations.sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      );

      res.json({
        conversations,
      });
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({
        error: "Failed to get conversations",
        message: "An error occurred while fetching conversations",
      });
    }
  }
  //#End region: Get all conversations (recent chats)

  //#region Send text message
  static async sendMessage(req, res) {
    try {
      const { content, receiverId, replyTo } = req.body;
      const currentUser = req.user;

      // Check if users are friends
      if (!currentUser.isFriendsWith(receiverId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only send messages to your friends",
        });
      }

      // Validate replyTo if provided
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (!replyMessage) {
          return res.status(400).json({
            error: "Invalid reply",
            message: "The message you are replying to does not exist",
          });
        }
      }

      // Create new message
      const message = new Message({
        sender: currentUser._id,
        receiver: receiverId,
        content,
        replyTo: replyTo || null,
      });

      await message.save();

      // Populate sender and receiver info
      await message.populate(
        "sender",
        "username firstName lastName profilePicture"
      );
      await message.populate(
        "receiver",
        "username firstName lastName profilePicture"
      );
      if (replyTo) {
        await message.populate("replyTo", "content sender");
      }

      res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: "An error occurred while sending message",
      });
    }
  }
  //#End region: Send text message

  //#region Upload and send image
  static async sendImage(req, res) {
    try {
      const { receiverId } = req.params;
      const { replyTo } = req.body;
      const currentUser = req.user;

      if (!req.file) {
        return res.status(400).json({
          error: "No image uploaded",
          message: "Please select an image file to upload",
        });
      }

      // Check if users are friends
      if (!currentUser.isFriendsWith(receiverId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only send images to your friends",
        });
      }

      // Validate replyTo if provided
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (!replyMessage) {
          return res.status(400).json({
            error: "Invalid reply",
            message: "The message you are replying to does not exist",
          });
        }
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
      const uploadResult = await cloudinaryService.uploadChatImage(
        file,
        currentUser._id,
        receiverId
      );

      // Create new message
      const message = new Message({
        sender: currentUser._id,
        receiver: receiverId,
        content: "📷 Image",
        messageType: "image",
        fileUrl: uploadResult.url,
        fileName: req.file.originalname,
        fileSize: uploadResult.size,
        replyTo: replyTo || null,
      });

      await message.save();

      // Populate sender and receiver info
      await message.populate(
        "sender",
        "username firstName lastName profilePicture"
      );
      await message.populate(
        "receiver",
        "username firstName lastName profilePicture"
      );
      if (replyTo) {
        await message.populate("replyTo", "content sender");
      }

      res.status(201).json({
        message: "Image sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send image error:", error);
      res.status(500).json({
        error: "Failed to send image",
        message: "An error occurred while sending image",
      });
    }
  }
  //#End region: Upload and send image

  //#region Upload and send file
  static async sendFile(req, res) {
    try {
      const { receiverId } = req.params;
      const { replyTo } = req.body;
      const currentUser = req.user;

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message: "Please select a file to upload",
        });
      }

      // Check if users are friends
      if (!currentUser.isFriendsWith(receiverId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only send files to your friends",
        });
      }

      // Validate replyTo if provided
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (!replyMessage) {
          return res.status(400).json({
            error: "Invalid reply",
            message: "The message you are replying to does not exist",
          });
        }
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
      const uploadResult = await cloudinaryService.uploadChatFile(
        file,
        currentUser._id,
        receiverId
      );

      // Create new message
      const message = new Message({
        sender: currentUser._id,
        receiver: receiverId,
        content: `📎 ${req.file.originalname}`,
        messageType: "file",
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        replyTo: replyTo || null,
      });

      await message.save();

      // Populate sender and receiver info
      await message.populate(
        "sender",
        "username firstName lastName profilePicture"
      );
      await message.populate(
        "receiver",
        "username firstName lastName profilePicture"
      );
      if (replyTo) {
        await message.populate("replyTo", "content sender");
      }

      res.status(201).json({
        message: "File sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send file error:", error);
      res.status(500).json({
        error: "Failed to send file",
        message: "An error occurred while sending file",
      });
    }
  }
  //#End region: Upload and send file

  //#region Mark messages as read
  static async markMessagesAsRead(req, res) {
    try {
      const { friendId } = req.params;
      const currentUser = req.user;

      // Check if users are friends
      if (!currentUser.isFriendsWith(friendId)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only mark messages as read from your friends",
        });
      }

      // Mark all messages from this friend as read
      await Message.markConversationAsRead(
        currentUser._id,
        friendId,
        currentUser._id
      );

      res.json({
        message: "Messages marked as read successfully",
      });
    } catch (error) {
      console.error("Mark messages as read error:", error);
      res.status(500).json({
        error: "Failed to mark messages as read",
        message: "An error occurred while marking messages as read",
      });
    }
  }
  //#End region: Mark messages as read

  //#region Delete message (soft delete)
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const currentUser = req.user;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          error: "Message not found",
          message: "The message you are trying to delete does not exist",
        });
      }

      // Check if user owns the message
      if (message.sender.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only delete your own messages",
        });
      }

      // Soft delete the message
      await message.softDelete();

      res.json({
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({
        error: "Failed to delete message",
        message: "An error occurred while deleting message",
      });
    }
  }
  //#End region: Delete message (soft delete)

  //#region Get unread message count
  static async getUnreadCount(req, res) {
    try {
      const currentUser = req.user;

      const unreadCount = await Message.getUnreadCount(currentUser._id);

      res.json({
        unreadCount,
      });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({
        error: "Failed to get unread count",
        message: "An error occurred while fetching unread count",
      });
    }
  }
  //#End region: Get unread message count
}

module.exports = ChatController;
