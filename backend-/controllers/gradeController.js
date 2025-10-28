// controllers/gradeController.js (Complete Refactor with Fixes and Enhancements)
const mongoose = require('mongoose');
const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance'); // Needed for attendance rate
const Notification = require('../models/Notifications'); // Direct model import for notifications
const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const { createGradeSchema } = require('../middleware/validate'); // Assuming this is used elsewhere

// --- Constants ---
const ALLOWED_ROLES_FOR_GRADE_ACTIONS = ['teacher', 'superadmin'];
const STUDENT_SELF_ACCESS_MSG = 'You can only view your own grades';
const TEACHER_ACCESS_DENIED_MSG = 'Access denied - Teachers only';
const STUDENT_NOT_ENROLLED_MSG = 'You are not enrolled in this subject';
const INVALID_STUDENT_ENROLLMENT_MSG = 'Student not enrolled in this subject';

// --- Helper Functions ---

// Check if user has teacher privileges
const hasTeacherPrivileges = (req) => ALLOWED_ROLES_FOR_GRADE_ACTIONS.includes(req.role);

// Populate grade with student details
const populateGradeStudent = async (grade) => {
  // Check if grade exists and has populate method before calling
  if (grade && typeof grade.populate === 'function') {
      await grade.populate('student', 'name email lrn');
  }
  return grade; // Return grade even if population failed or wasn't possible
};


// Calculate grade metrics (current avg, risk) - Simplified for consistency
const calculateGradeMetricsForExport = (grade) => {
    const quarters = grade.quarterGrades || {};
    const totals = ['q1', 'q2', 'q3', 'q4']
        .map((q) => quarters[q]?.total)
        .filter((val) => typeof val === 'number' && !isNaN(val));

    let currentFinalGrade = grade.finalGrade; // Use stored final grade first

    // If finalGrade isn't manually set or is invalid, calculate from quarters
    if (currentFinalGrade === null || currentFinalGrade === undefined || isNaN(currentFinalGrade)) {
        if (totals.length > 0) {
            const sum = totals.reduce((acc, val) => acc + val, 0);
            currentFinalGrade = Math.round((sum / totals.length) * 10) / 10;
        } else {
            currentFinalGrade = null; // Still no grade available
        }
    } else {
        // Ensure manually set finalGrade is treated as a number and rounded
        currentFinalGrade = Number(currentFinalGrade);
         if (isNaN(currentFinalGrade)) currentFinalGrade = null;
         else currentFinalGrade = Math.round(currentFinalGrade * 10) / 10;
    }

    const riskLevel = currentFinalGrade === null ? 'N/A' : (currentFinalGrade < 75 ? 'High' : 'Low');
    return { currentFinalGrade, riskLevel };
};

// Update letter grade and remarks based on finalGrade
const updateLetterAndRemarks = (grade) => {
    // Check if finalGrade exists and is a valid number
    if (grade.finalGrade != null && !isNaN(grade.finalGrade)) {
      const final = Number(grade.finalGrade);
      if (final >= 90) grade.letterGrade = 'A';
      else if (final >= 85) grade.letterGrade = 'B';
      else if (final >= 80) grade.letterGrade = 'C';
      else if (final >= 75) grade.letterGrade = 'D';
      else grade.letterGrade = 'F'; // Grades below 75 are 'F'
      grade.remarks = final >= 75 ? 'Passed' : 'Failed'; // Determine pass/fail
    } else {
      // If no valid final grade, reset letter and remarks
      grade.letterGrade = null;
      grade.remarks = 'Incomplete';
    }
};

// Process incoming comments to ensure structure and uniqueness (if needed)
const processComments = (incomingComments) => {
    const uniqueComments = [];
    const seenIds = new Set();
    (incomingComments || []).forEach(c => { // Guard against null/undefined
      // Basic validation for comment structure
      if (c && typeof c.content === 'string' && c.content.trim() && typeof c.title === 'string' && c.title.trim()) {
        let commentId = c._id || new mongoose.Types.ObjectId().toString(); // Assign ID if missing
        if (!seenIds.has(commentId)) {
          seenIds.add(commentId);
          // Ensure essential fields are present
          uniqueComments.push({
              _id: commentId,
              title: c.title,
              content: c.content,
              author: c.author || 'System', // Default author if missing
              timestamp: c.timestamp || new Date() // Default timestamp if missing
          });
        }
      }
    });
    return uniqueComments;
};


// Detect and notify on significant grade changes
const handleQuarterGradeUpdates = async (originalGrade, updatedGrade, subjectId, studentId, subjectName) => {
    const updatedQuartersInfo = []; // Store quarter name and new grade
    const originalQuarters = originalGrade?.quarterGrades || {};
    const updatedQuarters = updatedGrade?.quarterGrades || {};

    // Check each quarter for changes in CS, Exam, or Total
    for (const q of ['q1', 'q2', 'q3', 'q4']) {
        const originalQ = originalQuarters[q];
        const newQ = updatedQuarters[q];
        const originalTotal = originalQ?.total;
        const newTotal = newQ?.total;

        // Check if total changed OR if cs/exam changed significantly
        if ((newTotal !== null && newTotal !== undefined && newTotal !== originalTotal) ||
            (newQ?.cs !== null && newQ?.cs !== undefined && newQ?.cs !== originalQ?.cs) ||
            (newQ?.exam !== null && newQ?.exam !== undefined && newQ?.exam !== originalQ?.exam))
        {
            updatedQuartersInfo.push({ quarter: q.toUpperCase(), grade: newTotal ?? 'Updated' });
        }
    }

    // Check if final grade changed significantly (e.g., crossing pass/fail threshold)
    const originalFinal = originalGrade?.finalGrade;
    const updatedFinal = updatedGrade?.finalGrade;
    let finalGradeChangedSignificantly = false;
    if (updatedFinal !== null && updatedFinal !== undefined && updatedFinal !== originalFinal) {
        // Example threshold: Notify if pass/fail status changes
        const originalPassed = originalFinal !== null && originalFinal >= 75;
        const updatedPassed = updatedFinal >= 75;
        if (originalPassed !== updatedPassed) {
             finalGradeChangedSignificantly = true;
        }
        // Could add other thresholds, e.g., change > 5 points
    }


    if (updatedQuartersInfo.length === 0 && !finalGradeChangedSignificantly) {
        return; // No notable changes found
    }

    // Construct message
    let message = `Your grades in ${subjectName} were updated.`;
    if (updatedQuartersInfo.length > 0) {
        const quarterList = updatedQuartersInfo.map(uq => `${uq.quarter}: ${uq.grade}`).join(', ');
        message += ` Quarters: ${quarterList}.`;
    }
    if (finalGradeChangedSignificantly) {
         message += ` Your final grade status changed to ${updatedGrade.remarks}. New Final: ${updatedFinal?.toFixed(1) ?? 'N/A'}.`;
    }


    try {
        const notification = new Notification({
            recipient: studentId,
            type: 'grade_update',
            title: `Grade Update: ${subjectName}`,
            message: message,
            subject: subjectId
        });
        await notification.save();
        console.log(`✅ Grade update notification created for student ${studentId} in subject ${subjectId}`);
    } catch (error) {
        console.error(`❌ Failed to create grade notification for student ${studentId}:`, error);
    }
};


// Parse academic year string 'YYYY-YYYY' to the starting year number
const parseAcademicYear = (academicYearString) => {
    if (!academicYearString || typeof academicYearString !== 'string') return 0;
    const year = parseInt(academicYearString.split('-')[0], 10);
    return isNaN(year) ? 0 : year;
};

// Calculate slope and intercept from quarterly grades
const calculateQuarterlyRegression = (quarterGrades) => {
    const quarters = quarterGrades || {};
    const points = [
        { x: 1, y: quarters.q1?.total }, { x: 2, y: quarters.q2?.total },
        { x: 3, y: quarters.q3?.total }, { x: 4, y: quarters.q4?.total },
    ].filter(p => typeof p.y === 'number' && !isNaN(p.y));

    if (points.length < 1) { // Changed to allow calculation with just one point
        return { slope: null, intercept: null }; // Cannot determine trend/intercept
    }
    if (points.length === 1) {
        return { slope: 0, intercept: points[0].y }; // Assume flat trend from single point
    }

    // Standard linear regression calculation for 2+ points
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const denominator = (n * sumX2 - sumX * sumX);

    if (Math.abs(denominator) < 1e-6) {
        return { slope: 0, intercept: sumY / n }; // Vertical line case (treat as flat)
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return {
        slope: Math.round(slope * 10) / 10,
        intercept: intercept
     };
};

// --- Controller Functions ---

// GET /api/grades/subjects/:subjectId
const getSubjectGrades = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    if (!hasTeacherPrivileges(req)) {
        return res.status(403).json({ success: false, error: TEACHER_ACCESS_DENIED_MSG });
    }

    const subject = await Subject.findById(subjectId).select('academicYear'); // Need academic year
    if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Fetch grades only for the SPECIFIC academic year of the subject
    const grades = await Grade.find({
        subject: subjectId,
        academicYear: subject.academicYear // Filter by subject's academic year
      })
      .populate('student', 'name email lrn') // Populate student details
      .sort({ 'student.name': 1 }); // Sort by student name

    res.status(200).json({
        success: true,
        count: grades.length,
        data: grades
    });
});

// GET /api/grades/subjects/:subjectId/students/:studentId
const getStudentSubjectGrades = asyncHandler(async (req, res) => {
    const { subjectId, studentId } = req.params;

    const subject = await Subject.findById(subjectId).populate('students', '_id'); // Populate student IDs for check
    if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Access control: Student (self only) or Teacher/Admin
    const isTeacher = hasTeacherPrivileges(req);
    const isTargetStudent = req.role === 'student' && req.user.id === studentId;
    const isEnrolled = subject.students.some(s => s._id.toString() === studentId);

    if (!isTeacher && !isTargetStudent) {
         return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (isTargetStudent && !isEnrolled) {
        return res.status(404).json({ success: false, error: STUDENT_NOT_ENROLLED_MSG });
    }
     if (isTeacher && !isEnrolled) {
        // Teacher accessing non-enrolled student? Allow if needed for viewing history, maybe?
        // Or return 404 depending on requirements. Let's return 404 for now.
        return res.status(404).json({ success: false, error: INVALID_STUDENT_ENROLLMENT_MSG });
     }


    // Find the grade record for the specific academic year
    const grade = await Grade.findOne({
        subject: subjectId,
        student: studentId,
        academicYear: subject.academicYear
      })
      .populate('student', 'name email lrn') // Populate student details
      .populate('subject', 'name description gradeLevel academicYear'); // Populate subject details

    if (!grade) {
        // Maybe return a structure indicating no grade exists yet for this year
        return res.status(404).json({ success: false, error: 'Grade record not found for this academic year.' });
    }

    // Fetch historical grades for comparison (other years for the *same* subject)
    const gradesHistory = await Grade.find({
        student: studentId,
        subject: subjectId, // Same subject ID
        academicYear: { $ne: subject.academicYear } // Different academic years
      })
      .select('finalGrade academicYear quarterGrades') // Select needed fields
      .sort({ academicYear: -1 }); // Sort newest history first

    // Calculate metrics based on the current grade
    const metrics = calculateGradeMetricsForExport(grade); // Get currentFinalGrade and riskLevel
    const predictions = {
       currentAvg: metrics.currentFinalGrade,
       // Simple prediction for display, frontend might use more complex one
       nextYearPrediction: metrics.currentFinalGrade !== null ? metrics.currentFinalGrade + 2 : null,
       riskLevel: metrics.riskLevel // Use calculated risk
     };

    res.status(200).json({
        success: true,
        data: {
            student: grade.student,
            currentGrades: grade, // The grade for the specific academic year
            gradesHistory,       // Grades from previous years for the same subject
            predictions,
            comments: grade.comments || []
        }
    });
});

// PUT /api/grades/subjects/:subjectId/students/:studentId
const updateStudentGrade = asyncHandler(async (req, res) => {
    const { subjectId, studentId } = req.params;
    const { quarterGrades, finalGrade, comments: incomingComments } = req.body;

    // Check permissions
    if (!hasTeacherPrivileges(req)) {
        return res.status(403).json({ success: false, error: TEACHER_ACCESS_DENIED_MSG });
    }

    const subject = await Subject.findById(subjectId).select('name academicYear'); // Need details for grade/notification
    if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Find or create grade record *for the correct academic year*
    let grade = await Grade.findOne({ subject: subjectId, student: studentId, academicYear: subject.academicYear });
    const originalGrade = grade ? JSON.parse(JSON.stringify(grade)) : null; // Deep copy before changes

    if (!grade) {
        // Create a new grade record if one doesn't exist for this year
        grade = new Grade({
            subject: subjectId, student: studentId, academicYear: subject.academicYear,
            quarterGrades: { q1: {}, q2: {}, q3: {}, q4: {} }, remarks: 'Incomplete', comments: []
            // Other fields will default or be calculated by pre-save
        });
        console.log(`Creating new grade record for student ${studentId} in subject ${subjectId} for ${subject.academicYear}`);
    }

    let gradeDataChanged = false; // Flag to check if actual grade values changed

    // Update Quarter Grades (CS/Exam) if provided
    if (quarterGrades) {
        for (const q of ['q1', 'q2', 'q3', 'q4']) {
            if (quarterGrades[q] && grade.quarterGrades[q]) { // Check if quarter exists in payload and model
                const parseNumOrNull = (val) => (val === null || val === '' || val === undefined) ? null : Number(val);
                const newCs = parseNumOrNull(quarterGrades[q].cs);
                const newExam = parseNumOrNull(quarterGrades[q].exam);

                // Update only if the new value is different from the current one
                if (newCs !== grade.quarterGrades[q].cs) {
                    grade.quarterGrades[q].cs = newCs;
                    gradeDataChanged = true;
                }
                if (newExam !== grade.quarterGrades[q].exam) {
                    grade.quarterGrades[q].exam = newExam;
                    gradeDataChanged = true;
                }
            }
        }
    }

    // Update Final Grade (Manual Override) if provided and different
    if (finalGrade !== undefined) {
        const newFinalGrade = (finalGrade === null || finalGrade === '') ? null : Number(finalGrade);
        if (newFinalGrade !== grade.finalGrade) {
            grade.finalGrade = newFinalGrade; // Allow manual override
            gradeDataChanged = true;
            console.log(`Manually setting finalGrade to: ${newFinalGrade}`);
            // Note: The pre-save hook will recalculate LetterGrade and Remarks based on this
        }
    }

    // Update Comments if provided
    let commentsChanged = false;
    if (incomingComments !== undefined && Array.isArray(incomingComments)) {
        const processed = processComments(incomingComments);
        // Basic check if comments array content changed
        if (JSON.stringify(processed) !== JSON.stringify(grade.comments)) {
             grade.comments = processed;
             commentsChanged = true;
        }
    }

    // Only save if there were actual changes to grade data or comments
    if (gradeDataChanged || commentsChanged || !originalGrade) { // Save if new or changed
        await grade.save(); // Triggers pre-save hook (calculates totals, final if not overridden, etc.)
        await populateGradeStudent(grade); // Re-populate student after save

        // Send notifications ONLY if grade data changed (not just comments)
        if (gradeDataChanged && originalGrade) {
            // Fetch the just-saved grade to compare original with recalculated values
            const savedGrade = await Grade.findById(grade._id).lean();
            await handleQuarterGradeUpdates(originalGrade, savedGrade, subjectId, studentId, subject.name);
        }
    } else {
        console.log(`No changes detected for grade record ${grade._id}. Skipping save and notification.`);
        // Still need to populate student if no changes were made but comments were sent
        if (!grade.student?.name) await populateGradeStudent(grade);
    }


    res.status(200).json({
        success: true,
        data: grade
    });
});


// PUT /api/grades/:gradeId (General Update - Less common, ensure consistency)
const updateGrade = asyncHandler(async (req, res) => {
    const { gradeId } = req.params;
    const updates = req.body;

    if (!hasTeacherPrivileges(req)) {
        return res.status(403).json({ success: false, error: TEACHER_ACCESS_DENIED_MSG });
    }

    // Prevent direct update of calculated fields via this general route
    delete updates.quarterGrades?.q1?.total;
    delete updates.quarterGrades?.q2?.total;
    delete updates.quarterGrades?.q3?.total;
    delete updates.quarterGrades?.q4?.total;
    delete updates.semesterGrades;
    delete updates.letterGrade;
    delete updates.remarks;
    // Keep manual finalGrade override possible if needed, but prefer updateStudentGrade

    const grade = await Grade.findById(gradeId).populate('subject', 'name academicYear'); // Need subject for notification
    if (!grade) {
        return res.status(404).json({ success: false, error: 'Grade not found' });
    }
    const originalGrade = JSON.parse(JSON.stringify(grade)); // Deep copy

    // Apply allowed updates
    Object.assign(grade, updates);

    await grade.save(); // Triggers pre-save hook
    await populateGradeStudent(grade); // Populate after save

    // Trigger notifications based on comparison
    await handleQuarterGradeUpdates(originalGrade, grade.toObject(), grade.subject._id, grade.student, grade.subject.name);

    res.status(200).json({ success: true, data: grade });
});

// --- XLSX Export ---

// Build export row, now includes quarterly trend
const buildExportRow = (gradeDoc, attendanceRate, quarterlyTrend, predictedGrade, riskLevel) => {
    const student = gradeDoc.student || {}; const subject = gradeDoc.subject || {};
    const qg = gradeDoc.quarterGrades || {}; const sg = gradeDoc.semesterGrades || {};
    return {
        StudentName: student.name || '', StudentEmail: student.email || '', StudentLRN: student.lrn || '',
        Subject: subject.name || '', AcademicYear: subject.academicYear || '',
        Q1_CS: qg.q1?.cs, Q1_Exam: qg.q1?.exam, Q1_Total: qg.q1?.total,
        Q2_CS: qg.q2?.cs, Q2_Exam: qg.q2?.exam, Q2_Total: qg.q2?.total,
        Q3_CS: qg.q3?.cs, Q3_Exam: qg.q3?.exam, Q3_Total: qg.q3?.total,
        Q4_CS: qg.q4?.cs, Q4_Exam: qg.q4?.exam, Q4_Total: qg.q4?.total,
        Sem1: sg.sem1, Sem2: sg.sem2,
        FinalGrade: gradeDoc.finalGrade, LetterGrade: gradeDoc.letterGrade, Remarks: gradeDoc.remarks,
        AttendanceRate: attendanceRate !== null ? `${attendanceRate}%` : 'N/A',
        QuarterlyTrend: quarterlyTrend, // Calculated slope for the year
        PredictedGrade: predictedGrade, // Predicted final average for the year
        RiskLevel: riskLevel,
    };
};

// GET /api/grades/subjects/:subjectId/export
const exportGrades = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const studentIdQuery = req.query.studentId;

    if (!hasTeacherPrivileges(req)) {
        return res.status(403).json({ success: false, error: TEACHER_ACCESS_DENIED_MSG });
    }

    const subject = await Subject.findById(subjectId).select('name academicYear students'); // Need students for filtering
    if (!subject) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const enrolledStudentIds = subject.students.map(s => s.toString());
    const targetStudentIds = studentIdQuery ? [studentIdQuery] : enrolledStudentIds;

    if (targetStudentIds.length === 0) {
       return res.status(200).json({ success: true, message: 'No students enrolled in this subject to export grades for.', data: [] });
    }

    // Fetch grades ONLY for the current academic year of the subject
    const currentGrades = await Grade.find({
        subject: subjectId,
        student: { $in: targetStudentIds },
        academicYear: subject.academicYear
    })
        .populate('student', 'name email lrn')
        .populate('subject', 'name academicYear') // Populate subject for consistency
        .lean(); // Use lean for efficiency

    // Fetch attendance for these students in this subject
    const attendanceRecords = await Attendance.find({
        subject: subjectId,
        student: { $in: targetStudentIds }
    }).select('student status').lean(); // Only need status and student ID

    // Group attendance
    const attendanceByStudent = attendanceRecords.reduce((acc, record) => {
        const studentId = record.student.toString();
        if (!acc[studentId]) acc[studentId] = { total: 0, present: 0 };
        acc[studentId].total++;
        if (record.status === 'Present') acc[studentId].present++;
        return acc;
    }, {});

    // Build Export Data
    const exportData = currentGrades.map(g => {
        const studentId = g.student?._id.toString();
        if (!studentId) return buildExportRow(g, null, null, null, 'N/A');

        // Calculate Attendance Rate
        const attStats = attendanceByStudent[studentId];
        const attendanceRate = attStats && attStats.total > 0
            ? Math.round((attStats.present / attStats.total) * 1000) / 10
            : null;

        // Calculate Quarterly Trend (Slope) and Intercept
        const { slope: quarterlyTrend, intercept } = calculateQuarterlyRegression(g.quarterGrades);

        // Calculate Current Final Grade & Risk Level
        const { currentFinalGrade, riskLevel } = calculateGradeMetricsForExport(g);

        // Calculate Predicted Grade (Average of actuals + predictions)
        let predictedGrade = null;
        const qTotals = [g.quarterGrades?.q1?.total, g.quarterGrades?.q2?.total, g.quarterGrades?.q3?.total, g.quarterGrades?.q4?.total];
        const hasSomeGrade = qTotals.some(t => t !== null && t !== undefined && !isNaN(t));

        if (quarterlyTrend !== null && intercept !== null && hasSomeGrade) { // Need trend and at least one grade
            let predictedSum = 0;
            let count = 0;
            for (let x = 1; x <= 4; x++) {
                 const actualQuarterTotal = qTotals[x-1];
                 if (actualQuarterTotal !== null && actualQuarterTotal !== undefined && !isNaN(actualQuarterTotal)) {
                     predictedSum += actualQuarterTotal;
                 } else {
                     let prediction = quarterlyTrend * x + intercept;
                     predictedSum += Math.max(0, Math.min(100, prediction)); // Clamp prediction
                 }
                 count++;
            }
            if (count > 0) {
                predictedGrade = Math.round((predictedSum / count) * 10) / 10;
            }
        } else {
             // Fallback if trend cannot be calculated, use currentFinalGrade if available
             predictedGrade = currentFinalGrade;
        }

        return buildExportRow( g, attendanceRate, quarterlyTrend, predictedGrade, riskLevel );
    });

    if (exportData.length === 0) {
        return res.status(200).json({ success: true, message: 'No grade records found for the specified criteria.', data: [] });
    }

    // Generate and Send XLSX
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(exportData);
    const range = XLSX.utils.decode_range(ws['!ref']); ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    XLSX.utils.book_append_sheet(wb, ws, 'Grades');
    const filename = `grades-${subject.name.replace(/[^a-zA-Z0-9]/g, '_')}-${subject.academicYear}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.send(buffer);
});


// --- XLSX Import ---

// Normalize header string
const normalizeHeader = (header) => {
  if (typeof header !== 'string') return '';
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Map normalized headers to internal paths or ID fields
const headerToPathMap = {
  'studentlrn': { idField: 'lrn' }, 'lrn': { idField: 'lrn' },
  'studentemail': { idField: 'email' }, 'email': { idField: 'email' },
  'q1cs': { path: ['quarterGrades', 'q1', 'cs'] }, 'q1exam': { path: ['quarterGrades', 'q1', 'exam'] },
  'q2cs': { path: ['quarterGrades', 'q2', 'cs'] }, 'q2exam': { path: ['quarterGrades', 'q2', 'exam'] },
  'q3cs': { path: ['quarterGrades', 'q3', 'cs'] }, 'q3exam': { path: ['quarterGrades', 'q3', 'exam'] },
  'q4cs': { path: ['quarterGrades', 'q4', 'cs'] }, 'q4exam': { path: ['quarterGrades', 'q4', 'exam'] },
  'sem1': { path: ['semesterGrades', 'sem1'] }, 'sem2': { path: ['semesterGrades', 'sem2'] },
  'finalgrade': { path: ['finalGrade'] },
  // Flexible aliases
  'classstandingq1': { path: ['quarterGrades', 'q1', 'cs'] }, 'quarterlyexamq1': { path: ['quarterGrades', 'q1', 'exam'] },
  'classstandingq2': { path: ['quarterGrades', 'q2', 'cs'] }, 'quarterlyexamq2': { path: ['quarterGrades', 'q2', 'exam'] },
  'classstandingq3': { path: ['quarterGrades', 'q3', 'cs'] }, 'quarterlyexamq3': { path: ['quarterGrades', 'q3', 'exam'] },
  'classstandingq4': { path: ['quarterGrades', 'q4', 'cs'] }, 'quarterlyexamq4': { path: ['quarterGrades', 'q4', 'exam'] },
};

// Set nested value safely
const setNestedValue = (obj, path, value) => {
    // ... (keep existing logic) ...
     let current = obj;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!current[key] || typeof current[key] !== 'object') { current[key] = {}; }
        current = current[key];
      }
      current[path[path.length - 1]] = value;
};

// Get nested value safely
const getNestedValue = (obj, path) => {
    // ... (keep existing logic) ...
    if (!obj || !path) return undefined;
    const pathArray = Array.isArray(path) ? path : [path];
    return pathArray.reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj);
};

// POST /api/grades/subjects/:subjectId/import
const importGrades = asyncHandler(async (req, res) => {
    // ... (Keep the improved import logic from the previous iteration) ...
    // Includes file checks, header normalization, student lookup,
    // flexible data mapping, validation (0-100), saving, error aggregation,
    // and notification triggering.
    if (!req.file) { return res.status(400).json({ success: false, error: 'No file uploaded' }); }
    if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) { return res.status(400).json({ success: false, error: 'Invalid file type. Please upload an XLSX file.' }); }

    const subjectId = req.params.subjectId;
    const subject = await Subject.findById(subjectId).select('name academicYear');
    if (!subject) { return res.status(404).json({ success: false, error: 'Subject not found' }); }
    if (!hasTeacherPrivileges(req)) { return res.status(403).json({ success: false, error: TEACHER_ACCESS_DENIED_MSG }); }

    let workbook; try { workbook = XLSX.read(req.file.buffer, { type: 'buffer' }); }
    catch (parseError) { return res.status(400).json({ success: false, error: 'Could not read the XLSX file.' }); }

    const sheetName = workbook.SheetNames[0]; if (!sheetName) { return res.status(400).json({ success: false, error: 'XLSX file has no sheets.' }); }
    const sheet = workbook.Sheets[sheetName]; const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (data.length === 0) { return res.status(400).json({ success: false, error: 'No data rows found.' }); }

    const results = { imported: 0, skipped_student_not_found: 0, errors: [], updated_students: [] };
    const headers = Object.keys(data[0]); const normalizedHeaderMap = {};
    headers.forEach(h => normalizedHeaderMap[normalizeHeader(h)] = h);

    const lrnHeaderNorm = Object.keys(headerToPathMap).find(normH => headerToPathMap[normH].idField === 'lrn' && normalizedHeaderMap[normH]);
    const emailHeaderNorm = Object.keys(headerToPathMap).find(normH => headerToPathMap[normH].idField === 'email' && normalizedHeaderMap[normH]);
    if (!lrnHeaderNorm && !emailHeaderNorm) { return res.status(400).json({ success: false, error: 'Could not find Student LRN or Email column.' }); }

    for (let i = 0; i < data.length; i++) {
        const row = data[i]; let studentIdentifier = null; let studentQuery = {};
        if (lrnHeaderNorm) { /* ... LRN lookup logic ... */
             const originalLrnHeader = normalizedHeaderMap[lrnHeaderNorm];
              studentIdentifier = row[originalLrnHeader];
              if (studentIdentifier !== null && studentIdentifier !== undefined && String(studentIdentifier).trim() !== '') { studentQuery.lrn = String(studentIdentifier).trim(); }
              else { studentIdentifier = null; }
        }
        if (Object.keys(studentQuery).length === 0 && emailHeaderNorm) { /* ... Email lookup logic ... */
             const originalEmailHeader = normalizedHeaderMap[emailHeaderNorm];
              studentIdentifier = row[originalEmailHeader];
               if (studentIdentifier !== null && studentIdentifier !== undefined && String(studentIdentifier).trim() !== '') { studentQuery.email = String(studentIdentifier).trim().toLowerCase(); }
               else { studentIdentifier = null; }
        }

        if (!studentIdentifier || Object.keys(studentQuery).length === 0) { results.errors.push(`Row ${i + 2}: Skipped - Missing identifier.`); continue; }

        const student = await Student.findOne(studentQuery);
        if (!student) { results.skipped_student_not_found++; results.errors.push(`Row ${i + 2}: Skipped - Student "${studentIdentifier}" not found.`); continue; }

        let grade = await Grade.findOne({ subject: subjectId, student: student._id, academicYear: subject.academicYear });
        const originalGrade = grade ? JSON.parse(JSON.stringify(grade)) : null;
        if (!grade) { grade = new Grade({ /* ... create new grade with correct academicYear ... */ subject: subjectId, student: student._id, academicYear: subject.academicYear, quarterGrades: { q1:{}, q2:{}, q3:{}, q4:{} }, remarks: 'Incomplete' }); }

        let hasChanges = false;
        Object.keys(normalizedHeaderMap).forEach(normalizedHeader => {
            const mapping = headerToPathMap[normalizedHeader];
            if (mapping && mapping.path) { /* ... Map values, validate 0-100, set hasChanges ... */
                const originalFileHeader = normalizedHeaderMap[normalizedHeader];
                const valueFromFile = row[originalFileHeader]; let newValue = null;
                if (valueFromFile !== null && valueFromFile !== '' && String(valueFromFile).toUpperCase() !== 'N/A') {
                    const numValue = parseFloat(valueFromFile);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) { newValue = numValue; }
                    else { results.errors.push(`Row ${i + 2}, Col "${originalFileHeader}": Invalid value "${valueFromFile}". Skipped.`); return; }
                }
                const currentValue = getNestedValue(grade, mapping.path);
                if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) { setNestedValue(grade, mapping.path, newValue); hasChanges = true; }
            }
        });

        try {
            if (hasChanges || !originalGrade) {
                await grade.save(); results.imported++; results.updated_students.push(student.name);
                const savedGrade = await Grade.findById(grade._id).lean(); // Use lean for comparison object
                if (hasChanges && originalGrade) { await handleQuarterGradeUpdates(originalGrade, savedGrade, subjectId, student._id, subject.name); }
            }
        } catch (saveError) { results.errors.push(`Row ${i + 2}: Error saving for ${student.name} - ${saveError.message}`); }
    } // End loop

    let responseMessage = `Import finished. ${results.imported} grades processed.`; /* ... construct message ... */
     if (results.skipped_student_not_found > 0) { responseMessage += ` ${results.skipped_student_not_found} rows skipped (student not found).`; }
     if (results.errors.length > 0) { responseMessage += ` ${results.errors.length} errors/warnings occurred (see details).`; }

    const updatedGradesList = await Grade.find({ subject: subjectId, academicYear: subject.academicYear }) /* ... populate and sort ... */ .populate('student', 'name email lrn').sort({ 'student.name': 1 });

    res.status(results.errors.length > 0 ? 207 : 200).json({ /* ... response object ... */
        success: results.errors.length === 0 && results.imported > 0, message: responseMessage, importedCount: results.imported,
        skippedCount: results.skipped_student_not_found, updatedStudents: [...new Set(results.updated_students)],
        errors: results.errors, updatedGrades: updatedGradesList
    });
});

// GET /api/grades/student/:studentId/progress
const getStudentGradeProgress = asyncHandler(async (req, res) => {
    // ... (Keep existing logic) ...
     const { studentId } = req.params;

    if (req.role === 'student' && req.user.id !== studentId) { return res.status(403).json({ success: false, error: 'Access denied: You can only view your own progress.' }); }
    if (!hasTeacherPrivileges(req) && req.role !== 'student') { return res.status(403).json({ success: false, error: 'Access denied' }); }

    try {
      const progressData = await Grade.getProgressReport(studentId);
      const populatedData = await Promise.all(
        progressData.map(async (item) => {
          const subject = await Subject.findById(item.subject).select('name gradeLevel');
          return {
            subjectId: item.subject, subjectName: subject ? `${subject.name} (G${subject.gradeLevel || 'N/A'})` : 'Unknown Subject',
            progress: item.progress.map(p => ({ ...p, delta: p.delta !== null && p.delta !== undefined ? parseFloat(p.delta.toFixed(1)) : null }))
          };
        })
      );
      res.status(200).json({ success: true, data: populatedData });
    } catch (err) {
      console.error(`Error getting grade progress for student ${studentId}:`, err);
      res.status(500).json({ success: false, error: 'Server error while fetching grade progress' });
    }
});

// --- Exports ---
module.exports = {
    getSubjectGrades,
    getStudentSubjectGrades,
    updateGrade,
    updateStudentGrade,
    exportGrades,
    importGrades,
    getStudentGradeProgress
};