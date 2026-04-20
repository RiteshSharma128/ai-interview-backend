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
  const url = `${process.env.GATEWAY_URL}/api/auth/verify-email/${token}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify your AI Interview Platform account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Welcome to AI Interview Platform, ${name}! 🚀</h2>
          <p>Please verify your email to get started:</p>
          <a href="${url}" style="display: inline-block; background: #6366f1; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
            Verify Email
          </a>
          <p style="color: #666;">This link expires in 24 hours.</p>
          <p style="color: #999; font-size: 12px;">If you didn't create an account, ignore this email.</p>
        </div>
      `,
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send verification email: ${err.message}`);
  }
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your AI Interview Platform password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Password Reset Request</h2>
          <p>Hi ${name}, click below to reset your password:</p>
          <a href="${url}" style="display: inline-block; background: #ef4444; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #666;">This link expires in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore and your password will remain unchanged.</p>
        </div>
      `,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send password reset email: ${err.message}`);
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
