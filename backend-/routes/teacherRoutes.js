const express = require('express');
const router = express.Router();
const {
  getTeacherProfile,
  updateTeacherProfile,
  changeTeacherPassword,
  getTeacherDashboard,
  getTeacherAnalytics,
} = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['teacher', 'superadmin']));

router.get('/profile', getTeacherProfile);
router.put('/profile', updateTeacherProfile);
router.put('/profile/password', changeTeacherPassword);
router.get('/dashboard', getTeacherDashboard);
router.get('/analytics', getTeacherAnalytics);

module.exports = router;
