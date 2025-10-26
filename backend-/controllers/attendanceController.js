// controllers/attendanceController.js (New: Handles CRUD for Attendance, integrated with Subject/Student)
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');

// @desc    Get attendance for a specific subject (teacher only)
// @route   GET /attendance/subjects/:subjectId
// @access  Private (Teacher only)
const getSubjectAttendance = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { dateFrom, dateTo } = req.query; // Optional date range

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const subjectTeacherId = subject.teacher ? subject.teacher.toString() : null;
  if (req.role === 'teacher' && subjectTeacherId && subjectTeacherId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const match = { subject: subjectId };
  if (dateFrom && dateTo) {
    match.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
  }

  const attendances = await Attendance.find(match)
    .populate('student', 'name email lrn')
    .sort({ date: -1, 'student.name': 1 });

  // Compute rates per student
  const studentRates = {};
  for (const att of attendances) {
    const sid = att.student._id.toString();
    if (!studentRates[sid]) {
      studentRates[sid] = { total: 0, present: 0, student: att.student };
    }
    studentRates[sid].total++;
    if (att.status === 'Present') studentRates[sid].present++;
  }
  const rates = Object.values(studentRates).map(s => ({
    ...s,
    rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
  }));

  res.status(200).json({
    success: true,
    count: attendances.length,
    rates: { count: rates.length, data: rates },
    data: attendances
  });
});

// @desc    Get attendance for a specific student in a subject (teacher/student only)
// @route   GET /attendance/subjects/:subjectId/students/:studentId
// @access  Private
const getStudentSubjectAttendance = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;
  const { dateFrom, dateTo } = req.query;

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  // Access: Teacher or enrolled student
  const subjectTeacherId = subject.teacher ? subject.teacher.toString() : null;

  if (
    req.role === 'teacher' &&
    subjectTeacherId &&
    subjectTeacherId !== req.user.id &&
    !subject.students.some((s) => s.toString() === req.user.id)
  ) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  if (
    req.role !== 'superadmin' &&
    subjectTeacherId &&
    subjectTeacherId !== req.user.id &&
    req.user.id !== studentId
  ) {
    return res.status(403).json({ success: false, error: 'Can only view own attendance' });
  }

  const match = { subject: subjectId, student: studentId };
  if (dateFrom && dateTo) {
    match.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
  }

  const attendances = await Attendance.find(match).sort({ date: 1 });

  // Compute rate
  const rate = await Attendance.calculateAttendanceRate(studentId, subjectId, dateFrom ? new Date(dateFrom) : new Date(1900), dateTo ? new Date(dateTo) : new Date());

  res.status(200).json({
    success: true,
    count: attendances.length,
    rate,
    data: attendances
  });
});

// @desc    Mark attendance for students in a subject (bulk, teacher only)
// @route   POST /attendance/subjects/:subjectId
// @access  Private (Teacher only)
const markAttendance = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { date, attendances: bulkData } = req.body; // e.g., [{ studentId, status, notes }]

  if (!date || !bulkData || !Array.isArray(bulkData)) {
    return res.status(400).json({ success: false, error: 'Date and array of attendances required' });
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const subjectTeacherId = subject.teacher ? subject.teacher.toString() : null;
  if (req.role === 'teacher' && subjectTeacherId && subjectTeacherId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  if (subject.archived) {
    return res.status(400).json({ success: false, error: 'Cannot mark attendance for archived subject' });
  }

  const results = { created: 0, updated: 0, errors: [] };
  for (const data of bulkData) {
    const { studentId, status, notes } = data;
    if (!studentId || !['Present', 'Absent', 'Tardy'].includes(status)) {
      results.errors.push({ studentId, error: 'Invalid studentId or status' });
      continue;
    }

    // Verify student enrolled
    if (!subject.students.some(s => (s?._id || s)?.toString() === studentId)) {
      results.errors.push({ studentId, error: 'Student not enrolled' });
      continue;
    }

    const existing = await Attendance.findOneAndUpdate(
      { subject: subjectId, student: studentId, date: new Date(date) },
      { status, notes },
      { upsert: true, new: true }
    );

    if (existing.wasNewDocument) {
      results.created++;
    } else {
      results.updated++;
    }
  }

  res.status(200).json({
    success: true,
    ...results,
    message: `Marked attendance for ${results.created + results.updated} students`
  });
});

// @desc    Delete attendance for a specific date in a subject (teacher only)
// @route   DELETE /attendance/subjects/:subjectId/:date
// @access  Private (Teacher only)
const deleteAttendance = asyncHandler(async (req, res) => {
  const { subjectId, date } = req.params; // date as YYYY-MM-DD

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const subjectTeacherId = subject.teacher ? subject.teacher.toString() : null;
  if (req.role === 'teacher' && subjectTeacherId && subjectTeacherId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const deleted = await Attendance.deleteMany({
    subject: subjectId,
    date: { $eq: new Date(date) }
  });

  res.status(200).json({
    success: true,
    deleted: deleted.deletedCount,
    message: `Deleted ${deleted.deletedCount} attendance records`
  });
});

module.exports = {
  getSubjectAttendance,
  getStudentSubjectAttendance,
  markAttendance,
  deleteAttendance
};