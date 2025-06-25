const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

// Store connected users
const connectedUsers = new Map();

// Authenticate socket connection
const authenticateSocket = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    return user;
  } catch (error) {
    return null;
  }
};

// Setup Socket.IO handlers
const setupSocketHandlers = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const user = await authenticateSocket(token);
      if (!user) {
        return next(new Error("Invalid authentication token"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  // Handle connection
  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user.username} (${user._id})`);

    // Store user connection
    connectedUsers.set(user._id.toString(), {
      socketId: socket.id,
      user: user,
      connectedAt: new Date(),
    });

    // Update user online status
    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Join user to their personal room
    socket.join(`user_${user._id}`);

    // Notify friends that user is online
    const userWithFriends = await User.findById(user._id).populate("friends");
    userWithFriends.friends.forEach((friend) => {
      const friendSocket = connectedUsers.get(friend._id.toString());
      if (friendSocket) {
        io.to(friendSocket.socketId).emit("friend_online", {
          userId: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        });
      }
    });

    // Handle private message
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, messageType = "text", replyTo } = data;

        // Validate receiver
        if (!receiverId) {
          socket.emit("error", { message: "Receiver ID is required" });
          return;
        }

        // Check if users are friends
        if (!user.isFriendsWith(receiverId)) {
          socket.emit("error", {
            message: "You can only send messages to your friends",
          });
          return;
        }

        // Create message
        const message = new Message({
          sender: user._id,
          receiver: receiverId,
          content,
          messageType,
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

        // Send to receiver if online
        const receiverSocket = connectedUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit("new_message", {
            message: message,
            sender: user.getPublicProfile(),
          });
        }

        // Send confirmation to sender
        socket.emit("message_sent", {
          message: message,
          status: "sent",
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicator
    socket.on("typing_start", async (data) => {
      try {
        const { receiverId } = data;

        // Check if users are friends
        if (!user.isFriendsWith(receiverId)) {
          return;
        }

        // Send typing indicator to receiver
        const receiverSocket = connectedUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit("user_typing", {
            userId: user._id,
            username: user.username,
          });
        }
      } catch (error) {
        console.error("Typing indicator error:", error);
      }
    });

    socket.on("typing_stop", async (data) => {
      try {
        const { receiverId } = data;

        // Check if users are friends
        if (!user.isFriendsWith(receiverId)) {
          return;
        }

        // Send stop typing indicator to receiver
        const receiverSocket = connectedUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit("user_stop_typing", {
            userId: user._id,
            username: user.username,
          });
        }
      } catch (error) {
        console.error("Stop typing indicator error:", error);
      }
    });

    // Handle message read
    socket.on("mark_read", async (data) => {
      try {
        const { messageId, senderId } = data;

        // Mark message as read
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === user._id.toString()) {
          await message.markAsRead();

          // Notify sender that message was read
          const senderSocket = connectedUsers.get(senderId);
          if (senderSocket) {
            io.to(senderSocket.socketId).emit("message_read", {
              messageId: messageId,
              readAt: message.readAt,
            });
          }
        }
      } catch (error) {
        console.error("Mark read error:", error);
      }
    });

    // Handle friend request
    socket.on("friend_request", async (data) => {
      try {
        const { username } = data;

        // Find target user
        const targetUser = await User.findOne({ username });
        if (!targetUser) {
          socket.emit("error", { message: "User not found" });
          return;
        }

        // Check if already friends
        if (user.isFriendsWith(targetUser._id)) {
          socket.emit("error", {
            message: "You are already friends with this user",
          });
          return;
        }

        // Check if request already sent
        if (user.hasSentRequestTo(targetUser._id)) {
          socket.emit("error", {
            message: "You have already sent a friend request to this user",
          });
          return;
        }

        // Add friend request
        user.sentFriendRequests.push({
          to: targetUser._id,
          status: "pending",
          createdAt: new Date(),
        });

        targetUser.friendRequests.push({
          from: user._id,
          status: "pending",
          createdAt: new Date(),
        });

        await Promise.all([user.save(), targetUser.save()]);

        // Notify target user if online
        const targetSocket = connectedUsers.get(targetUser._id.toString());
        if (targetSocket) {
          io.to(targetSocket.socketId).emit("friend_request_received", {
            from: user.getPublicProfile(),
            requestId:
              user.sentFriendRequests[user.sentFriendRequests.length - 1]._id,
          });
        }

        socket.emit("friend_request_sent", {
          message: "Friend request sent successfully",
          targetUser: targetUser.getPublicProfile(),
        });
      } catch (error) {
        console.error("Friend request error:", error);
        socket.emit("error", { message: "Failed to send friend request" });
      }
    });

    // Handle friend request response
    socket.on("friend_request_response", async (data) => {
      try {
        const { requestId, action } = data; // action: 'accept' or 'reject'

        // Find the friend request
        const friendRequest = user.friendRequests.id(requestId);
        if (!friendRequest) {
          socket.emit("error", { message: "Friend request not found" });
          return;
        }

        if (friendRequest.status !== "pending") {
          socket.emit("error", {
            message: "This friend request has already been processed",
          });
          return;
        }

        const requester = await User.findById(friendRequest.from);
        if (!requester) {
          socket.emit("error", {
            message: "The user who sent this request no longer exists",
          });
          return;
        }

        if (action === "accept") {
          // Accept friend request
          friendRequest.status = "accepted";
          user.friends.push(requester._id);
          requester.friends.push(user._id);

          // Update requester's sent request
          const sentRequest = requester.sentFriendRequests.find(
            (req) => req.to.toString() === user._id.toString()
          );
          if (sentRequest) {
            sentRequest.status = "accepted";
          }

          await Promise.all([user.save(), requester.save()]);

          // Notify requester
          const requesterSocket = connectedUsers.get(requester._id.toString());
          if (requesterSocket) {
            io.to(requesterSocket.socketId).emit("friend_request_accepted", {
              by: user.getPublicProfile(),
            });
          }

          socket.emit("friend_request_processed", {
            action: "accepted",
            newFriend: requester.getPublicProfile(),
          });
        } else if (action === "reject") {
          // Reject friend request
          friendRequest.status = "rejected";

          // Update requester's sent request
          const sentRequest = requester.sentFriendRequests.find(
            (req) => req.to.toString() === user._id.toString()
          );
          if (sentRequest) {
            sentRequest.status = "rejected";
          }

          await Promise.all([user.save(), requester.save()]);

          // Notify requester
          const requesterSocket = connectedUsers.get(requester._id.toString());
          if (requesterSocket) {
            io.to(requesterSocket.socketId).emit("friend_request_rejected", {
              by: user.getPublicProfile(),
            });
          }

          socket.emit("friend_request_processed", {
            action: "rejected",
            requester: requester.getPublicProfile(),
          });
        }
      } catch (error) {
        console.error("Friend request response error:", error);
        socket.emit("error", { message: "Failed to process friend request" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${user.username} (${user._id})`);

      // Remove from connected users
      connectedUsers.delete(user._id.toString());

      // Update user offline status
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Notify friends that user is offline
      const userWithFriends = await User.findById(user._id).populate("friends");
      userWithFriends.friends.forEach((friend) => {
        const friendSocket = connectedUsers.get(friend._id.toString());
        if (friendSocket) {
          io.to(friendSocket.socketId).emit("friend_offline", {
            userId: user._id,
            username: user.username,
            lastSeen: new Date(),
          });
        }
      });
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  // Return connected users map for external access
  return {
    getConnectedUsers: () => connectedUsers,
    getUserSocket: (userId) => connectedUsers.get(userId.toString()),
    isUserOnline: (userId) => connectedUsers.has(userId.toString()),
  };
};

module.exports = { setupSocketHandlers };
