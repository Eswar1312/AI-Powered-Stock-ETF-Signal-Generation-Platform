const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const router = express.Router();
const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const { signToken, protect } = require("../middleware/auth");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";
const MAIL_FROM = process.env.SMTP_USER || process.env.ALERT_FROM;

function generateSixDigitOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

async function sendSignupOtpEmail(to, otp) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }
  if (!MAIL_FROM) {
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background: #0b1220; color: #e2e8f0; padding: 24px; border-radius: 8px;">
      <h2 style="margin: 0 0 12px; color: #22c55e;">YourStock AI Email Verification</h2>
      <p style="margin: 0 0 10px;">Use this OTP to verify your signup:</p>
      <div style="font-size: 30px; letter-spacing: 8px; font-weight: 700; margin: 8px 0 16px; color: #22c55e;">${otp}</div>
      <p style="margin: 0 0 8px;">This OTP expires in 10 minutes.</p>
      <p style="margin-top: 14px; font-size: 12px; color: #94a3b8;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"YourStock AI" <${MAIL_FROM}>`,
    to,
    subject: "Your YourStock AI signup OTP",
    html,
  });

  return true;
}

async function sendPasswordResetEmail(to, resetUrl) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }
  if (!MAIL_FROM) {
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background: #0b1220; color: #e2e8f0; padding: 24px; border-radius: 8px;">
      <h2 style="margin: 0 0 12px; color: #22c55e;">YourStock AI Password Reset</h2>
      <p style="margin: 0 0 12px;">A password reset was requested for your account.</p>
      <p style="margin: 0 0 18px;">This link is valid for 15 minutes.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #22c55e; color: #0b1220; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 700;">Reset Password</a>
      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"YourStock AI" <${MAIL_FROM}>`,
    to,
    subject: "Reset your YourStock AI password",
    html,
  });

  return true;
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const normalizedEmail = email.toLowerCase().trim();
  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.isEmailVerified) {
      return res.status(409).json({ error: "Email already registered" });
    }

    if (existing && !existing.isEmailVerified) {
      await existing.deleteOne();
    }

    const otp = generateSixDigitOtp();
    const passwordHash = await bcrypt.hash(password, 12);
    const response = {
      message: "OTP sent to your email. Please verify to complete signup",
      email: normalizedEmail,
    };

    await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name,
        email: normalizedEmail,
        passwordHash,
        otpHash: hashOtp(otp),
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      const sent = await sendSignupOtpEmail(normalizedEmail, otp);
      if (!sent) {
        await PendingSignup.deleteOne({ email: normalizedEmail });
        return res.status(500).json({ error: "OTP could not be sent. Please check mail configuration" });
      }
    } catch (err) {
      await PendingSignup.deleteOne({ email: normalizedEmail });
      return res.status(500).json({ error: `OTP send failed: ${err.message}` });
    }

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-signup-otp
router.post("/verify-signup-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const pending = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pending) {
      return res.status(400).json({ error: "No pending signup. Please sign up again" });
    }
    if (pending.otpExpires < new Date()) {
      return res.status(400).json({ error: "OTP expired. Please request a new one" });
    }

    const match = pending.otpHash === hashOtp(String(otp).trim());
    if (!match) return res.status(400).json({ error: "Invalid OTP" });

    const alreadyRegistered = await User.findOne({ email: normalizedEmail });
    if (alreadyRegistered && alreadyRegistered.isEmailVerified) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(409).json({ error: "Email already registered" });
    }

    if (alreadyRegistered && !alreadyRegistered.isEmailVerified) {
      await alreadyRegistered.deleteOne();
    }

    const now = new Date();
    const inserted = await User.collection.insertOne({
      name: pending.name,
      email: normalizedEmail,
      password: pending.passwordHash,
      role: "user",
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      lastLogin: now,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    const user = await User.findById(inserted.insertedId);

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-signup-otp
router.post("/resend-signup-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const pending = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pending) {
      return res.status(404).json({ error: "No pending signup found for this email" });
    }

    const otp = generateSixDigitOtp();
    pending.otpHash = hashOtp(otp);
    pending.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    pending.updatedAt = new Date();
    await pending.save();

    const response = { message: "OTP resent successfully" };
    try {
      const sent = await sendSignupOtpEmail(normalizedEmail, otp);
      if (!sent) {
        return res.status(500).json({ error: "OTP could not be sent. Please check mail configuration" });
      }
    } catch (err) {
      return res.status(500).json({ error: `OTP resend failed: ${err.message}` });
    }

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signin
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isActive) return res.status(403).json({ error: "Account has been disabled" });
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: "Please verify your email using OTP before signing in" });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const response = {
    message: "If that email is registered, a reset link has been sent",
  };

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json(response);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      const sent = await sendPasswordResetEmail(user.email, resetUrl);
      if (!sent) {
        // Provide a local preview URL when SMTP is not configured.
        response.previewResetLink = resetUrl;
      }
    } catch {
      response.previewResetLink = resetUrl;
    }

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post("/change-password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

module.exports = router;
