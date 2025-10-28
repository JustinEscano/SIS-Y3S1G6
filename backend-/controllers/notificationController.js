// controllers/notificationController.js (Updated: Added markAsUnread functionality)
const Notification = require('../models/Notifications'); // Fixed: Changed from 'Notifications' to 'Notification'
const asyncHandler = require('express-async-handler');

// Create a new notification
const createNotification = asyncHandler(async (req, res) => {
  const { recipient, type, title, message, subject } = req.body;
  const notification = new Notification({
    recipient,
    type,
    title,
    message,
    subject
  });
  await notification.save();

  // Populate for response
  await notification.populate('recipient', 'name email');
  if (subject) await notification.populate('subject', 'name');

  res.status(201).json({ success: true, data: notification });
});

// Fetch notifications for a user
const getUserNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, read } = req.query;

  const readBool = read === 'true'; // Convert string query to boolean
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { recipient: userId };
  if (read !== undefined) query.read = readBool; // Only filter if provided

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .populate('recipient', 'name email')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    notifications,
    currentPage: parseInt(page),
    totalPages,
    total
  });
});

// Mark as read (single or bulk)
const markAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { notificationId, notificationIds } = req.body;

  if (notificationIds && Array.isArray(notificationIds)) {
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId, read: false },
      { read: true }
    );
    return res.json({ success: true, updated: result.modifiedCount });
  }

  if (notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId, read: false },
      { read: true },
      { new: true }
    ).populate('subject', 'name');

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found or already read' });
    }

    return res.json({ success: true, data: notification });
  }

  res.status(400).json({ success: false, error: 'Provide notificationId or notificationIds' });
});

// NEW: Mark as unread (single or bulk)
const markAsUnread = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { notificationId, notificationIds } = req.body;

  if (notificationIds && Array.isArray(notificationIds)) {
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId, read: true },
      { read: false }
    );
    return res.json({ success: true, updated: result.modifiedCount });
  }

  if (notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId, read: true },
      { read: false },
      { new: true }
    ).populate('subject', 'name');

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found or already unread' });
    }

    return res.json({ success: true, data: notification });
  }

  res.status(400).json({ success: false, error: 'Provide notificationId or notificationIds' });
});

// Get unread count
const getUnreadCount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const count = await Notification.countDocuments({ recipient: userId, read: false });
  res.json({ success: true, unreadCount: count });
});

// NEW: Test endpoint to create a sample notification (for debugging - remove in prod)
const createTestNotification = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const notification = new Notification({
    recipient: userId,
    type: 'test',
    title: 'Test Notification',
    message: `Sample notification created on ${new Date().toISOString()}.`,
    subject: null
  });
  await notification.save();
  await notification.populate('recipient', 'name email');
  res.status(201).json({ success: true, data: notification });
});

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAsUnread, // NEW
  getUnreadCount,
  createTestNotification // NEW: For testing
};