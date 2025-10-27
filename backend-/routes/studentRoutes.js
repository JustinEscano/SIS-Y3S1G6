// routes/studentRoutes.js (Fixed: Added asyncHandler to controller calls if needed, but routes are fine; no changes)
const express = require('express');
const router = express.Router();
const { 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent,
  getStudentProfile,
  updateStudentProfile
} = require('../controllers/studentController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware'); // Added auth for security

// GET /api/students - Get all students (admin/teacher)
router.get('', verifyToken, requireRole(['teacher', 'superadmin']), getAllStudents);

// NEW: GET /api/students/profile/me - Get current student's profile (student only)
// Must be defined BEFORE /:id
router.get('/profile/me', verifyToken, requireRole('student'), getStudentProfile);

// NEW: PUT /api/students/profile/me - Update current student's profile (student only)
router.put('/profile/me', verifyToken, requireRole('student'), updateStudentProfile);

// GET /api/students/:id
router.get('/:id', verifyToken, requireRole(['teacher', 'superadmin', 'student']), getStudentById);

// PUT /api/students/:id
router.put('/:id', verifyToken, requireRole(['teacher', 'superadmin']), updateStudent);

// DELETE /api/students/:id
router.delete('/:id', verifyToken, requireRole('superadmin'), deleteStudent);

module.exports = router;