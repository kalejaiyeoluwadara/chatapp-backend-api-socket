const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

//#region Indexes for better query performance
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, sender: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ isDeleted: 1 });

// Compound index for conversation queries
messageSchema.index({
  $or: [
    { sender: 1, receiver: 1 },
    { sender: 1, receiver: 1 },
  ],
  createdAt: -1,
});

// Virtual for conversation ID (unique identifier for a conversation between two users)
messageSchema.virtual("conversationId").get(function () {
  const users = [this.sender.toString(), this.receiver.toString()].sort();
  return `${users[0]}-${users[1]}`;
});

// Method to mark message as read
messageSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function (
  user1Id,
  user2Id,
  limit = 50,
  skip = 0
) {
  return this.find({
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id },
    ],
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "username firstName lastName profilePicture")
    .populate("receiver", "username firstName lastName profilePicture")
    .populate("replyTo", "content sender");
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiver: userId,
    isRead: false,
    isDeleted: false,
  });
};

// Static method to mark all messages as read in a conversation
messageSchema.statics.markConversationAsRead = function (
  user1Id,
  user2Id,
  currentUserId
) {
  return this.updateMany(
    {
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id },
      ],
      receiver: currentUserId,
      isRead: false,
      isDeleted: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

module.exports = mongoose.model("Message", messageSchema);
