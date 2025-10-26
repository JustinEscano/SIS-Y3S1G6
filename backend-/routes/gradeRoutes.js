const express = require('express');
const router = express.Router();
const {
  getSubjectGrades,
  updateGrade,
  exportGrades,
  importGrades,
  getStudentSubjectGrades,
  updateStudentGrade,
  updateStudentComments,
  getStudentGradeProgress
} = require('../controllers/gradeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/grades/subjects/:subjectId (teacher's subject grades)
router.get('/subjects/:subjectId', verifyToken, requireRole('teacher'), getSubjectGrades);

// GET /api/grades/subjects/:subjectId/students/:studentId (specific student in subject) — ✅ Allow students
router.get('/subjects/:subjectId/students/:studentId', verifyToken, requireRole(['teacher', 'student']), getStudentSubjectGrades);

// PUT /api/grades/:gradeId (update grade)
router.put('/:gradeId', verifyToken, requireRole('teacher'), updateGrade);

// PUT /api/grades/subjects/:subjectId/students/:studentId (update quarter grades/comments)
router.put('/subjects/:subjectId/students/:studentId', verifyToken, requireRole('teacher'), updateStudentGrade);

// POST /api/grades/subjects/:subjectId/import (import XLSX)
router.post('/subjects/:subjectId/import', verifyToken, requireRole('teacher'), upload.single('file'), importGrades);

// GET /api/grades/subjects/:subjectId/export?studentId=xxx (export XLSX, studentId optional via query)
router.get('/subjects/:subjectId/export', verifyToken, requireRole('teacher'), exportGrades);

router.get('/student/:studentId/progress', verifyToken, requireRole(['student', 'teacher']), getStudentGradeProgress);

module.exports = router;