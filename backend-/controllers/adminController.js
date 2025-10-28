const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Invite = require('../models/Invite');
const { sendEmail } = require('../config/email');

const getPastMonths = (count) => {
  if (count <= 0) return [];
  const months = [];
  const now = new Date();
  now.setDate(1);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      date
    });
  }

  return months;
};

const getPastDays = (count) => {
  if (count <= 0) return [];
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push({
      date,
      label: date.toISOString().split('T')[0]
    });
  }

  return days;
};

/**
 * Get system statistics
 * GET /api/admin/stats
 */
const getStats = asyncHandler(async (req, res) => {
  try {
    const [totalStudents, users, totalSubjects] = await Promise.all([
      Student.countDocuments(),
      User.find().select('role'),
      Subject.countDocuments()
    ]);

    const totalTeachers = users.filter(u => u.role === 'teacher').length;
    const totalSuperadmins = users.filter(u => u.role === 'superadmin').length;
    const totalUsers = totalStudents + users.length;

    res.json({
      totalUsers,
      totalStudents,
      totalTeachers,
      totalSuperadmins,
      totalSubjects
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

/**
 * Get all users (teachers and superadmins)
 * GET /api/admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * Delete a user (teacher or superadmin)
 * DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    console.log(`✅ User deleted: ${user.email} (${user.role})`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

/**
 * Create a new user (teacher or superadmin)
 * POST /api/admin/users
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required' });
  }

  if (!['teacher', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be either teacher or superadmin' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingStudent = await Student.findOne({ email: normalizedEmail });
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingStudent || existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  try {
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      department
    });

    console.log(`✅ ${role} created by admin: ${newUser.email}`);

    res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

/**
 * Get a single user by ID
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

/**
 * Update user profile
 * PUT /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, department, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    if (department !== undefined) user.department = department;
    if (newPassword) {
      const trimmedPassword = newPassword.trim();
      if (trimmedPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }
      user.password = trimmedPassword;
      user.markModified('password');
    }

    await user.save();
    console.log(`✅ User updated: ${user.email}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

/**
 * Change user password
 * PUT /api/admin/users/:id/password
 */
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const months = getPastMonths(6);
  const startOfWindow = months.length ? months[0].date : new Date();
  const recentDays = getPastDays(14);
  const startOfRecentDays = recentDays.length ? recentDays[0].date : new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [studentMonthly, userMonthly, enrollmentByGradeAgg, topSubjectsAgg, gradeLetterAgg, attendanceStatusAgg, attendanceDailyAgg, roleCountsAgg, totalStudents, totalSubjects, activeSubjects, archivedSubjects, newStudents30d, newTeachers30d, newSubjects30d, attendanceSessions30d] = await Promise.all([
    Student.aggregate([
      { $match: { createdAt: { $gte: startOfWindow } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startOfWindow } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          teachers: {
            $sum: {
              $cond: [{ $eq: ['$role', 'teacher'] }, 1, 0]
            }
          },
          superadmins: {
            $sum: {
              $cond: [{ $eq: ['$role', 'superadmin'] }, 1, 0]
            }
          }
        }
      }
    ]),
    Subject.aggregate([
      {
        $addFields: {
          studentCount: { $size: { $ifNull: ['$students', []] } }
        }
      },
      {
        $group: {
          _id: '$gradeLevel',
          totalSubjects: { $sum: 1 },
          totalStudents: { $sum: '$studentCount' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Subject.aggregate([
      {
        $addFields: {
          studentCount: { $size: { $ifNull: ['$students', []] } }
        }
      },
      { $sort: { studentCount: -1, name: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          name: 1,
          gradeLevel: 1,
          studentCount: 1,
          academicYear: 1
        }
      }
    ]),
    Grade.aggregate([
      {
        $group: {
          _id: '$letterGrade',
          count: { $sum: 1 }
        }
      }
    ]),
    Attendance.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Attendance.aggregate([
      { $match: { date: { $gte: startOfRecentDays } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]),
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]),
    Student.countDocuments(),
    Subject.countDocuments(),
    Subject.countDocuments({ archived: false }),
    Subject.countDocuments({ archived: true }),
    Student.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ role: 'teacher', createdAt: { $gte: thirtyDaysAgo } }),
    Subject.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Attendance.countDocuments({ date: { $gte: thirtyDaysAgo } })
  ]);

  const userRoleCounts = roleCountsAgg.reduce((acc, doc) => {
    acc[doc._id] = doc.count;
    return acc;
  }, {});

  const registrationTrends = months.map(({ year, month, label }) => {
    const studentRecord = studentMonthly.find((doc) => doc._id.year === year && doc._id.month === month);
    const userRecord = userMonthly.find((doc) => doc._id.year === year && doc._id.month === month);
    const studentsCount = studentRecord ? studentRecord.count : 0;
    const teacherCount = userRecord ? userRecord.teachers : 0;
    const superadminCount = userRecord ? userRecord.superadmins : 0;

    return {
      label,
      students: studentsCount,
      teachers: teacherCount,
      superadmins: superadminCount,
      total: studentsCount + teacherCount + superadminCount
    };
  });

  const enrollmentByGrade = enrollmentByGradeAgg.map((item) => ({
    gradeLevel: item._id ?? 'Unassigned',
    totalSubjects: item.totalSubjects,
    totalStudents: item.totalStudents
  }));

  const topSubjects = topSubjectsAgg.map((item) => ({
    id: item._id,
    name: item.name,
    gradeLevel: item.gradeLevel ?? 'Unassigned',
    academicYear: item.academicYear,
    studentCount: item.studentCount
  }));

  const gradeLetterMap = gradeLetterAgg.reduce((acc, item) => {
    const key = item._id || 'Ungraded';
    acc[key] = item.count;
    return acc;
  }, {});

  const gradeLetterLabels = ['A', 'B', 'C', 'D', 'F', 'Ungraded'];
  const gradeLetters = gradeLetterLabels.map((label) => ({
    label,
    count: gradeLetterMap[label] || 0
  }));

  const attendanceStatus = attendanceStatusAgg.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, { Present: 0, Absent: 0, Tardy: 0 });

  const attendanceDailyMap = attendanceDailyAgg.reduce((acc, item) => {
    const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
    acc[key] = item.total;
    return acc;
  }, {});

  const attendanceRecentActivity = recentDays.map(({ date, label }) => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return {
      date: label,
      total: attendanceDailyMap[key] || 0
    };
  });

  const totalTeachers = userRoleCounts.teacher || 0;
  const totalSuperadmins = userRoleCounts.superadmin || 0;
  const totalStaffUsers = Object.values(userRoleCounts).reduce((sum, count) => sum + count, 0);
  const totalUsers = totalStudents + totalStaffUsers;

  res.json({
    userRegistrationTrends: registrationTrends,
    subjectEnrollment: {
      byGradeLevel: enrollmentByGrade,
      topSubjects
    },
    gradeDistribution: {
      letters: gradeLetters
    },
    attendance: {
      statusCounts: attendanceStatus,
      recentActivity: attendanceRecentActivity
    },
    systemUsage: {
      totals: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalSuperadmins,
        totalSubjects,
        activeSubjects,
        archivedSubjects
      },
      last30Days: {
        newStudents: newStudents30d,
        newTeachers: newTeachers30d,
        newSubjects: newSubjects30d,
        attendanceSessions: attendanceSessions30d
      }
    }
  });
});

const generateInviteCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Generate random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create and save invite
    const invite = new Invite({
      code,
      email,
      createdBy: req.user.id,
      expiresAt
    });
    
    await invite.save();
    
    // Send email
    const emailSubject = 'Your Invitation Code';
    const emailText = `Your one-time invite code is: ${code}\n\nThis code will expire in 30 days or after first use.`;
    
    await sendEmail(email, emailSubject, emailText);
    
    res.status(201).json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInvites = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const invites = await Invite.find()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('usedBy', 'name email');
    
    const count = await Invite.countDocuments();
    
    res.json({
      invites,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getUserById,
  deleteUser,
  createUser,
  updateUser,
  changePassword,
  getAnalyticsSummary,
  generateInviteCode,
  getInvites
};
