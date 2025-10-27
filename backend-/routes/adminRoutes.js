const express = require('express');
const router = express.Router();
const { 
  getStats, 
  getAllUsers, 
  getUserById,
  deleteUser, 
  createUser,
  updateUser,
  changePassword,
  getAnalyticsSummary
} = require('../controllers/adminController');
const { createInviteCode, listInviteCodes } = require('../controllers/inviteCodeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All admin routes require authentication and superadmin role
router.use(verifyToken);
router.use(requireRole(['superadmin']));

// GET /api/admin/stats - Get system statistics
router.get('/stats', getStats);

// GET /api/admin/analytics/summary - Get analytics dashboard data
router.get('/analytics/summary', getAnalyticsSummary);

// GET /api/admin/users - Get all users (teachers and superadmins)
router.get('/users', getAllUsers);

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', getUserById);

// POST /api/admin/users - Create new user
router.post('/users', createUser);

// PUT /api/admin/users/:id - Update user profile
router.put('/users/:id', updateUser);

// PUT /api/admin/users/:id/password - Change user password
router.put('/users/:id/password', changePassword);

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', deleteUser);

// POST /api/admin/invite-codes - Generate and email invite code
router.post('/invite-codes', createInviteCode);

// GET /api/admin/invite-codes - View recent invite codes
router.get('/invite-codes', listInviteCodes);

module.exports = router;
