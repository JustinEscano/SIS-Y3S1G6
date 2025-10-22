// models/Grade.js
const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

    quarterGrades: {
      q1: { type: Number, min: 0, max: 100 },
      q2: { type: Number, min: 0, max: 100 },
      q3: { type: Number, min: 0, max: 100 },
      q4: { type: Number, min: 0, max: 100 },
    },

    semesterGrades: {
      sem1: { type: Number },
      sem2: { type: Number },
    },

    finalGrade: { type: Number },
    letterGrade: { 
      type: String, 
      enum: ['A', 'B', 'C', 'D', 'F'] 
    },
    remarks: {
      type: String,
      enum: ['Passed', 'Failed', 'Incomplete'],
      default: 'Incomplete',
    },

    viewMode: {
      type: String,
      enum: ['sem1', 'sem2', 'all'],
      default: 'all',
    },

    // Add to gradeSchema
    comments: [{
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      title: { type: String, required: true },
      content: { type: String, required: true },
      author: { type: String, required: true }, // e.g., teacher name
      timestamp: { type: Date, default: Date.now }
    }],

// In pre-save or separate method, no changes needed
  },
  { timestamps: true }
);

// Add unique index to enforce one grade per student-subject pair
gradeSchema.index({ subject: 1, student: 1 }, { unique: true });

gradeSchema.pre('save', function (next) {
  const { q1, q2, q3, q4 } = this.quarterGrades;

  // Semesters with rounding
  if (q1 != null && q2 != null) {
    this.semesterGrades.sem1 = Math.round(((q1 + q2) / 2) * 100) / 100;
  }
  if (q3 != null && q4 != null) {
    this.semesterGrades.sem2 = Math.round(((q3 + q4) / 2) * 100) / 100;
  }

  // Final
  const { sem1, sem2 } = this.semesterGrades;
  if (sem1 != null && sem2 != null) {
    this.finalGrade = Math.round(((sem1 + sem2) / 2) * 100) / 100;
  }

  // Letters & remarks (only if final computed)
  if (this.finalGrade != null) {
    const g = this.finalGrade;
    if (g >= 90) this.letterGrade = 'A';
    else if (g >= 85) this.letterGrade = 'B';
    else if (g >= 80) this.letterGrade = 'C';
    else if (g >= 75) this.letterGrade = 'D';
    else this.letterGrade = 'F';
    this.remarks = g >= 75 ? 'Passed' : 'Failed';
  }

  next();
});

module.exports = mongoose.model('Grade', gradeSchema);