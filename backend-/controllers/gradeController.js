const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx'); // npm i xlsx
const { createGradeSchema } = require('../middleware/validate'); // Assume schema exists

// @desc    Get grades for a specific subject (teacher only)
const getSubjectGrades = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const subject = await Subject.findById(subjectId);
  if (!subject || subject.teacher.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const grades = await Grade.find({ subject: subjectId })
    .populate('student', 'name email lrn')
    .sort({ 'student.name': 1 });

  res.status(200).json({
    success: true,
    count: grades.length,
    data: grades
  });
});

// @desc    Get grades for a specific student in a subject (teacher only)
const getStudentSubjectGrades = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;

  // Verify subject ownership
  const subject = await Subject.findById(subjectId);
  if (!subject || subject.teacher.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You do not have permission for this action' });
  }

  // Verify student is enrolled
  if (!subject.students.some(s => s.toString() === studentId)) {
    return res.status(404).json({ success: false, error: 'Student not enrolled in this subject' });
  }

  const grade = await Grade.findOne({ subject: subjectId, student: studentId })
    .populate('student', 'name email lrn')
    .populate('subject', 'name description gradeLevel schoolYear');

  if (!grade) {
    return res.status(404).json({ success: false, error: 'Grade record not found' });
  }

  // Placeholder for history and predictions (implement as needed)
  const gradesHistory = await Grade.find({ student: studentId, subject: { $ne: subjectId } }) // Past subjects
    .select('finalGrade createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  // Simple prediction logic (expand with ML if needed)
  const currentAvg = grade.finalGrade || ((grade.quarterGrades.q1 + grade.quarterGrades.q2 + grade.quarterGrades.q3 + grade.quarterGrades.q4) / 4 || 0);
  const nextYearPrediction = currentAvg + 2; // Example: +2 improvement
  const riskLevel = currentAvg >= 75 ? 'Low' : 'High';

  res.status(200).json({
    success: true,
    data: {
      student: grade.student,
      currentGrades: grade,
      gradesHistory,
      predictions: {
        currentAvg,
        nextYearPrediction,
        riskLevel: riskLevel === 'Low' ? 'Low - Steady or improving' : 'High - Needs intervention'
      },
      comments: grade.comments || []  // Fixed: Array, not object
    }
  });
});

// @desc    Update quarter grades for a student in a subject
const updateStudentGrade = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;
  const { quarterGrades, comments } = req.body;  // comments as array for append

  // Verify access
  const subject = await Subject.findById(subjectId);
  if (!subject || subject.teacher.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Find or create grade
  let grade = await Grade.findOne({ subject: subjectId, student: studentId });
  if (!grade) {
    grade = new Grade({
      subject: subjectId,
      student: studentId,
      quarterGrades: { q1: null, q2: null, q3: null, q4: null },
      semesterGrades: { sem1: null, sem2: null },
      finalGrade: null,
      letterGrade: null,
      remarks: 'Incomplete',
      comments: []
    });
  }

  // Update fields (merge to avoid overwriting nulls)
  if (quarterGrades) {
    grade.quarterGrades = { ...grade.quarterGrades, ...quarterGrades };
  }
  if (comments && Array.isArray(comments) && comments.length > 0) {
    grade.comments.push(...comments);  // Append new comments
  }

  try {
    // Save to trigger pre-save hook (recalculates sem/finals/letter/remarks)
    await grade.save();
  } catch (validationError) {
    console.error('💥 Validation error on save:', validationError);
    return res.status(400).json({ success: false, error: 'Invalid data (e.g., grade out of range or enum mismatch)' });
  }

  // Populate for response
  await grade.populate('student', 'name email lrn');

  res.status(200).json({
    success: true,
    data: grade
  });
});

// @desc    Update comments for a student in a subject (separate if needed)
const updateStudentComments = asyncHandler(async (req, res) => {
  // Use updateStudentGrade for now (handles array push)
  res.status(405).json({ success: false, error: 'Use PUT /grades/subjects/:subjectId/students/:studentId for updates' });
});

// Existing methods (stubbed)
const updateGrade = asyncHandler(async (req, res) => {
  // General updates
});

const exportGrades = asyncHandler(async (req, res) => {
  // XLSX export
});

const importGrades = asyncHandler(async (req, res) => {
  // XLSX import
});

module.exports = {
  getSubjectGrades,
  getStudentSubjectGrades,
  updateGrade,
  updateStudentGrade,
  updateStudentComments,
  exportGrades,
  importGrades
};