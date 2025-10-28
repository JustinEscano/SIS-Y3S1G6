// controllers/subjectController.js (Updated: Added teacher notification on subject assignment, with self-notification skip)
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notifications'); // Direct model import
const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { createSubjectSchema, updateSubjectSchema } = require('../middleware/validate');

const TEACHER_POPULATE = '_id name email department';
const STUDENT_POPULATE = '_id name email section lrn parentName';

// Constants
const ALLOWED_ROLES_FOR_SUBJECT_ACTIONS = ['teacher', 'superadmin'];
const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

// Helper: Check if user has teacher privileges
const hasTeacherPrivileges = (req) => ALLOWED_ROLES_FOR_SUBJECT_ACTIONS.includes(req.role);

// Helper: Populate subject with teachers and students
const populateSubject = (subject) => {
  return Subject.findById(subject._id)
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE);
};

// Helper: Validate and assign teacher
const assignTeacher = async (req, subject) => {
  if (req.role === 'superadmin' && req.body.teacher) {
    const assignedTeacher = await User.findById(req.body.teacher);
    if (!assignedTeacher || assignedTeacher.role !== 'teacher') {
      throw new Error('Assigned teacher not found or is not a teacher');
    }
    subject.teacher = req.body.teacher;
  } else if (req.role === 'teacher' && !subject.teacher) {
    subject.teacher = req.user.id;
  }
};

// Helper: Create enrollment notification (Direct model usage)
const createEnrollmentNotification = async (studentId, subjectId) => {
  if (!subjectId) {
    console.warn('Skipping enrollment notification: Subject ID not provided');
    return;
  }

  try {
    const notification = new Notification({
      recipient: studentId,
      type: 'enrollment',
      title: 'New Subject Enrollment',
      message: `You have been enrolled in a new subject.`,
      subject: subjectId
    });
    await notification.save();
    console.log(`✅ Enrollment notification created for student ${studentId}`);
  } catch (error) {
    console.error('Failed to create enrollment notification:', error);
  }
};

// UPDATED: Helper: Create teacher assignment notification (with self-skip check)
const createTeacherAssignmentNotification = async (teacherId, subject, creatorId = null) => {
  if (!teacherId || !subject) {
    console.warn('Skipping teacher assignment notification: Missing teacherId or subject');
    return;
  }

  // Skip if notifying the creator themselves
  if (creatorId && teacherId.toString() === creatorId.toString()) {
    console.log('Skipping self-notification for teacher assignment');
    return;
  }

  try {
    const notification = new Notification({
      recipient: teacherId,
      type: 'other', // Use 'other' or update schema enum to include 'subject_assignment'
      title: 'New Subject Assignment',
      message: `You have been assigned to teach "${subject.name}" (Grade ${subject.gradeLevel}, ${subject.academicYear}).`,
      subject: subject._id
    });
    await notification.save();
    console.log(`✅ Teacher assignment notification created for ${teacherId} - Subject: ${subject.name}`);
  } catch (error) {
    console.error('Failed to create teacher assignment notification:', error);
  }
};

// Helper: Handle student add (with grade/auto-enroll and notification)
const handleAddStudent = async (subject, studentId, req) => {
  if (subject.students.some(s => s.toString() === studentId)) {
    throw new Error('Student is already enrolled in this subject');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  subject.students.push(studentId);

  // Update student history
  await Student.findByIdAndUpdate(studentId, {
    $addToSet: {
      enrolledClasses: {
        subject: subject._id,
        academicYear: subject.academicYear,
        status: 'active',
        assignedBy: req.user.id
      }
    }
  });

  // Auto-create grade
  const existingGrade = await Grade.findOne({ subject: subject._id, student: studentId });
  if (!existingGrade) {
    const newGrade = new Grade({
      subject: subject._id,
      student: studentId,
      academicYear: subject.academicYear,
      quarterGrades: {
        q1: { cs: null, exam: null, total: null },
        q2: { cs: null, exam: null, total: null },
        q3: { cs: null, exam: null, total: null },
        q4: { cs: null, exam: null, total: null }
      },
      semesterGrades: { sem1: null, sem2: null },
      finalGrade: null,
      letterGrade: null,
      remarks: 'Incomplete'
    });
    await newGrade.save();
  }

  // Send enrollment notification
  await createEnrollmentNotification(studentId, subject._id);

  return !existingGrade;
};

// Helper: Handle student remove (cascade delete)
const handleRemoveStudent = async (subject, studentId) => {
  const studentIndex = subject.students.findIndex(s => s.toString() === studentId);
  if (studentIndex === -1) {
    throw new Error('Student is not enrolled in this subject');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  subject.students.splice(studentIndex, 1);

  // Update student history
  await Student.updateOne(
    { _id: studentId, 'enrolledClasses.subject': subject._id },
    { $set: { 'enrolledClasses.$.status': 'archived' } }
  );

  // Cascade delete
  await Grade.findOneAndDelete({ subject: subject._id, student: studentId });
  const deletedAttendance = await Attendance.deleteMany({ subject: subject._id, student: studentId });

  return deletedAttendance.deletedCount;
};

// @desc    Get subjects for the authenticated teacher (non-archived) - ALL teachers see ALL subjects
const getTeacherSubjects = asyncHandler(async (req, res) => {
  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  const subjects = await Subject.find({ archived: false })
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get all subjects (Superadmin only)
const getAllSubjects = asyncHandler(async (req, res) => {
  if (req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Superadmin only' });
  }

  const subjects = await Subject.find({})
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get subjects for the authenticated student (non-archived)
const getStudentSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({
    students: req.user.id,
    archived: false
  })
    .populate('teacher', TEACHER_POPULATE)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get a single subject by ID (teacher or enrolled student)
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE);

  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  const isTeacher = hasTeacherPrivileges(req);
  const isEnrolledStudent = subject.students.some(s => s._id.toString() === req.user.id);

  if (!isTeacher && !isEnrolledStudent) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - You must be a teacher or enrolled in this subject'
    });
  }

  // Privacy for students
  if (req.role === 'student') {
    subject.students = subject.students.filter(s => s._id.toString() === req.user.id);
  }

  res.status(200).json({ success: true, data: subject });
});

// @desc    Get students in a specific subject (teacher or enrolled student)
const getSubjectStudents = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE);

  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  const isTeacher = hasTeacherPrivileges(req);
  const isEnrolledStudent = subject.students.some(s => s._id.toString() === req.user.id);

  if (!isTeacher && !isEnrolledStudent) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - You must be a teacher or enrolled in this subject'
    });
  }

  let students = subject.students;
  if (req.role === 'student') {
    students = subject.students.filter(s => s._id.toString() === req.user.id);
  }

  res.status(200).json({
    success: true,
    count: students.length,
    data: {
      subject: { 
        name: subject.name, 
        description: subject.description, 
        gradeLevel: subject.gradeLevel, 
        academicYear: subject.academicYear 
      },
      students
    }
  });
});

// @desc    Create a new subject
const createSubject = asyncHandler(async (req, res) => {
  const { error } = createSubjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const { name, code, description, gradeLevel, academicYear, students: studentIds = [] } = req.body;

  if (!academicYear || !ACADEMIC_YEAR_REGEX.test(academicYear)) {
    return res.status(400).json({ success: false, error: 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)' });
  }

  if (studentIds.length > 0) {
    const validStudents = await Student.find({ _id: { $in: studentIds } });
    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({ success: false, error: 'One or more student IDs are invalid' });
    }
  }

  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  let subject = new Subject({
    name,
    description,
    code,
    students: studentIds,
    gradeLevel,
    academicYear
  });

  await assignTeacher(req, subject);

  await subject.save();

  // Send enrollment notifications with subject ID for initial students (removed redundant pre-save loop)
  for (const studentId of studentIds) {
    await createEnrollmentNotification(studentId, subject._id);
  }

  // UPDATED: Notify assigned teacher if one was assigned (skips self if creator is the teacher)
  if (subject.teacher) {
    await createTeacherAssignmentNotification(subject.teacher, subject, req.user.id);
  }

  const populatedSubject = await populateSubject(subject);

  res.status(201).json({ success: true, data: populatedSubject });
});

// @desc    Update subject details - ANY teacher can update ANY subject
const updateSubject = asyncHandler(async (req, res) => {
  const { error } = updateSubjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  let subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  if (req.body.academicYear !== undefined) {
    if (!ACADEMIC_YEAR_REGEX.test(req.body.academicYear)) {
      return res.status(400).json({ success: false, error: 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)' });
    }
    subject.academicYear = req.body.academicYear;
  }

  let newEnrollments = []; // Track new students for notifications

  // Handle students
  if (req.body.students) {
    const action = req.body.action || 'add';
    if (action === 'add') {
      const validStudents = await Student.find({ _id: { $in: req.body.students } });
      if (validStudents.length !== req.body.students.length) {
        return res.status(400).json({ success: false, error: 'One or more student IDs are invalid' });
      }

      for (const studentId of req.body.students) {
        if (!subject.students.some(s => s.toString() === studentId)) {
          await handleAddStudent(subject, studentId, req);
          newEnrollments.push(studentId); // Already notified in handleAddStudent
        }
      }

      subject.students = [...new Set([...subject.students.map(s => s.toString()), ...req.body.students])];
    } else if (action === 'remove') {
      for (const studentId of req.body.students) {
        if (subject.students.some(s => s.toString() === studentId)) {
          await handleRemoveStudent(subject, studentId);
        }
      }
    }
  }

  // Update other fields
  const updateFields = ['name', 'description', 'code', 'gradeLevel', 'archived'];
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      subject[field] = req.body[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(req.body, 'teacher')) {
    const oldTeacher = subject.teacher;
    subject.teacher = req.body.teacher || undefined;

    // UPDATED: If teacher was changed, notify the new teacher (skips self if creator is the new teacher)
    if (subject.teacher && subject.teacher.toString() !== oldTeacher?.toString()) {
      await createTeacherAssignmentNotification(subject.teacher, subject, req.user.id);
    }
  }

  await subject.save();

  const populatedSubject = await populateSubject(subject);

  res.status(200).json({ success: true, data: populatedSubject });
});

// @desc    Add a single student to a subject - ANY teacher can add students to ANY subject
const addStudentToSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'Student ID is required' });
  }

  let subject = await Subject.findById(id);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Only teachers and superadmins can add students' });
  }

  if (subject.archived) {
    return res.status(400).json({ success: false, error: 'Cannot add students to an archived subject' });
  }

  try {
    const autoCreatedGrade = await handleAddStudent(subject, studentId, req);
    await subject.save();
    const populatedSubject = await populateSubject(subject);

    res.status(200).json({
      success: true,
      message: 'Student added successfully',
      data: { subject: populatedSubject, autoCreatedGrade }
    });
  } catch (err) {
    return res.status(err.message.includes('already enrolled') ? 409 : 404).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Remove a single student from a subject - ANY teacher can remove students from ANY subject
const removeStudentFromSubject = asyncHandler(async (req, res) => {
  const { id: subjectId, studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'Student ID is required' });
  }

  let subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Only teachers and superadmins can remove students' });
  }

  if (subject.archived) {
    return res.status(400).json({ success: false, error: 'Cannot remove students from an archived subject' });
  }

  try {
    const deletedAttendanceCount = await handleRemoveStudent(subject, studentId);
    await subject.save();
    const populatedSubject = await populateSubject(subject);

    res.status(200).json({
      success: true,
      message: 'Student removed successfully',
      data: {
        subject: populatedSubject,
        deletedGrade: true,
        deletedAttendance: deletedAttendanceCount
      }
    });
  } catch (err) {
    return res.status(err.message.includes('not enrolled') ? 409 : 404).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Get ARCHIVED subjects for the authenticated teacher - ALL teachers see ALL archived subjects
const getTeacherArchivedSubjects = asyncHandler(async (req, res) => {
  if (!hasTeacherPrivileges(req)) {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  const subjects = await Subject.find({ archived: true })
    .populate('students', STUDENT_POPULATE)
    .populate('teacher', TEACHER_POPULATE)
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get ARCHIVED subjects for the authenticated student
const getStudentArchivedSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({
    students: req.user.id,
    archived: true
  })
    .populate('teacher', TEACHER_POPULATE)
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

module.exports = {
  getTeacherSubjects,
  getStudentSubjects,
  createSubject,
  getSubjectById,
  getSubjectStudents,
  updateSubject,
  addStudentToSubject,
  removeStudentFromSubject,
  getTeacherArchivedSubjects,
  getStudentArchivedSubjects,
  getAllSubjects
};