const User = require("../models/User");
const emailService = require("../services/emailService");

class FriendController {
  //#region Send friend request
  static async sendFriendRequest(req, res) {
    try {
      const { username } = req.body;
      const currentUser = req.user;

      // Check if user is trying to add themselves
      if (currentUser.username === username) {
        return res.status(400).json({
          error: "Invalid request",
          message: "You cannot send a friend request to yourself",
        });
      }

      // Find the user to send request to
      const targetUser = await User.findOne({ username });
      if (!targetUser) {
        return res.status(404).json({
          error: "User not found",
          message: "No user found with this username",
        });
      }

      // Check if already friends
      if (currentUser.isFriendsWith(targetUser._id)) {
        return res.status(400).json({
          error: "Already friends",
          message: "You are already friends with this user",
        });
      }

      // Check if request already sent
      if (currentUser.hasSentRequestTo(targetUser._id)) {
        return res.status(400).json({
          error: "Request already sent",
          message: "You have already sent a friend request to this user",
        });
      }

      // Check if request already received
      if (currentUser.hasPendingRequestFrom(targetUser._id)) {
        return res.status(400).json({
          error: "Request already received",
          message: "This user has already sent you a friend request",
        });
      }

      // Add friend request to both users
      currentUser.sentFriendRequests.push({
        to: targetUser._id,
        status: "pending",
        createdAt: new Date(),
      });

      targetUser.friendRequests.push({
        from: currentUser._id,
        status: "pending",
        createdAt: new Date(),
      });

      await Promise.all([currentUser.save(), targetUser.save()]);

      // Send email notification
      try {
        await emailService.sendFriendRequestEmail(
          targetUser.email,
          targetUser.username,
          `${currentUser.firstName} ${currentUser.lastName}`
        );
      } catch (emailError) {
        console.error("Failed to send friend request email:", emailError);
        // Don't fail the request, just log the error
      }

      res.json({
        message: "Friend request sent successfully",
        targetUser: targetUser.getPublicProfile(),
      });
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({
        error: "Failed to send friend request",
        message: "An error occurred while sending friend request",
      });
    }
  }
  //#End region: Send friend request

  //#region Accept friend request
  static async acceptFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const currentUser = req.user;

      // Find the friend request
      const friendRequest = currentUser.friendRequests.id(requestId);
      if (!friendRequest) {
        return res.status(404).json({
          error: "Request not found",
          message: "Friend request not found",
        });
      }

      if (friendRequest.status !== "pending") {
        return res.status(400).json({
          error: "Invalid request",
          message: "This friend request has already been processed",
        });
      }

      // Get the user who sent the request
      const requester = await User.findById(friendRequest.from);
      if (!requester) {
        return res.status(404).json({
          error: "User not found",
          message: "The user who sent this request no longer exists",
        });
      }

      // Update request status to accepted
      friendRequest.status = "accepted";

      // Add each user to the other's friends list
      currentUser.friends.push(requester._id);
      requester.friends.push(currentUser._id);

      // Update the sent request status for the requester
      const sentRequest = requester.sentFriendRequests.find(
        (req) => req.to.toString() === currentUser._id.toString()
      );
      if (sentRequest) {
        sentRequest.status = "accepted";
      }

      await Promise.all([currentUser.save(), requester.save()]);

      res.json({
        message: "Friend request accepted successfully",
        newFriend: requester.getPublicProfile(),
      });
    } catch (error) {
      console.error("Accept friend request error:", error);
      res.status(500).json({
        error: "Failed to accept friend request",
        message: "An error occurred while accepting friend request",
      });
    }
  }
  //#End region: Accept friend request

  //#region Reject friend request
  static async rejectFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const currentUser = req.user;

      // Find the friend request
      const friendRequest = currentUser.friendRequests.id(requestId);
      if (!friendRequest) {
        return res.status(404).json({
          error: "Request not found",
          message: "Friend request not found",
        });
      }

      if (friendRequest.status !== "pending") {
        return res.status(400).json({
          error: "Invalid request",
          message: "This friend request has already been processed",
        });
      }

      // Get the user who sent the request
      const requester = await User.findById(friendRequest.from);
      if (requester) {
        // Update the sent request status for the requester
        const sentRequest = requester.sentFriendRequests.find(
          (req) => req.to.toString() === currentUser._id.toString()
        );
        if (sentRequest) {
          sentRequest.status = "rejected";
        }
        await requester.save();
      }

      // Update request status to rejected
      friendRequest.status = "rejected";

      await currentUser.save();

      res.json({
        message: "Friend request rejected successfully",
      });
    } catch (error) {
      console.error("Reject friend request error:", error);
      res.status(500).json({
        error: "Failed to reject friend request",
        message: "An error occurred while rejecting friend request",
      });
    }
  }
  //#End region: Reject friend request

  //#region Get friend requests
  static async getFriendRequests(req, res) {
    try {
      const currentUser = await User.findById(req.user._id)
        .populate(
          "friendRequests.from",
          "username firstName lastName profilePicture"
        )
        .populate(
          "sentFriendRequests.to",
          "username firstName lastName profilePicture"
        );

      const incomingRequests = currentUser.friendRequests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          id: request._id,
          from: request.from.getPublicProfile(),
          status: request.status,
          createdAt: request.createdAt,
        }));

      const sentRequests = currentUser.sentFriendRequests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          id: request._id,
          to: request.to.getPublicProfile(),
          status: request.status,
          createdAt: request.createdAt,
        }));

      res.json({
        incoming: incomingRequests,
        sent: sentRequests,
      });
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({
        error: "Failed to get friend requests",
        message: "An error occurred while fetching friend requests",
      });
    }
  }
  //#End region: Get friend requests

  //#region Get friends list
  static async getFriendsList(req, res) {
    try {
      const currentUser = await User.findById(req.user._id).populate(
        "friends",
        "username firstName lastName profilePicture isOnline lastSeen"
      );

      const friends = currentUser.friends.map((friend) =>
        friend.getPublicProfile()
      );

      res.json({
        friends,
        count: friends.length,
      });
    } catch (error) {
      console.error("Get friends list error:", error);
      res.status(500).json({
        error: "Failed to get friends list",
        message: "An error occurred while fetching friends list",
      });
    }
  }
  //#End region: Get friends list

  //#region Remove friend
  static async removeFriend(req, res) {
    try {
      const { friendId } = req.params;
      const currentUser = req.user;

      // Check if they are actually friends
      if (!currentUser.isFriendsWith(friendId)) {
        return res.status(400).json({
          error: "Not friends",
          message: "You are not friends with this user",
        });
      }

      // Get the friend
      const friend = await User.findById(friendId);
      if (!friend) {
        return res.status(404).json({
          error: "User not found",
          message: "The user you are trying to remove no longer exists",
        });
      }

      // Remove from each other's friends list
      currentUser.friends = currentUser.friends.filter(
        (id) => id.toString() !== friendId
      );
      friend.friends = friend.friends.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );

      await Promise.all([currentUser.save(), friend.save()]);

      res.json({
        message: "Friend removed successfully",
        removedFriend: friend.getPublicProfile(),
      });
    } catch (error) {
      console.error("Remove friend error:", error);
      res.status(500).json({
        error: "Failed to remove friend",
        message: "An error occurred while removing friend",
      });
    }
  }
  //#End region: Remove friend

  //#region Cancel sent friend request
  static async cancelFriendRequest(req, res) {
    try {
      const { requestId } = req.params;
      const currentUser = req.user;

      // Find the sent friend request
      const sentRequest = currentUser.sentFriendRequests.id(requestId);
      if (!sentRequest) {
        return res.status(404).json({
          error: "Request not found",
          message: "Sent friend request not found",
        });
      }

      if (sentRequest.status !== "pending") {
        return res.status(400).json({
          error: "Invalid request",
          message: "This friend request has already been processed",
        });
      }

      // Get the target user
      const targetUser = await User.findById(sentRequest.to);
      if (targetUser) {
        // Remove the incoming request from target user
        targetUser.friendRequests = targetUser.friendRequests.filter(
          (req) => req.from.toString() !== currentUser._id.toString()
        );
        await targetUser.save();
      }

      // Remove the sent request from current user
      currentUser.sentFriendRequests = currentUser.sentFriendRequests.filter(
        (req) => req._id.toString() !== requestId
      );

      await currentUser.save();

      res.json({
        message: "Friend request cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel friend request error:", error);
      res.status(500).json({
        error: "Failed to cancel friend request",
        message: "An error occurred while cancelling friend request",
      });
    }
  }
  //#End region: Cancel sent friend request
}

module.exports = FriendController;
