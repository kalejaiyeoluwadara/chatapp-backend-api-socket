const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectDB, createIndexes } = require("./config/database");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const friendRoutes = require("./routes/friend");
const chatRoutes = require("./routes/chat");
const { authenticateToken } = require("./middleware/auth");
const { setupSocketHandlers } = require("./socket/socketHandlers");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", authenticateToken, userRoutes);
app.use("/api/friend", authenticateToken, friendRoutes);
app.use("/api/chat", authenticateToken, chatRoutes);

// Health check endpoint
app.get("/health", async (req, res) => {
  const { checkDatabaseHealth } = require("./config/database");
  const dbHealth = await checkDatabaseHealth();

  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    database: dbHealth,
    environment: process.env.NODE_ENV || "development",
  });
});

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "ChatApp API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/register": "Register new user",
        "POST /api/auth/login": "Login user",
        "GET /api/auth/verify-email": "Verify email address",
        "POST /api/auth/resend-verification": "Resend verification email",
        "POST /api/auth/forgot-password": "Request password reset",
        "POST /api/auth/reset-password": "Reset password",
      },
      user: {
        "GET /api/user/profile": "Get current user profile",
        "GET /api/user/profile/:userId": "Get friend profile",
        "PATCH /api/user/profile": "Update user profile",
        "POST /api/user/profile/picture": "Upload profile picture",
        "DELETE /api/user/profile/picture": "Delete profile picture",
        "GET /api/user/search": "Search users",
        "GET /api/user/friends/online": "Get online friends",
        "DELETE /api/user/account": "Delete user account",
      },
      friend: {
        "POST /api/friend/request": "Send friend request",
        "POST /api/friend/accept/:requestId": "Accept friend request",
        "POST /api/friend/reject/:requestId": "Reject friend request",
        "GET /api/friend/requests": "Get friend requests",
        "GET /api/friend/list": "Get friends list",
        "DELETE /api/friend/remove/:friendId": "Remove friend",
        "DELETE /api/friend/cancel/:requestId": "Cancel sent request",
      },
      chat: {
        "GET /api/chat/conversation/:friendId": "Get conversation with friend",
        "GET /api/chat/conversations": "Get all conversations",
        "POST /api/chat/message": "Send text message",
        "POST /api/chat/image/:receiverId": "Send image message",
        "POST /api/chat/file/:receiverId": "Send file message",
        "PATCH /api/chat/read/:friendId": "Mark messages as read",
        "DELETE /api/chat/message/:messageId": "Delete message",
        "GET /api/chat/unread-count": "Get unread message count",
      },
    },
    socket: {
      send_message: "Send real-time message",
      typing_start: "Start typing indicator",
      typing_stop: "Stop typing indicator",
      mark_read: "Mark message as read",
      friend_request: "Send friend request",
      friend_request_response: "Respond to friend request",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

// Initialize server
const initializeServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Create indexes
    await createIndexes();


    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO ready for real-time connections`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
};

// Start the server
initializeServer();

module.exports = { app, server, io };
