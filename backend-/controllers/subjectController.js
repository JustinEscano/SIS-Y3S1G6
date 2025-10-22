// controllers/subjectController.js (Updated: Added removeStudentFromSubject with Grade deletion)
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');
const Grade = require('../models/Grade'); // Import Grade model
const asyncHandler = require('express-async-handler');
const Joi = require('joi'); // npm i joi
const { createSubjectSchema, updateSubjectSchema } = require('../middleware/validate'); // Adjust path if needed

// @desc    Get subjects for the authenticated teacher
// @route   GET /subjects
// @access  Private (Teacher only)
const getTeacherSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ teacher: req.user.id, archived: false })
    .populate('students', 'name email gradeLevel section lrn')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get subjects for the authenticated student
// @route   GET /subjects/student
// @access  Private (Student only)
const getStudentSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ 
    students: req.user.id, 
    archived: false 
  })
    .populate('teacher', 'name email department')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

// @desc    Get a single subject by ID
// @route   GET /subjects/:id
// @access  Private (Teacher only - for now; extend to students if needed)
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', 'name email gradeLevel section lrn parentName')
    .populate('teacher', 'name email department');

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  // Access check: Only teacher (extend to students via enrollment if needed)
  if (subject.teacher._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: subject
  });
});

// @desc    Create a new subject (for teachers only)
// @route   POST /subjects
// @access  Private (Teacher only)
const createSubject = asyncHandler(async (req, res) => {
  const { error } = createSubjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, description, gradeLevel, schoolYear, students: studentIds = [] } = req.body;

  // Validate studentIds exist and are students
  if (studentIds.length > 0) {
    const validStudents = await Student.find({ _id: { $in: studentIds } });
    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more student IDs are invalid'
      });
    }
  }

  const subject = await Subject.create({
    name,
    description,
    teacher: req.user.id,
    students: studentIds,
    gradeLevel,
    schoolYear
  });

  const populatedSubject = await Subject.findById(subject._id)
    .populate('students', 'name email gradeLevel section lrn')
    .populate('teacher', 'name email department');

  res.status(201).json({
    success: true,
    data: populatedSubject
  });
});

// @desc    Get students in a specific subject
// @route   GET /subjects/:id/students
// @access  Private (Teacher/Student)
const getSubjectStudents = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', 'name email gradeLevel section lrn parentName')
    .populate('teacher', 'name email department');

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  // Ensure user has access: teacher or enrolled student
  if (subject.teacher._id.toString() !== req.user.id && !subject.students.some(s => s._id.toString() === req.user.id)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    count: subject.students.length,
    data: {
      subject: { name: subject.name, description: subject.description, gradeLevel: subject.gradeLevel, schoolYear: subject.schoolYear },
      students: subject.students
    }
  });
});

// @desc    Add a single student to a subject (with auto-Grade creation)
// @route   POST /subjects/:id/students
// @access  Private (Teacher only)
const addStudentToSubject = asyncHandler(async (req, res) => {
  const { id } = req.params; // subjectId
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({
      success: false,
      error: 'Student ID is required'
    });
  }

  let subject = await Subject.findById(id);
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  if (subject.teacher._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - only the teacher can add students'
    });
  }

  if (subject.archived) {
    return res.status(400).json({
      success: false,
      error: 'Cannot add students to an archived subject'
    });
  }

  // Check if student already enrolled (idempotent)
  if (subject.students.some(s => s.toString() === studentId)) {
    return res.status(409).json({
      success: false,
      error: 'Student is already enrolled in this subject'
    });
  }

  // Validate student exists
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  // Add student to subject
  subject.students.push(studentId);
  await subject.save();

  // Auto-create Grade record (as discussed)
  const existingGrade = await Grade.findOne({ subject: id, student: studentId });
  if (!existingGrade) {
    const newGrade = new Grade({
      subject: id,
      student: studentId,
      quarterGrades: { q1: null, q2: null, q3: null, q4: null },
      semesterGrades: { sem1: null, sem2: null },
      finalGrade: null,
      letterGrade: null,
      remarks: 'Incomplete'
    });
    await newGrade.save(); // Triggers pre-save (nulls won't compute yet)
    console.log(`🆕 Auto-created Grade for student ${studentId} in subject ${id}`);
  } else {
    console.log(`ℹ️ Grade already exists for student ${studentId} in subject ${id}`);
  }

  // Refresh populated subject
  const populatedSubject = await Subject.findById(id)
    .populate('students', 'name email gradeLevel section lrn')
    .populate('teacher', 'name email department');

  res.status(200).json({
    success: true,
    message: 'Student added successfully',
    data: {
      subject: populatedSubject,
      autoCreatedGrade: !existingGrade // Flag for frontend if needed
    }
  });
});

// @desc    Remove a single student from a subject (with Grade deletion)
// @route   DELETE /subjects/:id/students/:studentId
// @access  Private (Teacher only)
const removeStudentFromSubject = asyncHandler(async (req, res) => {
  const { id: subjectId, studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({
      success: false,
      error: 'Student ID is required'
    });
  }

  let subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  if (subject.teacher._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - only the teacher can remove students'
    });
  }

  if (subject.archived) {
    return res.status(400).json({
      success: false,
      error: 'Cannot remove students from an archived subject'
    });
  }

  // Check if student is enrolled
  const studentIndex = subject.students.findIndex(s => s.toString() === studentId);
  if (studentIndex === -1) {
    return res.status(409).json({
      success: false,
      error: 'Student is not enrolled in this subject'
    });
  }

  // Validate student exists (optional, but good practice)
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  // Remove student from subject
  subject.students.splice(studentIndex, 1);
  await subject.save();

  // Delete the corresponding Grade document
  const deletedGrade = await Grade.findOneAndDelete({ subject: subjectId, student: studentId });
  if (deletedGrade) {
    console.log(`🗑️ Deleted Grade for student ${studentId} in subject ${subjectId}`);
  } else {
    console.log(`ℹ️ No Grade found to delete for student ${studentId} in subject ${subjectId}`);
  }

  // Refresh populated subject
  const populatedSubject = await Subject.findById(subjectId)
    .populate('students', 'name email gradeLevel section lrn')
    .populate('teacher', 'name email department');

  res.status(200).json({
    success: true,
    message: 'Student removed successfully',
    data: {
      subject: populatedSubject,
      deletedGrade: !!deletedGrade // Flag for frontend if needed
    }
  });
});

// @desc    Update subject (e.g., add/remove students, general updates)
// @route   PUT /subjects/:id
// @access  Private (Teacher only)
const updateSubject = asyncHandler(async (req, res) => {
  const { error } = updateSubjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  let subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  if (subject.teacher._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // Handle adding/removing students (legacy support; prefer dedicated endpoint for adds)
  if (req.body.students) {
    const action = req.body.action || 'add';
    let updatedStudents;

    if (action === 'add') {
      const validStudents = await Student.find({ _id: { $in: req.body.students } });
      if (validStudents.length !== req.body.students.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more student IDs are invalid'
        });
      }
      updatedStudents = [...new Set([...subject.students.map(s => s.toString()), ...req.body.students])];

      // Auto-create Grades for new students
      for (const newStudentId of req.body.students) {
        if (!subject.students.some(s => s.toString() === newStudentId)) {
          const existingGrade = await Grade.findOne({ subject: subject._id, student: newStudentId });
          if (!existingGrade) {
            const newGrade = new Grade({
              subject: subject._id,
              student: newStudentId,
              quarterGrades: { q1: null, q2: null, q3: null, q4: null },
              semesterGrades: { sem1: null, sem2: null },
              finalGrade: null,
              letterGrade: null,
              remarks: 'Incomplete'
            });
            await newGrade.save();
            console.log(`🆕 Auto-created Grade for student ${newStudentId} in subject ${subject._id}`);
          }
        }
      }
    } else if (action === 'remove') {
      updatedStudents = subject.students.filter(s => !req.body.students.includes(s.toString()));
      // Delete Grades for removed students
      for (const removedStudentId of req.body.students) {
        if (subject.students.some(s => s.toString() === removedStudentId)) {
          const deletedGrade = await Grade.findOneAndDelete({ subject: subject._id, student: removedStudentId });
          if (deletedGrade) {
            console.log(`🗑️ Deleted Grade for removed student ${removedStudentId} in subject ${subject._id}`);
          }
        }
      }
    }

    subject.students = updatedStudents;
  }

  // Update other fields if provided
  if (req.body.name) subject.name = req.body.name;
  if (req.body.description !== undefined) subject.description = req.body.description;
  if (req.body.gradeLevel) subject.gradeLevel = req.body.gradeLevel;
  if (req.body.schoolYear) subject.schoolYear = req.body.schoolYear;
  if (req.body.archived !== undefined) subject.archived = req.body.archived;

  await subject.save();

  const populatedSubject = await Subject.findById(subject._id)
    .populate('students', 'name email gradeLevel section lrn')
    .populate('teacher', 'name email department');

  res.status(200).json({
    success: true,
    data: populatedSubject
  });
});

module.exports = {
  getTeacherSubjects,
  getStudentSubjects,
  createSubject,
  getSubjectById, // New export
  getSubjectStudents,
  updateSubject,
  addStudentToSubject, // New export
  removeStudentFromSubject // New export
};