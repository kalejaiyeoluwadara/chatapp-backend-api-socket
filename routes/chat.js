const express = require("express");
const ChatController = require("../controllers/chatController");
const { validateMessage } = require("../utils/validation");
const { handleValidationErrors } = require("../utils/errorHandler");
const { chatFileUpload, chatImageUpload } = require("../utils/upload");

const router = express.Router();

// Get conversation with a friend
router.get("/conversation/:friendId", ChatController.getConversation);

// Get all conversations (recent chats)
router.get("/conversations", ChatController.getConversations);

// Send text message
router.post(
  "/message",
  validateMessage,
  handleValidationErrors,
  ChatController.sendMessage
);

// Upload and send image
router.post(
  "/image/:receiverId",
  chatImageUpload.single("image"),
  ChatController.sendImage
);

// Upload and send file
router.post(
  "/file/:receiverId",
  chatFileUpload.single("file"),
  ChatController.sendFile
);

// Mark messages as read
router.patch("/read/:friendId", ChatController.markMessagesAsRead);

// Delete message (soft delete)
router.delete("/message/:messageId", ChatController.deleteMessage);

// Get unread message count
router.get("/unread-count", ChatController.getUnreadCount);

module.exports = router;
