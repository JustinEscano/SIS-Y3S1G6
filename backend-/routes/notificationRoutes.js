// routes/notificationRoutes.js (Updated: Added mark-unread route)
const express = require('express');
const router = express.Router();
const { getUserNotifications, markAsRead, markAsUnread, getUnreadCount, createTestNotification } = require('../controllers/notificationController'); // Added markAsUnread

// GET /api/notifications/:userId - Fetch user's notifications
router.get('/:userId', getUserNotifications);

// PATCH /api/notifications/:userId/mark-read - Mark as read
router.patch('/:userId/mark-read', markAsRead);

// NEW: PATCH /api/notifications/:userId/mark-unread - Mark as unread
router.patch('/:userId/mark-unread', markAsUnread);

// GET /api/notifications/:userId/unread-count - Get unread count
router.get('/:userId/unread-count', getUnreadCount);

// NEW: POST /api/notifications/:userId/test - Create a test notification (for debugging)
router.post('/:userId/test', createTestNotification);

module.exports = router;