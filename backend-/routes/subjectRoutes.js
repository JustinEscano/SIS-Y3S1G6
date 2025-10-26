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
  removeStudentFromSubject
} = require('../controllers/subjectController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /api/subjects (teacher)
router.get('/', verifyToken, requireRole('teacher'), getTeacherSubjects);

// GET /api/subjects/student (student's subjects) — MOVED UP: Before /:id
router.get('/student', verifyToken, requireRole('student'), getStudentSubjects);

// GET /api/subjects/:id (single subject) — Now after /student
router.get('/:id', verifyToken, requireRole(['teacher', 'student']), getSubjectById)

// POST /api/subjects (create)
router.post('/', verifyToken, requireRole('teacher'), createSubject);

// PUT /api/subjects/:id (update)
router.put('/:id', verifyToken, requireRole('teacher'), updateSubject);

// POST /api/subjects/:id/students (add single student)
router.post('/:id/students', verifyToken, requireRole('teacher'), addStudentToSubject);

// DELETE /api/subjects/:id/students/:studentId (remove single student)
router.delete('/:id/students/:studentId', verifyToken, requireRole('teacher'), removeStudentFromSubject);

// GET /api/subjects/:id/students (shared)
router.get('/:id/students', verifyToken, getSubjectStudents);

module.exports = router;