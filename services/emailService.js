const sgMail = require("@sendgrid/mail");

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL;
    this.baseUrl = process.env.BASE_URL || "http://localhost:5000";
  }

  // Send email verification
  async sendVerificationEmail(email, username, token) {
    const verificationUrl = `${this.baseUrl}/api/auth/verify-email?token=${token}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ChatApp!</h2>
          <p>Hi ${username},</p>
          <p>Thank you for registering with ChatApp. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from ChatApp. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return { success: true, message: "Verification email sent successfully" };
    } catch (error) {
      console.error("SendGrid error:", error);
      if (error.response) {
        console.error("SendGrid response body:", error.response.body);
      }
      throw new Error("Failed to send verification email");
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, username, token) {
    const resetUrl = `${this.baseUrl}/api/auth/reset-password?token=${token}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${username},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from ChatApp. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("SendGrid error:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  // Send friend request notification
  async sendFriendRequestEmail(email, username, requesterName) {
    const msg = {
      to: email,
      from: this.fromEmail,
      subject: "New Friend Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Friend Request</h2>
          <p>Hi ${username},</p>
          <p><strong>${requesterName}</strong> has sent you a friend request on ChatApp.</p>
          <p>Log in to your account to accept or reject the request.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from ChatApp. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return {
        success: true,
        message: "Friend request notification sent successfully",
      };
    } catch (error) {
      console.error("SendGrid error:", error);
      throw new Error("Failed to send friend request notification");
    }
  }

  // Send welcome email after verification
  async sendWelcomeEmail(email, username) {
    const msg = {
      to: email,
      from: this.fromEmail,
      subject: "Welcome to ChatApp!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ChatApp!</h2>
          <p>Hi ${username},</p>
          <p>Your email has been successfully verified! You can now enjoy all the features of ChatApp:</p>
          <ul>
            <li>Connect with friends</li>
            <li>Send real-time messages</li>
            <li>Share files and images</li>
            <li>Update your profile</li>
          </ul>
          <p>Start by adding some friends and begin chatting!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from ChatApp. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return { success: true, message: "Welcome email sent successfully" };
    } catch (error) {
      console.error("SendGrid error:", error);
      throw new Error("Failed to send welcome email");
    }
  }
}

module.exports = new EmailService();
