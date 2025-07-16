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
