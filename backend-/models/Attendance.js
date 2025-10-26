const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Tardy'], 
    required: true 
  },
  notes: { type: String },
}, { timestamps: true });

// Unique index to prevent duplicate entries for the same student, subject, and date
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

// NEW: Additional index for range queries (e.g., by student and date range)
attendanceSchema.index({ student: 1, date: 1 });

// Optional: Method to compute attendance rate for a student/subject over a period
attendanceSchema.statics.calculateAttendanceRate = async function(studentId, subjectId, startDate, endDate) {
  const totalDays = await this.countDocuments({ 
    student: studentId, 
    subject: subjectId, 
    date: { $gte: startDate, $lte: endDate } 
  });
  const presentDays = await this.countDocuments({ 
    student: studentId, 
    subject: subjectId, 
    date: { $gte: startDate, $lte: endDate }, 
    status: 'Present' 
  });
  return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
};

module.exports = mongoose.model('Attendance', attendanceSchema);