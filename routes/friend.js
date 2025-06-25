const express = require("express");
const FriendController = require("../controllers/friendController");
const { validateFriendRequest } = require("../utils/validation");
const { handleValidationErrors } = require("../utils/errorHandler");

const router = express.Router();

// Send friend request
router.post(
  "/request",
  validateFriendRequest,
  handleValidationErrors,
  FriendController.sendFriendRequest
);

// Accept friend request
router.post("/accept/:requestId", FriendController.acceptFriendRequest);

// Reject friend request
router.post("/reject/:requestId", FriendController.rejectFriendRequest);

// Get friend requests
router.get("/requests", FriendController.getFriendRequests);

// Get friends list
router.get("/list", FriendController.getFriendsList);

// Remove friend
router.delete("/remove/:friendId", FriendController.removeFriend);

// Cancel sent friend request
router.delete("/cancel/:requestId", FriendController.cancelFriendRequest);

module.exports = router;
