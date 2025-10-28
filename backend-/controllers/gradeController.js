// controllers/gradeController.js (Fixed: All teachers can access all subjects)
const mongoose = require('mongoose');
const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const { createGradeSchema } = require('../middleware/validate');

// @desc    Get grades for a specific subject (ALL teachers can access ALL subjects)
const getSubjectGrades = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  
  // Find the subject
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  // ANY teacher can access ANY subject (removed ownership check)
  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  console.log(`✅ Allowing grade access - User ${req.user.id} (${req.role}) accessing subject ${subjectId}`);

  const grades = await Grade.find({ subject: subjectId })
    .populate('student', 'name email lrn')
    .sort({ 'student.name': 1 });

  res.status(200).json({
    success: true,
    count: grades.length,
    data: grades
  });
});

// @desc    Get grades for a specific student in a subject (ALL teachers can access)
const getStudentSubjectGrades = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  // ✅ Student: Self-only + enrolled
  if (req.role === 'student') {
    if (req.user.id !== studentId) {
      return res.status(403).json({ success: false, error: 'You can only view your own grades' });
    }
    if (!subject.students.some(s => s.toString() === studentId)) {
      return res.status(404).json({ success: false, error: 'You are not enrolled in this subject' });
    }
  } else {  
    // ✅ Teacher: ANY teacher can access ANY subject (removed ownership check)
    if (req.role !== 'teacher' && req.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
    }
    
    if (!subject.students.some(s => s.toString() === studentId)) {
      return res.status(404).json({ success: false, error: 'Student not enrolled in this subject' });
    }
  }

  console.log(`✅ Allowing student grade access - User ${req.user.id} (${req.role}) accessing student ${studentId} in subject ${subjectId}`);

  const grade = await Grade.findOne({ subject: subjectId, student: studentId })
    .populate('student', 'name email lrn')
    .populate('subject', 'name description gradeLevel academicYear');

  if (!grade) {
    return res.status(404).json({ success: false, error: 'Grade record not found' });
  }

  // Rest unchanged: history, avg, predictions, etc.
  const gradesHistory = await Grade.find({ 
    student: studentId, 
    subject: subjectId, 
    academicYear: { $ne: grade.academicYear } 
  })
    .select('finalGrade academicYear createdAt')
    .sort({ academicYear: -1 })
    .limit(5);

  const quarterTotals = Object.values(grade.quarterGrades).reduce((sum, q) => sum + (q.total || 0), 0);
  const numQuarters = Object.values(grade.quarterGrades).filter(q => q.total != null).length;
  const currentAvg = grade.finalGrade || (numQuarters > 0 ? quarterTotals / numQuarters : 0);
  const nextYearPrediction = currentAvg + 2;
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
      comments: grade.comments || []
    }
  });
});

// @desc    Update quarter grades for a student in a subject (ALL teachers can update)
const updateStudentGrade = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;
  const { quarterGrades, finalGrade, comments: incomingComments } = req.body;

  // Verify subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  // ANY teacher can update grades in ANY subject (removed ownership check)
  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  console.log(`✅ Allowing grade update - User ${req.user.id} (${req.role}) updating student ${studentId} in subject ${subjectId}`);

  // Find or create grade
  let grade = await Grade.findOne({ subject: subjectId, student: studentId });
  if (!grade) {
    grade = new Grade({
      subject: subjectId,
      student: studentId,
      quarterGrades: { 
        q1: { cs: null, exam: null, total: null }, 
        q2: { cs: null, exam: null, total: null }, 
        q3: { cs: null, exam: null, total: null }, 
        q4: { cs: null, exam: null, total: null } 
      },
      semesterGrades: { sem1: null, sem2: null },
      finalGrade: null,
      letterGrade: null,
      remarks: 'Incomplete',
      comments: [],
      academicYear: subject.academicYear
    });
  }

  // Update fields
  if (quarterGrades) {
    Object.keys(quarterGrades).forEach(q => {
      if (quarterGrades[q]) {
        grade.quarterGrades[q] = { ...grade.quarterGrades[q], ...quarterGrades[q] };
      }
    });
  }

  if (finalGrade !== undefined) {
    grade.finalGrade = finalGrade === null ? null : Number(finalGrade);

    if (grade.finalGrade != null) {
      if (grade.finalGrade >= 90) grade.letterGrade = 'A';
      else if (grade.finalGrade >= 85) grade.letterGrade = 'B';
      else if (grade.finalGrade >= 80) grade.letterGrade = 'C';
      else if (grade.finalGrade >= 75) grade.letterGrade = 'D';
      else grade.letterGrade = 'F';

      grade.remarks = grade.finalGrade >= 75 ? 'Passed' : 'Failed';
    } else {
      grade.letterGrade = null;
      grade.remarks = 'Incomplete';
    }
  }

  // Handle comments
  if (incomingComments !== undefined && Array.isArray(incomingComments)) {
    console.log(`📝 Incoming comments length: ${incomingComments.length}`);
    
    const uniqueComments = [];
    const seenIds = new Set();
    incomingComments.forEach(c => {
      if (c && c.content && c.title) {
        let commentId = c._id;
        if (!commentId) {
          commentId = new mongoose.Types.ObjectId().toString();
        }
        if (!seenIds.has(commentId)) {
          seenIds.add(commentId);
          uniqueComments.push({
            ...c,
            _id: commentId
          });
        }
      }
    });
    
    grade.comments = uniqueComments;
  }

  try {
    await grade.save();
    console.log('✅ Grade saved. Final comments length:', grade.comments.length);
  } catch (validationError) {
    console.error('💥 Validation error on save:', validationError);
    return res.status(400).json({ success: false, error: 'Invalid data' });
  }

  await grade.populate('student', 'name email lrn');

  res.status(200).json({
    success: true,
    data: grade
  });
});

// FIXED: General update (ALL teachers can update)
const updateGrade = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const grade = await Grade.findById(id);
  if (!grade) {
    return res.status(404).json({ success: false, error: 'Grade not found' });
  }

  // ANY teacher can update ANY grade (removed ownership check)
  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  console.log(`✅ Allowing general grade update - User ${req.user.id} (${req.role}) updating grade ${id}`);

  Object.assign(grade, updates);
  await grade.save();

  await grade.populate('student', 'name email lrn');
  res.status(200).json({ success: true, data: grade });
});

// FIXED: Export grades as XLSX (ALL teachers can export)
const exportGrades = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const studentId = req.query.studentId;

  // ANY teacher can export ANY grades (removed ownership check)
  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  console.log(`✅ Allowing grade export - User ${req.user.id} (${req.role}) exporting from subject ${subjectId}`);

  const match = { subject: subjectId };
  if (studentId) match.student = studentId;

  const grades = await Grade.find(match)
    .populate('student', 'name email lrn')
    .populate('subject', 'name academicYear');

  if (grades.length === 0) {
    return res.status(404).json({ success: false, error: 'No grades found' });
  }

  const exportData = grades.map(g => {
    const student = g.student || {};
    return {
      StudentName: student.name,
      StudentEmail: student.email,
      StudentLRN: student.lrn,
      Subject: g.subject.name,
      AcademicYear: g.subject.academicYear,
      Q1_CS: g.quarterGrades.q1.cs,
      Q1_Exam: g.quarterGrades.q1.exam,
      Q1_Total: g.quarterGrades.q1.total,
      Q2_CS: g.quarterGrades.q2.cs,
      Q2_Exam: g.quarterGrades.q2.exam,
      Q2_Total: g.quarterGrades.q2.total,
      Q3_CS: g.quarterGrades.q3.cs,
      Q3_Exam: g.quarterGrades.q3.exam,
      Q3_Total: g.quarterGrades.q3.total,
      Q4_CS: g.quarterGrades.q4.cs,
      Q4_Exam: g.quarterGrades.q4.exam,
      Q4_Total: g.quarterGrades.q4.total,
      Sem1: g.semesterGrades.sem1,
      Sem2: g.semesterGrades.sem2,
      FinalGrade: g.finalGrade,
      LetterGrade: g.letterGrade,
      Remarks: g.remarks
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Grades');
  const filename = `grades-${subjectId}${studentId ? `-student-${studentId}` : ''}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }, (err, buffer) => {
    if (err) throw err;
    res.send(buffer);
  });
});

// FIXED: Import grades from XLSX (ALL teachers can import)
const importGrades = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const subjectId = req.params.subjectId;
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, error: 'Subject not found' });
  }

  // ANY teacher can import to ANY subject (removed ownership check)
  if (req.role !== 'teacher' && req.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Access denied - Teachers only' });
  }

  console.log(`✅ Allowing grade import - User ${req.user.id} (${req.role}) importing to subject ${subjectId}`);

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const results = [];
  for (const row of data) {
    const student = await Student.findOne({ lrn: row.StudentLRN || row.email });
    if (!student) continue;

    let grade = await Grade.findOne({ subject: subjectId, student: student._id });
    if (!grade) {
      grade = new Grade({
        subject: subjectId,
        student: student._id,
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
        remarks: 'Incomplete',
        comments: []
      });
    }

    // Map row to nested fields
    if (row.Q1_CS != null) grade.quarterGrades.q1.cs = parseFloat(row.Q1_CS);
    if (row.Q1_Exam != null) grade.quarterGrades.q1.exam = parseFloat(row.Q1_Exam);
    if (row.Q2_CS != null) grade.quarterGrades.q2.cs = parseFloat(row.Q2_CS);
    if (row.Q2_Exam != null) grade.quarterGrades.q2.exam = parseFloat(row.Q2_Exam);
    if (row.Q3_CS != null) grade.quarterGrades.q3.cs = parseFloat(row.Q3_CS);
    if (row.Q3_Exam != null) grade.quarterGrades.q3.exam = parseFloat(row.Q3_Exam);
    if (row.Q4_CS != null) grade.quarterGrades.q4.cs = parseFloat(row.Q4_CS);
    if (row.Q4_Exam != null) grade.quarterGrades.q4.exam = parseFloat(row.Q4_Exam);
    if (row.Sem1 != null) grade.semesterGrades.sem1 = parseFloat(row.Sem1);
    if (row.Sem2 != null) grade.semesterGrades.sem2 = parseFloat(row.Sem2);
    if (row.FinalGrade != null) grade.finalGrade = parseFloat(row.FinalGrade);

    await grade.save();
    results.push({ student: student.name, updated: true });
  }

  res.status(200).json({ success: true, imported: results.length, details: results });
});

/**
 * @desc Get grade progress report for a student across all subjects/years
 */
const getStudentGradeProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Security check: Ensure student is viewing self, or teacher is involved
  if (req.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ success: false, error: 'Access denied: You can only view your own progress.' });
  }

  // ANY teacher can view progress for ANY student
  if (req.role !== 'teacher' && req.role !== 'superadmin' && req.role !== 'student') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
    const progressData = await Grade.getProgressReport(studentId);

    const populatedData = await Promise.all(progressData.map(async (item) => {
      const subject = await Subject.findById(item.subject).select('name gradeLevel');
      return {
        subjectId: item.subject,
        subjectName: subject ? `${subject.name} (G${subject.gradeLevel})` : 'Unknown Subject',
        progress: item.progress.map(p => ({
            ...p,
            delta: p.delta !== null ? parseFloat(p.delta.toFixed(1)) : null
        }))
      };
    }));

    res.status(200).json({
      success: true,
      data: populatedData
    });
  } catch (err) {
    console.error(`Error getting grade progress for student ${studentId}:`, err);
    res.status(500).json({ success: false, error: 'Server error while fetching grade progress' });
  }
});

module.exports = {
  getSubjectGrades,
  getStudentSubjectGrades,
  updateGrade,
  updateStudentGrade,
  exportGrades,
  importGrades,
  getStudentGradeProgress
};