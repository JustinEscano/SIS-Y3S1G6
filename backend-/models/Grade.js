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

// FIXED: Static method for progress comparison (restructured pipeline to avoid self-reference errors; works with String academicYear)
gradeSchema.statics.getProgressReport = async function(studentId, subjectId = null) {
  const match = { student: studentId };
  if (subjectId) match.subject = subjectId;

  const pipeline = [
    { $match: match },
    { $sort: { subject: 1, academicYear: 1 } }, // FIXED: String sort OK ("2023-2024" < "2024-2025")
    { $group: {
        _id: '$subject',
        grades: { $push: {
          academicYear: '$academicYear', // String
          finalGrade: '$finalGrade',
          letterGrade: '$letterGrade'
        }}
      }
    },
    { $addFields: {
        progress: {
          $map: {
            input: '$grades',
            as: 'g',
            in: {
              $mergeObjects: [
                '$$g',
                {
                  delta: {
                    $cond: {
                      if: { $eq: [{ $indexOfArray: ['$grades.academicYear', '$$g.academicYear'] }, 0] },
                      then: null,
                      else: {
                        $subtract: [
                          '$$g.finalGrade', // Numbers only for math
                          { $arrayElemAt: [
                            '$grades.finalGrade',
                            { $subtract: [{ $indexOfArray: ['$grades.academicYear', '$$g.academicYear'] }, 1] }
                          ]}
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    { $project: { _id: 0, subject: '$_id', progress: 1 } }
  ];

  const results = await this.aggregate(pipeline);
  return results; // e.g., [{ subject: ID, progress: [{ year: "2024", grade: 85, delta: null }, { year: "2025", grade: 90, delta: 5 }] }]
};

module.exports = mongoose.model('Grade', gradeSchema);