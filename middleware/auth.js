const jwt = require("jsonwebtoken");
const User = require("../models/User");

//#region Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: "Access token required",
        message: "Please provide a valid authentication token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        error: "Invalid token",
        message: "User no longer exists",
      });
    }

    // Check if user is verified (optional - can be made required)
    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Email not verified",
        message:
          "Please verify your email address before accessing this resource",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "The provided token is invalid",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "The provided token has expired",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred during authentication",
    });
  }
};
//#End region: Middleware to authenticate JWT token

//#region Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Don't fail the request, just continue without user
    next();
  }
};
//#End region: Optional authentication middleware (doesn't fail if no token)

//#region Middleware to check if user is friends with another user
const requireFriendship = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    if (!userId) {
      return res.status(400).json({
        error: "User ID required",
        message: "Please provide a valid user ID",
      });
    }

    // Check if users are friends
    if (!currentUser.isFriendsWith(userId)) {
      return res.status(403).json({
        error: "Friendship required",
        message: "You can only interact with your friends",
      });
    }

    next();
  } catch (error) {
    console.error("Friendship check error:", error);
    res.status(500).json({
      error: "Authorization error",
      message: "An error occurred while checking friendship status",
    });
  }
};
//#End region: Middleware to check if user is friends with another user

//#region Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};
//#End region: Generate JWT token

module.exports = {
  authenticateToken,
  optionalAuth,
  requireFriendship,
  generateToken,
};
