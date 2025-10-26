const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { createSubjectSchema, updateSubjectSchema } = require('../middleware/validate');

/**
 * @desc Get subjects for the authenticated teacher (non-archived)
 * @route GET /api/subjects
 * @access Private (Teacher)
 */
const getTeacherSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ teacher: req.user.id, archived: false })
    .populate('students', '_id name email section lrn')  // Include _id for consistency
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

/**
 * @desc Get subjects for the authenticated student (non-archived)
 * @route GET /api/subjects/student
 * @access Private (Student)
 */
const getStudentSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({
    students: req.user.id,
    archived: false
  })
    .populate('teacher', '_id name email department')  // Include _id for consistency
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

/**
 * @desc Get a single subject by ID (teacher or enrolled student)
 * @route GET /api/subjects/:id
 * @access Private (Teacher/Student)
 */
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', '_id name email section lrn parentName')  // _id first for enrollment checks
    .populate('teacher', '_id name email department');  // _id for teacher checks
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }
  // Access: Teacher (owner) OR enrolled student
  const isTeacher = subject.teacher._id.toString() === req.user.id;
  const isEnrolledStudent = subject.students.some(s => s._id.toString() === req.user.id);
  if (!isTeacher && !isEnrolledStudent) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - You must be the teacher or enrolled in this subject'
    });
  }
  // Privacy: For students, only return their own student info
  if (req.role === 'student') {
    subject.students = subject.students.filter(s => s._id.toString() === req.user.id);
  }
  res.status(200).json({
    success: true,
    data: subject
  });
});

/**
 * @desc Get students in a specific subject (teacher or enrolled student)
 * @route GET /api/subjects/:id/students
 * @access Private (Teacher/Student)
 */
const getSubjectStudents = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('students', '_id name email section lrn parentName')  // _id for access checks
    .populate('teacher', '_id name email department');
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }
  // Access: Teacher OR enrolled student
  const isTeacher = subject.teacher._id.toString() === req.user.id;
  const isEnrolledStudent = subject.students.some(s => s._id.toString() === req.user.id);
  if (!isTeacher && !isEnrolledStudent) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - You must be the teacher or enrolled in this subject'
    });
  }
  // Privacy: For students, only return their own info
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

/**
 * @desc Create a new subject
 * @route POST /api/subjects
 * @access Private (Teacher)
 */
const createSubject = asyncHandler(async (req, res) => {
  console.log('🔍 Create payload:', req.body); // Debug: See academicYear string

  const { error } = createSubjectSchema.validate(req.body);
  if (error) {
    console.error('❌ Validation error:', error.details);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, description, gradeLevel, academicYear, students: studentIds = [] } = req.body;

  // Validate academicYear format
  if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear)) {
    return res.status(400).json({
      success: false,
      error: 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)'
    });
  }

  // Validate students if provided
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
    academicYear  // Save as string
  });

  console.log('✅ Created subject with academicYear:', subject.academicYear); // Debug

  // Populate and return
  const populatedSubject = await Subject.findById(subject._id)
    .populate('students', '_id name email section lrn')  // _id for consistency
    .populate('teacher', '_id name email department');

  res.status(201).json({
    success: true,
    data: populatedSubject
  });
});

/**
 * @desc Update subject details
 * @route PUT /api/subjects/:id
 * @access Private (Teacher)
 */
const updateSubject = asyncHandler(async (req, res) => {
  console.log('🔍 Update payload:', req.body); // Debug

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

  // Update academicYear if provided
  if (req.body.academicYear !== undefined) {
    if (!/^\d{4}-\d{4}$/.test(req.body.academicYear)) {
      return res.status(400).json({
        success: false,
        error: 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)'
      });
    }
    subject.academicYear = req.body.academicYear;
    console.log('🔍 Updated academicYear to:', subject.academicYear); // Debug
  }

  // Handle students update (add/remove)
  if (req.body.students) {
    const action = req.body.action || 'add';
    if (action === 'add') {
      const validStudents = await Student.find({ _id: { $in: req.body.students } });
      if (validStudents.length !== req.body.students.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more student IDs are invalid'
        });
      }
      // Merge unique students
      const newStudents = [...new Set([...subject.students.map(s => s.toString()), ...req.body.students])];
      
      // Auto-create grades and update student history for new students
      for (const newStudentId of req.body.students) {
        if (!subject.students.some(s => s.toString() === newStudentId)) {
          // Auto-create grade
          const existingGrade = await Grade.findOne({ subject: subject._id, student: newStudentId });
          if (!existingGrade) {
            const newGrade = new Grade({
              subject: subject._id,
              student: newStudentId,
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
            console.log(`🆕 Auto-created Grade for student ${newStudentId} in subject ${subject._id} with academicYear: ${subject.academicYear}`);
          }
          
          // REFACTOR: Update student's enrolledClasses history
          await Student.findByIdAndUpdate(newStudentId, {
            $addToSet: {
              enrolledClasses: {
                subject: subject._id,
                academicYear: subject.academicYear,
                status: 'active'
              }
            }
          });
        }
      }
      subject.students = newStudents;
    } else if (action === 'remove') {
      const updatedStudents = subject.students.filter(s => !req.body.students.includes(s.toString()));
      
      // Cascade delete and update student history for removed students
      for (const removedStudentId of req.body.students) {
        if (subject.students.some(s => s.toString() === removedStudentId)) {
          await Grade.findOneAndDelete({ subject: subject._id, student: removedStudentId });
          await Attendance.deleteMany({ subject: subject._id, student: removedStudentId });
          console.log(`🗑️ Cascaded delete for removed student ${removedStudentId} in subject ${subject._id}`);
          
          // REFACTOR: Update student's enrolledClasses history to 'archived'
          await Student.updateOne(
            { _id: removedStudentId, 'enrolledClasses.subject': subject._id },
            { $set: { 'enrolledClasses.$.status': 'archived' } }
          );
        }
      }
      subject.students = updatedStudents;
    }
  }

  // Update other fields
  if (req.body.name) subject.name = req.body.name;
  if (req.body.description !== undefined) subject.description = req.body.description;
  if (req.body.gradeLevel) subject.gradeLevel = req.body.gradeLevel;
  if (req.body.archived !== undefined) subject.archived = req.body.archived;

  await subject.save();

  // Populate and return
  const populatedSubject = await Subject.findById(subject._id)
    .populate('students', '_id name email section lrn')  // _id for consistency
    .populate('teacher', '_id name email department');

  res.status(200).json({
    success: true,
    data: populatedSubject
  });
});

/**
 * @desc Add a single student to a subject
 * @route POST /api/subjects/:id/students
 * @access Private (Teacher)
 */
const addStudentToSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
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
  if (subject.students.some(s => s.toString() === studentId)) {
    return res.status(409).json({
      success: false,
      error: 'Student is already enrolled in this subject'
    });
  }
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  subject.students.push(studentId);
  await subject.save();
  
  // REFACTOR: Update student's enrolledClasses history
  await Student.findByIdAndUpdate(studentId, {
    $addToSet: {
      enrolledClasses: {
        subject: subject._id,
        academicYear: subject.academicYear,
        status: 'active'
      }
    }
  });

  // Auto-create grade if needed
  const existingGrade = await Grade.findOne({ subject: id, student: studentId });
  if (!existingGrade) {
    const newGrade = new Grade({
      subject: id,
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
    console.log(`🆕 Auto-created Grade for student ${studentId} in subject ${id} with academicYear: ${subject.academicYear}`);
  } else {
    console.log(`ℹ️ Grade already exists for student ${studentId} in subject ${id}`);
  }
  // Populate and return
  const populatedSubject = await Subject.findById(id)
    .populate('students', '_id name email section lrn')  // _id for consistency
    .populate('teacher', '_id name email department');
  res.status(200).json({
    success: true,
    message: 'Student added successfully',
    data: {
      subject: populatedSubject,
      autoCreatedGrade: !existingGrade
    }
  });
});

/**
 * @desc Remove a single student from a subject
 * @route DELETE /api/subjects/:id/students/:studentId
 * @access Private (Teacher)
 */
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
  const studentIndex = subject.students.findIndex(s => s.toString() === studentId);
  if (studentIndex === -1) {
    return res.status(409).json({
      success: false,
      error: 'Student is not enrolled in this subject'
    });
  }
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  subject.students.splice(studentIndex, 1);
  await subject.save();

  // REFACTOR: Update student's enrolledClasses history to 'archived'
  await Student.updateOne(
    { _id: studentId, 'enrolledClasses.subject': subjectId },
    { $set: { 'enrolledClasses.$.status': 'archived' } }
  );
  
  // Cascade delete grade and attendance
  const deletedGrade = await Grade.findOneAndDelete({ subject: subjectId, student: studentId });
  if (deletedGrade) {
    console.log(`🗑️ Deleted Grade for student ${studentId} in subject ${subjectId}`);
  }
  const deletedAttendance = await Attendance.deleteMany({ subject: subjectId, student: studentId });
  if (deletedAttendance.deletedCount > 0) {
    console.log(`🗑️ Deleted ${deletedAttendance.deletedCount} Attendance records for student ${studentId} in subject ${subjectId}`);
  } else {
    console.log(`ℹ️ No Attendance found to delete for student ${studentId} in subject ${subjectId}`);
  }
  // Populate and return
  const populatedSubject = await Subject.findById(subjectId)
    .populate('students', '_id name email section lrn')  // _id for consistency
    .populate('teacher', '_id name email department');
  res.status(200).json({
    success: true,
    message: 'Student removed successfully',
    data: {
      subject: populatedSubject,
      deletedGrade: !!deletedGrade,
      deletedAttendance: deletedAttendance.deletedCount
    }
  });
});

/**
 * @desc Get ARCHIVED subjects for the authenticated teacher
 * @route GET /api/subjects/archived/teacher
 * @access Private (Teacher)
 */
const getTeacherArchivedSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ teacher: req.user.id, archived: true }) // Filter for archived: true
    .populate('students', '_id name email section lrn')
    .sort({ updatedAt: -1 }); // Sort by most recently archived
  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});

/**
 * @desc Get ARCHIVED subjects for the authenticated student
 * @route GET /api/subjects/archived/student
 * @access Private (Student)
 */
const getStudentArchivedSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({
    students: req.user.id,
    archived: true // Filter for archived: true
  })
    .populate('teacher', '_id name email department')
    .sort({ updatedAt: -1 }); // Sort by most recently archived
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
  getStudentArchivedSubjects
};