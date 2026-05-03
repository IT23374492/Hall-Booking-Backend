const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node testResetWithEthereal.js <email>');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error('User not found');
      process.exit(2);
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // create ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const info = await transporter.sendMail({
      from: `Test <${testAccount.user}>`,
      to: user.email,
      subject: 'Password reset (test)',
      text: `Use this link to reset:\n\n${resetUrl}`,
    });

    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(3);
  }
})();
