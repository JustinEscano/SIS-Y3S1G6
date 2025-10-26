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
  removeStudentFromSubject,
  getTeacherArchivedSubjects,
  getStudentArchivedSubjects
} = require('../controllers/subjectController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
// NEW: Import the Joi validation helper and the specific schema
const { validateRequest, updateSubjectSchema, createSubjectSchema } = require('../middleware/validate');

// GET /api/subjects (teacher)
router.get('/', verifyToken, requireRole('teacher'), getTeacherSubjects);

// GET /api/subjects/student (student's subjects) — MOVED UP: Before /:id
router.get('/student', verifyToken, requireRole('student'), getStudentSubjects);

// GET /api/subjects/archived/teacher (teacher's archived subjects)
router.get('/archived/teacher', verifyToken, requireRole('teacher'), getTeacherArchivedSubjects);

// GET /api/subjects/archived/student (student's archived subjects)
router.get('/archived/student', verifyToken, requireRole('student'), getStudentArchivedSubjects);

// GET /api/subjects/:id (single subject) — Now after specific routes
router.get('/:id', verifyToken, requireRole(['teacher', 'student']), getSubjectById);

// POST /api/subjects (create) - Optional: Add create validation too
router.post('/', verifyToken, requireRole('teacher'), validateRequest(createSubjectSchema), createSubject); // Added create validation

// PUT /api/subjects/:id (update) - *** APPLY VALIDATION MIDDLEWARE HERE ***
router.put(
    '/:id',
    verifyToken,
    requireRole('teacher'),
    validateRequest(updateSubjectSchema), // <-- Use the middleware with the update schema
    updateSubject
);

// POST /api/subjects/:id/students (add single student)
router.post('/:id/students', verifyToken, requireRole('teacher'), addStudentToSubject);

// DELETE /api/subjects/:id/students/:studentId (remove single student)
router.delete('/:id/students/:studentId', verifyToken, requireRole('teacher'), removeStudentFromSubject);

// GET /api/subjects/:id/students (shared)
router.get('/:id/students', verifyToken, getSubjectStudents); // Keep getSubjectStudents here if it just fetches

module.exports = router;