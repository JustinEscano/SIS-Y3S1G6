const asyncHandler = require('express-async-handler');
const InviteCode = require('../models/InviteCode');
const User = require('../models/User');
const transporter = require('../config/email');
const { generateInviteCode, resolveExpiryDate, DEFAULT_EXPIRY_MINUTES } = require('../utils/inviteCode');

const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  superadmin: 'Super Administrator',
};

const sendInviteEmail = async ({ to, code, role, expiresAt }) => {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  const formattedExpiry = expiresAt.toLocaleString('en-US', { hour12: true });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@sis.local',
    to,
    subject: `${ROLE_LABELS[role] || role} Invite Code`,
    text: `Your one-time ${role} invite code is ${code}. It expires on ${formattedExpiry}.`,
    html: `<p>Hello,</p>
<p>Your one-time invite code for <strong>${ROLE_LABELS[role] || role}</strong> access is:</p>
<p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${code}</p>
<p>This code expires on <strong>${formattedExpiry}</strong> and can only be used once.</p>
<p>If you did not request this, please ignore this email.</p>
<p>Best regards,<br/>SIS Team</p>`,
  });

  return info;
};

const createInviteCode = asyncHandler(async (req, res) => {
  const { email, role, createdBy, expiryMinutes } = req.body || {};

  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }

  if (!['student', 'teacher', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  const isEmailConfigured = Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );

  if (!isEmailConfigured) {
    return res.status(500).json({ message: 'Email service not configured. Please contact the system administrator.' });
  }

  // Optional: verify email not already associated with an active user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered. Please ask them to log in.' });
  }

  // Invalidate previous unused codes for same email + role
  await InviteCode.updateMany(
    { email: normalizedEmail, role, usedAt: null },
    { $set: { expiresAt: new Date(), usedAt: new Date() } }
  );

  const safeExpiryMinutes = Number.isFinite(Number(expiryMinutes))
    ? Math.min(Math.max(parseInt(expiryMinutes, 10), 5), 1440)
    : DEFAULT_EXPIRY_MINUTES;

  const code = generateInviteCode();
  const expiresAt = resolveExpiryDate(safeExpiryMinutes);

  const invite = await InviteCode.create({
    code,
    email: normalizedEmail,
    role,
    expiresAt,
    createdBy: createdBy || req.user?._id || null,
  });

  try {
    await sendInviteEmail({ to: normalizedEmail, code, role, expiresAt });
  } catch (err) {
    console.error('Failed to send invite email:', err);
    // Clean up invite if email sending fails
    await InviteCode.deleteOne({ _id: invite._id });
    return res.status(500).json({ message: 'Failed to send invite email' });
  }

  res.status(201).json({
    success: true,
    invite: {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      code: invite.code,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    },
  });
});

const listInviteCodes = asyncHandler(async (req, res) => {
  const {
    limit = 15,
    page = 1,
    role,
    status,
  } = req.query;

  const perPage = Math.max(1, Math.min(parseInt(limit, 10) || 15, 50));
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const skip = (currentPage - 1) * perPage;

  const query = {};

  if (role && ['student', 'teacher', 'superadmin'].includes(role)) {
    query.role = role;
  }

  const now = new Date();
  if (status) {
    if (status === 'used') {
      query.usedAt = { $ne: null };
    } else if (status === 'active') {
      query.usedAt = null;
      query.expiresAt = { $gt: now };
    } else if (status === 'expired') {
      query.usedAt = null;
      query.expiresAt = { $lte: now };
    }
  }

  const [invites, total] = await Promise.all([
    InviteCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    InviteCode.countDocuments(query),
  ]);

  res.json({
    success: true,
    invites: invites.map((invite) => ({
      id: invite._id,
      email: invite.email,
      role: invite.role,
      code: invite.code,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      createdAt: invite.createdAt,
    })),
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
});

module.exports = {
  createInviteCode,
  listInviteCodes,
};
