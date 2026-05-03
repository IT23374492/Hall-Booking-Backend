const nodemailer = require('nodemailer');

let cachedTransporter = null;

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter || !to) return false;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });

  return true;
};

const sendEmailSafely = async (payload) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.error('Email send failed:', error.message || error);
  }
};

module.exports = {
  isEmailConfigured,
  sendEmail,
  sendEmailSafely,
};
