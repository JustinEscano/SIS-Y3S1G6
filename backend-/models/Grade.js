const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

    quarterGrades: {
      q1: {
        cs: { type: Number, min: 0, max: 100 },
        exam: { type: Number, min: 0, max: 100 },
        total: { type: Number, min: 0, max: 100 } // Computed as (cs + exam) / 2
      },
      q2: {
        cs: { type: Number, min: 0, max: 100 },
        exam: { type: Number, min: 0, max: 100 },
        total: { type: Number, min: 0, max: 100 }
      },
      q3: {
        cs: { type: Number, min: 0, max: 100 },
        exam: { type: Number, min: 0, max: 100 },
        total: { type: Number, min: 0, max: 100 }
      },
      q4: {
        cs: { type: Number, min: 0, max: 100 },
        exam: { type: Number, min: 0, max: 100 },
        total: { type: Number, min: 0, max: 100 }
      },
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

    // Add to gradeSchema (removed explicit _id; Mongoose auto-generates)
    comments: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
      author: { type: String, required: true }, // e.g., teacher name
      timestamp: { type: Date, default: Date.now }
    }],

    // Added for progression tracking
    academicYear: { type: String, required: true }, // FIXED: String "2024-2025" to sync with Subject
  },
  { timestamps: true }
);

// Add unique index to enforce one grade per student-subject pair (now includes academicYear for yearly uniqueness)
gradeSchema.index({ subject: 1, student: 1, academicYear: 1 }, { unique: true });

// NEW: Additional indexes for performance
gradeSchema.index({ student: 1, academicYear: 1 });

gradeSchema.pre('save', function (next) {  // Removed 'async' as no awaits; add back if integrating attendance
  // Compute quarter totals
  const quarters = ['q1', 'q2', 'q3', 'q4'];
  quarters.forEach(q => {
    const quarter = this.quarterGrades[q];
    if (quarter.cs != null && quarter.exam != null) {
      quarter.total = Math.round(((quarter.cs + quarter.exam) / 2) * 100) / 100;
    }
  });

  const { q1, q2, q3, q4 } = this.quarterGrades;

  // Semesters with rounding (using totals)
  if (q1?.total != null && q2?.total != null) {
    this.semesterGrades.sem1 = Math.round(((q1.total + q2.total) / 2) * 100) / 100;
  }
  if (q3?.total != null && q4?.total != null) {
    this.semesterGrades.sem2 = Math.round(((q3.total + q4.total) / 2) * 100) / 100;
  }

  const quarterTotals = [q1?.total, q2?.total, q3?.total, q4?.total].filter((val) => val != null);
  if (quarterTotals.length > 0) {
    const avg = quarterTotals.reduce((sum, val) => sum + val, 0) / quarterTotals.length;
    this.finalGrade = Math.round(avg * 10) / 10;
  } else {
    const { sem1, sem2 } = this.semesterGrades;
    if (sem1 != null && sem2 != null) {
      this.finalGrade = Math.round(((sem1 + sem2) / 2) * 100) / 100;
    }
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

// FIXED: Static method for progress comparison (restructured pipeline to avoid self-reference errors; works with String academicYear)
gradeSchema.statics.getProgressReport = async function(studentId, subjectId = null) {
  const match = { student: new mongoose.Types.ObjectId(studentId) };
  if (subjectId) {
    match.subject = new mongoose.Types.ObjectId(subjectId);
  }

  const pipeline = [
    { $match: match },
    { $sort: { subject: 1, academicYear: 1 } },
    {
      $group: {
        _id: '$subject',
        grades: {
          $push: {
            academicYear: '$academicYear',
            finalGrade: '$finalGrade',
            letterGrade: '$letterGrade',
            quarterTotals: {
              q1: '$quarterGrades.q1.total',
              q2: '$quarterGrades.q2.total',
              q3: '$quarterGrades.q3.total',
              q4: '$quarterGrades.q4.total'
            }
          }
        }
      }
    },
    { $project: { _id: 0, subject: '$_id', grades: 1 } }
  ];

  const aggregates = await this.aggregate(pipeline);

  const computeLetter = (grade) => {
    if (grade == null) return null;
    if (grade >= 90) return 'A';
    if (grade >= 85) return 'B';
    if (grade >= 80) return 'C';
    if (grade >= 75) return 'D';
    return 'F';
  };

  return aggregates.map((item) => {
    const progress = [];
    let previousFinal = null;

    item.grades.forEach((entry) => {
      const quartersRaw = entry.quarterTotals || {};
      const quarterTotals = {
        q1: quartersRaw.q1 != null ? Number(quartersRaw.q1.toFixed ? quartersRaw.q1.toFixed(1) : quartersRaw.q1) : (typeof quartersRaw.q1 === 'number' ? Number(quartersRaw.q1.toFixed(1)) : null),
        q2: quartersRaw.q2 != null ? Number(quartersRaw.q2.toFixed ? quartersRaw.q2.toFixed(1) : quartersRaw.q2) : (typeof quartersRaw.q2 === 'number' ? Number(quartersRaw.q2.toFixed(1)) : null),
        q3: quartersRaw.q3 != null ? Number(quartersRaw.q3.toFixed ? quartersRaw.q3.toFixed(1) : quartersRaw.q3) : (typeof quartersRaw.q3 === 'number' ? Number(quartersRaw.q3.toFixed(1)) : null),
        q4: quartersRaw.q4 != null ? Number(quartersRaw.q4.toFixed ? quartersRaw.q4.toFixed(1) : quartersRaw.q4) : (typeof quartersRaw.q4 === 'number' ? Number(quartersRaw.q4.toFixed(1)) : null),
      };

      const quarterValues = Object.values(quarterTotals).filter((val) => typeof val === 'number' && !Number.isNaN(val));
      let final = typeof entry.finalGrade === 'number' ? entry.finalGrade : null;
      if (final == null && quarterValues.length > 0) {
        const avg = quarterValues.reduce((sum, val) => sum + val, 0) / quarterValues.length;
        final = Math.round(avg * 10) / 10;
      }
      const finalRounded = final != null ? Number(final.toFixed(1)) : null;

      let delta = null;
      if (finalRounded != null && previousFinal != null) {
        delta = Number((finalRounded - previousFinal).toFixed(1));
      }

      const letter = entry.letterGrade || computeLetter(finalRounded);

      progress.push({
        academicYear: entry.academicYear,
        finalGrade: finalRounded,
        letterGrade: letter,
        quarterTotals,
        delta,
      });

      if (finalRounded != null) {
        previousFinal = finalRounded;
      }
    });

    return {
      subject: item.subject,
      progress,
    };
  });
};

module.exports = mongoose.model('Grade', gradeSchema);