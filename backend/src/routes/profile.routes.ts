// src/routes/profile.routes.ts

import express, { Request } from "express";
import User from "../models/user.model.js";
import { logger } from "../services/logger.service.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { generateAvatarUrl } from "../utils/helper.js";

const router = express.Router();

interface ProfileRequest extends Request {
  user: {
    userId: number;
    walletAddress: string;
  };
}

// Get current user profile
router.get("/", authenticateJWT, async (req, res) => {
  const profileReq = req as ProfileRequest;
  try {
    const user = await User.findByPk(profileReq.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      profile: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      `Error fetching profile: ${(error as Error).message}`,
      undefined,
      "system"
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
});
// Update user profile
router.put("/", authenticateJWT, async (req, res) => {
  const profileReq = req as ProfileRequest;
  try {
    const { displayName, email, bio } = req.body;

    // Validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    if (displayName && displayName.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Display name must be less than 100 characters",
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Bio must be less than 500 characters",
      });
    }

    const user = await User.findByPk(profileReq.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const avatarUrl = generateAvatarUrl(displayName);

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({
          success: false,
          error: "Email is already in use",
        });
      }
    }

    // Update user profile (walletAddress is NOT included)
    await user.update({
      displayName: displayName !== undefined ? displayName : user.displayName,
      email: email !== undefined ? email : user.email,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
      bio: bio !== undefined ? bio : user.bio,
    });

    logger.success(
      `Profile updated for user ${user.walletAddress.substring(0, 10)}...`,
      undefined,
      "system"
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      `Error updating profile: ${(error as Error).message}`,
      undefined,
      "system"
    );
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
});
// Delete account
router.delete("/", authenticateJWT, async (req, res) => {
  const profileReq = req as ProfileRequest;
  try {
    const user = await User.findByPk(profileReq.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await user.destroy();

    logger.warning(
      `Account deleted for user ${user.walletAddress.substring(0, 10)}...`,
      undefined,
      "system"
    );

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    logger.error(
      `Error deleting account: ${(error as Error).message}`,
      undefined,
      "system"
    );
    res.status(500).json({
      success: false,
      error: "Failed to delete account",
    });
  }
});

export default router;
