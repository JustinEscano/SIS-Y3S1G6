// routes/attendanceRoutes.js (New: Routes for Attendance CRUD, integrated with auth)
const express = require('express');
const router = express.Router();
const {
  getSubjectAttendance,
  getStudentSubjectAttendance,
  getStudentAttendanceOverview,
  markAttendance,
  deleteAttendance
} = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /api/attendance/subjects/:subjectId (teacher's subject attendance, ?dateFrom=&dateTo=)
router.get('/subjects/:subjectId', verifyToken, requireRole(['teacher', 'superadmin']), getSubjectAttendance);

// GET /api/attendance/subjects/:subjectId/students/:studentId (specific student, teacher/student, ?dateFrom=&dateTo=)
router.get('/subjects/:subjectId/students/:studentId', verifyToken, getStudentSubjectAttendance);

// GET /api/attendance/student/overview (current student overview)
router.get('/student/overview', verifyToken, requireRole('student'), getStudentAttendanceOverview);

// POST /api/attendance/subjects/:subjectId (bulk mark attendance for date)
router.post('/subjects/:subjectId', verifyToken, requireRole(['teacher', 'superadmin']), markAttendance);

// DELETE /api/attendance/subjects/:subjectId/:date (delete for specific date, YYYY-MM-DD)
router.delete('/subjects/:subjectId/:date', verifyToken, requireRole(['teacher', 'superadmin']), deleteAttendance);

module.exports = router;