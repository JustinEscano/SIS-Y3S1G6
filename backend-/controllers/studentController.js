// controllers/studentController.js (Revamped: Removed grade/promotion references; added populate for allGrades virtual.
// Cascades preserved; fixed missing Subject import. Simplified for class-only enrollment model.)
const Student = require('../models/Student');
const Subject = require('../models/Subject'); // Added: For unenroll cascade
const Grade = require('../models/Grade'); // For cascade
const Attendance = require('../models/Attendance'); // For cascade
const asyncHandler = require('express-async-handler');

// Get all students (admin/teacher only; add auth middleware in production)
const getAllStudents = asyncHandler(async (req, res) => {
  const students = await Student.find().select('-password').populate('enrolledClasses.subject'); // Optional: Populate for class history
  res.status(200).json({ 
    success: true, 
    count: students.length,
    students 
  });
});

// Get student by ID
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .select('-password')
    .populate('enrolledClasses.subject') // Populate class history
    .populate('allGrades'); // Populate historical grades across classes
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.status(200).json({ success: true, student });
});

// NEW: Get the current student's profile (for dashboard)
const getStudentProfile = asyncHandler(async (req, res) => {
  // req.user is the full student document from verifyToken
  const student = req.user; 
  
  // Call the new instance method from Student.js
  const currentGradeLevel = await student.getCurrentGradeLevel();
  
  // Send back a clean profile object
  const userProfile = {
    _id: student._id,
    name: student.name,
    email: student.email,
    lrn: student.lrn,
    section: student.section,
    role: student.role,
    currentGradeLevel: currentGradeLevel // Here is the new, dynamic field
  };
  
  res.status(200).json({
    success: true,
    data: userProfile
  });
});

// Update current student's profile (self-service)
const updateStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user?._id || req.user?.id;
  if (!studentId) {
    return res.status(401).json({ message: 'Unable to verify student identity.' });
  }

  const { name, email } = req.body || {};
  const updates = {};

  if (typeof name === 'string') {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Name cannot be empty.' });
    }
    updates.name = trimmedName;
  }

  if (typeof email === 'string') {
    const trimmedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const existingEmailOwner = await Student.findOne({ email: trimmedEmail, _id: { $ne: studentId } });
    if (existingEmailOwner) {
      return res.status(409).json({ message: 'That email is already in use by another account.' });
    }

    updates.email = trimmedEmail;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updates provided.' });
  }

  const updatedStudent = await Student.findByIdAndUpdate(
    studentId,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedStudent) {
    return res.status(404).json({ message: 'Student not found.' });
  }

  res.status(200).json({
    success: true,
    data: updatedStudent,
  });
});

// Update student
const updateStudent = asyncHandler(async (req, res) => {
  const updates = req.body;
  // Note: Add validation (e.g., Joi) to prevent role changes; no password handling here

  const student = await Student.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  res.status(200).json({ success: true, student });
});

// Delete student (cascade: remove Grades, Attendances, unenroll from Subjects)
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  // Cascade: Delete Grades
  await Grade.deleteMany({ student: req.params.id });
  // Cascade: Delete Attendances
  await Attendance.deleteMany({ student: req.params.id });
  // Cascade: Unenroll from Subjects (remove from students array)
  await Subject.updateMany(
    { students: req.params.id },
    { $pull: { students: req.params.id } }
  );

  await Student.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Student deleted (with cascade)' });
});

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentProfile, // NEW
  updateStudentProfile,
  updateStudent,
  deleteStudent,
};