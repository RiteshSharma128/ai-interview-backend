const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify your AI Interview Platform account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#6366f1;">Welcome to AI Interview Platform, ${name}!</h2>
          <p>Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you did not create this account, ignore this email.</p>
        </div>
      `,
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send verification email: ${err.message}`);
  }
};

const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your AI Interview Platform password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#6366f1;">Password Reset Request</h2>
          <p>Hello ${name}, we received a request to reset your password.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
        </div>
      `,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send reset email: ${err.message}`);
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
