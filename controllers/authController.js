const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmailSafely } = require('../utils/email');
const {
  normalizePayload,
  validateLoginPayload,
  validateProfilePayload,
  validateRegisterPayload,
  isValidEmail,
} = require('../utils/validation');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});

// @POST /api/auth/register
// Roles: user | hall_owner | admin
const register = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateRegisterPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { name, email, password, phone, address, role } = payload;
    const normalizedEmail = email.toLowerCase();

    const allowedRoles = ['user', 'hall_owner', 'admin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'user';

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists)
      return res.status(400).json({ message: 'Email is already registered.' });

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists)
        return res.status(400).json({ message: 'Phone number is already registered.' });
    }

    const requiresApproval = assignedRole === 'hall_owner';
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone || undefined,
      address,
      role: assignedRole,
      isActive: requiresApproval ? false : true,
    });

    if (requiresApproval) {
      sendEmailSafely({
        to: user.email,
        subject: 'Welcome to Hall Booking Management System',
        text: `Hello ${user.name}, your hall owner account has been created and is waiting for admin approval.`,
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        requiresApproval: true,
        message: 'Hall owner account created. Please wait for admin approval before signing in.',
      });
    }

    sendEmailSafely({
      to: user.email,
      subject: 'Welcome to Hall Booking Management System',
      text: `Hello ${user.name}, your account is ready and you can now sign in.`,
    });

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id)
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      const message = duplicateField === 'email'
        ? 'Email is already registered.'
        : duplicateField === 'phone'
          ? 'Phone number is already registered.'
          : 'Duplicate value error.';
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateLoginPayload(payload);
    if (error) return res.status(400).json({ message: error });
    const { email, password } = payload;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user)
      return res.status(401).json({ message: 'Account not found or inactive' });
    if (!user.isActive) {
      const inactiveMessage = user.role === 'hall_owner'
        ? 'Your hall owner account is waiting for admin approval.'
        : 'Account not found or inactive';
      return res.status(403).json({
        message: inactiveMessage,
        reason: user.role === 'hall_owner' ? 'approval_required' : 'account_inactive',
      });
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id, name: user.name, email: user.email,
        role: user.role, token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/auth/profile
const checkEmail = async (req, res) => {
  try {
    const { email } = normalizePayload(req.query);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    res.json({ available: !user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validateProfilePayload(payload);
    if (error) return res.status(400).json({ message: error });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (Object.prototype.hasOwnProperty.call(payload, 'phone') && payload.phone && payload.phone !== user.phone) {
      const existingPhoneUser = await User.findOne({ phone: payload.phone });
      if (existingPhoneUser && String(existingPhoneUser._id) !== String(user._id)) {
        return res.status(400).json({ message: 'Phone number is already registered.' });
      }
    }

    user.name = Object.prototype.hasOwnProperty.call(payload, 'name') ? payload.name : user.name;
    user.phone = Object.prototype.hasOwnProperty.call(payload, 'phone') ? payload.phone || undefined : user.phone;
    user.address = Object.prototype.hasOwnProperty.call(payload, 'address') ? payload.address : user.address;
    if (payload.password) user.password = payload.password;
    const updated = await user.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @GET /api/auth/users  (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/auth/users/:id/toggle  (Admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const wasInactiveHallOwner = user.role === 'hall_owner' && !user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    if (wasInactiveHallOwner && user.isActive) {
      sendEmailSafely({
        to: user.email,
        subject: 'Your hall owner account has been approved',
        text: `Hello ${user.name}, your hall owner registration has been approved by the admin. You can now sign in to the Hall Booking Management System.`,
      });
    }

    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, checkEmail, getProfile, updateProfile, getAllUsers, toggleUserStatus };

// @POST /api/auth/forgot-password
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = normalizePayload(req.body);
    if (!email || !isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond with the same message to avoid revealing account existence
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Attempt to send email; if email transport isn't configured, helper will log the URL
    await sendEmailSafely({
      to: user.email,
      subject: 'Password reset request',
      text: `You requested a password reset. Use the link below to set a new password:\n\n${resetUrl}\n\nIf you didn't request this, ignore this message.`,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const { token, password } = payload;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required.' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired.' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export new controllers
module.exports.requestPasswordReset = requestPasswordReset;
module.exports.resetPassword = resetPassword;
