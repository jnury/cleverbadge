import { Resend } from 'resend';

/**
 * Email Service using Resend
 *
 * Environment modes:
 * - test/testing: Logs to console only (no actual sends)
 * - development/staging: Sends via Resend BUT only to allowed emails, with [ENV] prefix
 * - production: Sends via Resend to anyone, no prefix
 *
 * Required env vars:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Verified sender email (e.g., noreply@yourdomain.com)
 * - FRONTEND_URL: Frontend URL for links in emails
 * - RESEND_ALLOWED_EMAILS: Comma-separated list of allowed recipient emails (for non-production)
 */

const APP_NAME = 'Clever Badge';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Clever Badge <noreply@cleverbadge.com>';

// Lazy-initialize Resend client
let resendClient = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// For testing - allows resetting the client
export function _resetResendClient() {
  resendClient = null;
}

/**
 * Get allowed emails for non-production environments
 * @returns {string[]} Array of allowed email addresses
 */
function getAllowedEmails() {
  const allowedEmailsEnv = process.env.RESEND_ALLOWED_EMAILS || '';
  return allowedEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if email is allowed in current environment
 * @param {string} email - Email to check
 * @returns {boolean}
 */
function isEmailAllowed(email) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // In production, all emails are allowed
  if (nodeEnv === 'production') {
    return true;
  }

  // In non-production, only whitelisted emails are allowed
  const allowedEmails = getAllowedEmails();
  if (allowedEmails.length === 0) {
    return false; // No whitelist = no emails sent
  }

  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Get subject prefix for non-production environments
 * @returns {string} Subject prefix or empty string for production
 */
function getSubjectPrefix() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return '';
  }

  // Capitalize environment name
  const envName = nodeEnv.charAt(0).toUpperCase() + nodeEnv.slice(1);
  return `[${APP_NAME} - ${envName}] `;
}

/**
 * Send an email
 * In test/testing: logs to console only
 * In development/staging: sends via Resend to allowed emails only, with [ENV] prefix
 * In production: sends via Resend to anyone, no prefix
 *
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @returns {Promise<{success: boolean, mode: string, id?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // In test environments, just log to console (no actual sends)
  if (nodeEnv === 'test' || nodeEnv === 'testing') {
    console.log('\n📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 EMAIL (${nodeEnv} mode - not sent)`);
    console.log('📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log('📧 ───────────────────────────────────────────────────────');
    console.log(text);
    console.log('📧 ═══════════════════════════════════════════════════════\n');
    return { success: true, mode: 'console' };
  }

  // Check if email is allowed (for non-production environments)
  if (!isEmailAllowed(to)) {
    console.warn(`📧 Email to ${to} blocked - not in RESEND_ALLOWED_EMAILS whitelist (${nodeEnv} mode)`);
    console.log('\n📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 EMAIL BLOCKED (${nodeEnv} mode - recipient not whitelisted)`);
    console.log('📧 ═══════════════════════════════════════════════════════');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log('📧 ───────────────────────────────────────────────────────');
    console.log(text);
    console.log('📧 ═══════════════════════════════════════════════════════\n');
    return { success: true, mode: 'blocked_not_whitelisted' };
  }

  // Get Resend client
  const client = getResendClient();

  if (!client) {
    console.error('RESEND_API_KEY not configured. Email not sent:', to, subject);
    return { success: false, mode: 'not_configured', error: 'RESEND_API_KEY not configured' };
  }

  // Add environment prefix to subject in non-production
  const finalSubject = getSubjectPrefix() + subject;

  try {
    const { data, error } = await client.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: finalSubject,
      text,
      html
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, mode: 'resend', error: error.message };
    }

    console.log(`📧 Email sent via Resend to ${to} (id: ${data.id}, env: ${nodeEnv})`);
    return { success: true, mode: 'resend', id: data.id };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return { success: false, mode: 'resend', error: error.message };
  }
}

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} token - Verification token
 */
export async function sendVerificationEmail(email, displayName, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;

  return sendEmail({
    to: email,
    subject: `Verify your email`,
    text: `Hi ${displayName},

Welcome to ${APP_NAME}!

Please verify your email by clicking the link below:

${verifyUrl}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.

- The ${APP_NAME} Team`,
    html: `
      <h2>Hi ${displayName},</h2>
      <p>Welcome to <strong>${APP_NAME}</strong>!</p>
      <p>Please verify your email by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4DA6C0; color: white; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p><small>This link expires in 24 hours.</small></p>
      <p>If you didn't create an account, you can ignore this email.</p>
      <p>- The ${APP_NAME} Team</p>
    `
  });
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} token - Reset token
 */
export async function sendPasswordResetEmail(email, displayName, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  return sendEmail({
    to: email,
    subject: `Reset your password`,
    text: `Hi ${displayName},

You requested a password reset for your ${APP_NAME} account.

Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can ignore this email. Your password will remain unchanged.

- The ${APP_NAME} Team`,
    html: `
      <h2>Hi ${displayName},</h2>
      <p>You requested a password reset for your <strong>${APP_NAME}</strong> account.</p>
      <p>Click the button below to set a new password:</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4DA6C0; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p><small>This link expires in 1 hour.</small></p>
      <p>If you didn't request this, you can ignore this email. Your password will remain unchanged.</p>
      <p>- The ${APP_NAME} Team</p>
    `
  });
}
