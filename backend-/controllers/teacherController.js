const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');

const getPastDays = (count) => {
  if (count <= 0) return [];
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push({
      date,
      label: date.toISOString().split('T')[0],
    });
  }

  return days;
};

const computeFinalGrade = (gradeDoc) => {
  if (typeof gradeDoc.finalGrade === 'number') {
    return gradeDoc.finalGrade;
  }

  const quarters = gradeDoc.quarterGrades || {};
  const totals = ['q1', 'q2', 'q3', 'q4']
    .map((q) => quarters[q]?.total)
    .filter((val) => typeof val === 'number');

  if (!totals.length) return null;
  const sum = totals.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / totals.length) * 100) / 100;
};

const resolveLetterGrade = (gradeDoc) => {
  if (gradeDoc.letterGrade) return gradeDoc.letterGrade;
  const final = computeFinalGrade(gradeDoc);
  if (final == null) return 'Ungraded';
  if (final >= 90) return 'A';
  if (final >= 85) return 'B';
  if (final >= 80) return 'C';
  if (final >= 75) return 'D';
  return 'F';
};

const calculateAttendanceRate = (records) => {
  if (!records.length) return 0;
  const present = records.filter((record) => record.status === 'Present').length;
  return Math.round((present / records.length) * 1000) / 10;
};

const ensureTeacher = (user) => {
  if (!user) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'teacher' && user.role !== 'superadmin') {
    const error = new Error('Insufficient permissions for teacher resources');
    error.statusCode = 403;
    throw error;
  }
};

const getTeacherProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  ensureTeacher(user);

  res.json({
    success: true,
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      department: user.department || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const updateTeacherProfile = asyncHandler(async (req, res) => {
  const { name, email, department } = req.body;
  const user = await User.findById(req.user.id);
  ensureTeacher(user);

  if (email && email.toLowerCase().trim() !== user.email) {
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: req.user.id },
    });
    if (existing) {
      res.status(409);
      throw new Error('Email is already in use');
    }
    user.email = email.toLowerCase().trim();
  }

  if (name) user.name = name.trim();
  if (department !== undefined) user.department = department?.trim() || '';

  await user.save();

  res.json({
    success: true,
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      department: user.department || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const changeTeacherPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }

  const user = await User.findById(req.user.id).select('+password');
  ensureTeacher(user);

  const isValid = await user.matchPassword(currentPassword);
  if (!isValid) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
});

const buildTeacherDataSets = async (teacherId) => {
  const subjects = await Subject.find({ teacher: teacherId })
    .populate('students', '_id name email section')
    .sort({ name: 1 });

  const subjectIds = subjects.map((subject) => subject._id);

  let gradeRecords = [];
  let attendanceRecords = [];

  if (subjectIds.length) {
    gradeRecords = await Grade.find({ subject: { $in: subjectIds } })
      .populate('student', 'name email section')
      .populate('subject', 'name gradeLevel academicYear')
      .sort({ updatedAt: -1 });

    attendanceRecords = await Attendance.find({ subject: { $in: subjectIds } })
      .populate('student', 'name email section')
      .populate('subject', 'name gradeLevel academicYear')
      .sort({ date: -1 });
  }

  return { subjects, gradeRecords, attendanceRecords };
};

const getTeacherDashboard = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;
  const { subjects, gradeRecords, attendanceRecords } = await buildTeacherDataSets(teacherId);

  const subjectIds = subjects.map((subject) => subject._id.toString());
  const activeSubjects = subjects.filter((subject) => !subject.archived);
  const archivedSubjects = subjects.length - activeSubjects.length;

  const studentIdSet = new Set();
  let totalEnrollments = 0;

  subjects.forEach((subject) => {
    subject.students.forEach((student) => {
      studentIdSet.add(student._id.toString());
    });
    totalEnrollments += subject.students.length;
  });

  const averageClassSize = subjects.length
    ? Math.round((totalEnrollments / subjects.length) * 10) / 10
    : 0;

  const gradeValues = gradeRecords
    .map((grade) => computeFinalGrade(grade))
    .filter((grade) => grade != null);

  const averageGrade = gradeValues.length
    ? Math.round((gradeValues.reduce((sum, value) => sum + value, 0) / gradeValues.length) * 10) / 10
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attendanceLast30 = attendanceRecords.filter((record) => record.date >= thirtyDaysAgo);
  const attendanceRate = calculateAttendanceRate(attendanceLast30);

  const atRiskGrades = gradeRecords.filter((grade) => {
    const finalGrade = computeFinalGrade(grade);
    return finalGrade != null && finalGrade < 75;
  });

  const studentsAtRisk = atRiskGrades.slice(0, 8).map((grade) => ({
    studentId: grade.student?._id || grade.student,
    studentName: grade.student?.name || 'Unknown student',
    subjectName: grade.subject?.name || 'Unknown subject',
    finalGrade: computeFinalGrade(grade),
    updatedAt: grade.updatedAt,
  }));

  const subjectGradeMap = new Map();
  const subjectAttendanceMap = new Map();

  gradeRecords.forEach((grade) => {
    const subjectId = grade.subject?._id?.toString() || grade.subject?.toString();
    if (!subjectId) return;
    if (!subjectGradeMap.has(subjectId)) {
      subjectGradeMap.set(subjectId, []);
    }
    subjectGradeMap.get(subjectId).push(grade);
  });

  attendanceRecords.forEach((record) => {
    const subjectId = record.subject?._id?.toString() || record.subject?.toString();
    if (!subjectId) return;
    if (!subjectAttendanceMap.has(subjectId)) {
      subjectAttendanceMap.set(subjectId, []);
    }
    subjectAttendanceMap.get(subjectId).push(record);
  });

  const subjectHighlights = activeSubjects.slice(0, 4).map((subject) => {
    const subjectId = subject._id.toString();
    const gradesForSubject = subjectGradeMap.get(subjectId) || [];
    const attendanceForSubject = subjectAttendanceMap.get(subjectId) || [];

    const subjectAverageGradeValues = gradesForSubject
      .map((grade) => computeFinalGrade(grade))
      .filter((grade) => grade != null);

    const subjectAverageGrade = subjectAverageGradeValues.length
      ? Math.round((subjectAverageGradeValues.reduce((sum, value) => sum + value, 0) / subjectAverageGradeValues.length) * 10) / 10
      : null;

    const subjectAttendanceRate = calculateAttendanceRate(attendanceForSubject);

    return {
      id: subject._id,
      name: subject.name,
      gradeLevel: subject.gradeLevel,
      academicYear: subject.academicYear,
      studentCount: subject.students.length,
      averageGrade: subjectAverageGrade,
      attendanceRate: subjectAttendanceRate,
    };
  });

  const attendanceTimelineMap = new Map();
  const recentDays = getPastDays(7);

  recentDays.forEach(({ label }) => {
    attendanceTimelineMap.set(label, { present: 0, absent: 0, tardy: 0 });
  });

  attendanceLast30.forEach((record) => {
    const label = record.date.toISOString().split('T')[0];
    if (!attendanceTimelineMap.has(label)) {
      attendanceTimelineMap.set(label, { present: 0, absent: 0, tardy: 0 });
    }
    const bucket = attendanceTimelineMap.get(label);
    if (record.status === 'Present') {
      bucket.present += 1;
    } else if (record.status === 'Absent') {
      bucket.absent += 1;
    } else if (record.status === 'Tardy') {
      bucket.tardy += 1;
    }
  });

  const attendanceTimeline = Array.from(attendanceTimelineMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, counts]) => ({ date, ...counts }));

  const recentGradeUpdates = gradeRecords.slice(0, 6).map((grade) => ({
    studentName: grade.student?.name || 'Unknown student',
    subjectName: grade.subject?.name || 'Unknown subject',
    finalGrade: computeFinalGrade(grade),
    updatedAt: grade.updatedAt,
  }));

  res.json({
    success: true,
    overview: {
      totalSubjects: subjects.length,
      activeSubjects: activeSubjects.length,
      archivedSubjects,
      totalStudents: studentIdSet.size,
      averageClassSize,
      averageGrade,
      attendanceRate,
      atRiskStudents: atRiskGrades.length,
    },
    subjectHighlights,
    studentsAtRisk,
    recentActivity: {
      attendanceTimeline,
      gradeUpdates: recentGradeUpdates,
    },
  });
});

const getTeacherAnalytics = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;
  const { subjects, gradeRecords, attendanceRecords } = await buildTeacherDataSets(teacherId);

  const quarterTotals = {
    q1: { sum: 0, count: 0 },
    q2: { sum: 0, count: 0 },
    q3: { sum: 0, count: 0 },
    q4: { sum: 0, count: 0 },
  };

  const gradeDistributionCounts = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
    Ungraded: 0,
  };

  const riskBuckets = {
    high: 0,
    medium: 0,
    low: 0,
  };

  const subjectPerformance = subjects.map((subject) => ({
    subjectId: subject._id,
    name: subject.name,
    gradeLevel: subject.gradeLevel,
    academicYear: subject.academicYear,
    studentCount: subject.students.length,
    averageGrade: null,
    attendanceRate: 0,
  }));

  const subjectPerfMap = new Map(subjectPerformance.map((perf) => [perf.subjectId.toString(), perf]));

  gradeRecords.forEach((grade) => {
    const letter = resolveLetterGrade(grade);
    gradeDistributionCounts[letter] = (gradeDistributionCounts[letter] || 0) + 1;

    const finalGrade = computeFinalGrade(grade);
    if (finalGrade != null) {
      if (finalGrade < 75) riskBuckets.high += 1;
      else if (finalGrade < 85) riskBuckets.medium += 1;
      else riskBuckets.low += 1;
    }

    const quarters = grade.quarterGrades || {};
    ['q1', 'q2', 'q3', 'q4'].forEach((quarterKey) => {
      const value = quarters[quarterKey]?.total;
      if (typeof value === 'number') {
        quarterTotals[quarterKey].sum += value;
        quarterTotals[quarterKey].count += 1;
      }
    });

    const subjectId = grade.subject?._id?.toString() || grade.subject?.toString();
    if (subjectPerfMap.has(subjectId)) {
      const perf = subjectPerfMap.get(subjectId);
      if (!perf.grades) perf.grades = [];
      perf.grades.push(finalGrade);
    }
  });

  attendanceRecords.forEach((record) => {
    const subjectId = record.subject?._id?.toString() || record.subject?.toString();
    if (subjectPerfMap.has(subjectId)) {
      const perf = subjectPerfMap.get(subjectId);
      if (!perf.attendance) perf.attendance = [];
      perf.attendance.push(record);
    }
  });

  subjectPerformance.forEach((perf) => {
    if (perf.grades && perf.grades.length) {
      const validGrades = perf.grades.filter((grade) => grade != null);
      perf.averageGrade = validGrades.length
        ? Math.round((validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length) * 10) / 10
        : null;
    }
    if (perf.attendance && perf.attendance.length) {
      perf.attendanceRate = calculateAttendanceRate(perf.attendance);
    }
    delete perf.grades;
    delete perf.attendance;
  });

  const quarterAverages = ['q1', 'q2', 'q3', 'q4'].map((quarterKey) => {
    const { sum, count } = quarterTotals[quarterKey];
    if (!count) return null;
    return Math.round((sum / count) * 10) / 10;
  });

  const recentDays = getPastDays(14);
  const attendanceTrendMap = new Map(recentDays.map(({ label }) => [label, { Present: 0, Absent: 0, Tardy: 0 }]));

  attendanceRecords.forEach((record) => {
    const label = record.date.toISOString().split('T')[0];
    if (!attendanceTrendMap.has(label)) {
      attendanceTrendMap.set(label, { Present: 0, Absent: 0, Tardy: 0 });
    }
    const slot = attendanceTrendMap.get(label);
    slot[record.status] = (slot[record.status] || 0) + 1;
  });

  const attendanceTrend = Array.from(attendanceTrendMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, counts]) => ({ date, ...counts }));

  res.json({
    success: true,
    gradeDistribution: {
      labels: Object.keys(gradeDistributionCounts),
      counts: Object.values(gradeDistributionCounts),
    },
    quarterAverages: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      values: quarterAverages,
    },
    attendanceTrend,
    subjectPerformance,
    studentRisk: riskBuckets,
  });
});

module.exports = {
  getTeacherProfile,
  updateTeacherProfile,
  changeTeacherPassword,
  getTeacherDashboard,
  getTeacherAnalytics,
};
