// routes/subjectRoutes.js (Updated: Added DELETE route for removeStudentFromSubject)
const express = require('express');
const router = express.Router();
const {
  getTeacherSubjects,
  getStudentSubjects,
  createSubject,
  getSubjectById,
  getSubjectStudents,
  updateSubject,
  addStudentToSubject,
  removeStudentFromSubject // New import
} = require('../controllers/subjectController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Debug: Log when routes are loaded
console.log('📍 Subject routes loaded');

// Test route (temporary - remove after)
router.get('/test', (req, res) => {
  res.json({ message: 'Subjects route mounted!' });
});

// GET /api/subjects (teacher)
router.get('/', verifyToken, requireRole('teacher'), (req, res) => {
  console.log('🎯 GET /subjects hit by user:', req.user.id); // Debug
  getTeacherSubjects(req, res);
});

// GET /api/subjects/:id (single subject - new)
router.get('/:id', verifyToken, requireRole('teacher'), getSubjectById);

// POST /api/subjects (create)
router.post('/', verifyToken, requireRole('teacher'), createSubject);

// PUT /api/subjects/:id (update - general, including bulk add/remove students)
router.put('/:id', verifyToken, requireRole('teacher'), updateSubject);

// POST /api/subjects/:id/students (dedicated add single student)
router.post('/:id/students', verifyToken, requireRole('teacher'), addStudentToSubject);

// DELETE /api/subjects/:id/students/:studentId (dedicated remove single student - new)
router.delete('/:id/students/:studentId', verifyToken, requireRole('teacher'), removeStudentFromSubject);

// GET /api/subjects/student (student)
router.get('/student', verifyToken, requireRole('student'), getStudentSubjects);

// GET /api/subjects/:id/students (shared)
router.get('/:id/students', verifyToken, getSubjectStudents);

module.exports = router;