// routes/gradeRoutes.js (New: Added route for subject-specific student grades)
const express = require('express');
const router = express.Router();
const {
  getSubjectGrades,
  updateGrade,
  exportGrades,
  importGrades,
  getStudentSubjectGrades, // New import
  updateStudentGrade, // New for quarter grades
  updateStudentComments // New for comments
} = require('../controllers/gradeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer'); // For file uploads
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/grades/subjects/:subjectId (teacher's subject grades)
router.get('/subjects/:subjectId', verifyToken, requireRole('teacher'), getSubjectGrades);

// GET /api/grades/subjects/:subjectId/students/:studentId (specific student in subject)
router.get('/subjects/:subjectId/students/:studentId', verifyToken, requireRole('teacher'), getStudentSubjectGrades);

// PUT /api/grades/:gradeId (update grade)
router.put('/:gradeId', verifyToken, requireRole('teacher'), updateGrade);

// PUT /api/grades/subjects/:subjectId/students/:studentId (update quarter grades/comments)
router.put('/subjects/:subjectId/students/:studentId', verifyToken, requireRole('teacher'), updateStudentGrade);

// POST /api/grades/subjects/:subjectId/import (import XLSX)
router.post('/subjects/:subjectId/import', verifyToken, requireRole('teacher'), upload.single('file'), importGrades);

// GET /api/grades/subjects/:subjectId/export (export XLSX)
router.get('/subjects/:subjectId/export', verifyToken, requireRole('teacher'), exportGrades);

module.exports = router;