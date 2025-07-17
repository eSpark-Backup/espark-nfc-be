import nodemailer from 'nodemailer';
import { envConfig } from '../config/envConfig.js';

const transporter = nodemailer.createTransport({
  host: envConfig.smtp.host,
  port: envConfig.smtp.port,
  secure: envConfig.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: envConfig.smtp.user,
    pass: envConfig.smtp.pass,
  },
});

// Verification email for new admins
export const sendVerificationEmail = async ({ to, name, code }) => {
  const mailOptions = {
    from: `"${envConfig.smtp.fromName}" <${envConfig.smtp.from}>`,
    to,
    subject: 'Verify Your Email Address',
    html: `
      <p>Hello ${name},</p>
      <p>Your email verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Admin restoration notification email
export const sendAdminRestorationEmail = async ({ to, name }) => {
  const mailOptions = {
    from: `"${envConfig.smtp.fromName}" <${envConfig.smtp.from}>`,
    to,
    subject: 'Your Admin Account Has Been Restored',
    html: `
      <p>Hello ${name},</p>
      <p>Your admin account has been <strong>restored</strong> by the system administrator.</p>
      <p>You can now log in again and continue using the system as before.</p>
      <p>If you believe this was a mistake or have questions, please contact support.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendAdminDeletionEmail = async ({ to, name }) => {
  const mailOptions = {
    from: `"${envConfig.smtp.fromName}" <${envConfig.smtp.from}>`,
    to,
    subject: 'Your Admin Account Has Been Deactivated',
    html: `
      <p>Hello ${name},</p>
      <p>Your admin account has been <strong>deactivated</strong> by the system administrator.</p>
      <p>If you believe this was done in error, please contact support.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

