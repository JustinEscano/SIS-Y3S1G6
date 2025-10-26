// routes/attendanceRoutes.js (New: Routes for Attendance CRUD, integrated with auth)
const express = require('express');
const router = express.Router();
const {
  getSubjectAttendance,
  getStudentSubjectAttendance,
  markAttendance,
  deleteAttendance
} = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /api/attendance/subjects/:subjectId (teacher's subject attendance, ?dateFrom=&dateTo=)
router.get('/subjects/:subjectId', verifyToken, requireRole('teacher'), getSubjectAttendance);

// GET /api/attendance/subjects/:subjectId/students/:studentId (specific student, teacher/student, ?dateFrom=&dateTo=)
router.get('/subjects/:subjectId/students/:studentId', verifyToken, getStudentSubjectAttendance);

// POST /api/attendance/subjects/:subjectId (bulk mark attendance for date)
router.post('/subjects/:subjectId', verifyToken, requireRole('teacher'), markAttendance);

// DELETE /api/attendance/subjects/:subjectId/:date (delete for specific date, YYYY-MM-DD)
router.delete('/subjects/:subjectId/:date', verifyToken, requireRole('teacher'), deleteAttendance);

module.exports = router;