const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String }, // Explicitly optional
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students: { 
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
      default: [] // Ensures empty array if not provided
    },

    gradeLevel: { 
      type: Number, 
      required: true, 
      min: 7, 
      max: 12, 
      enum: [7, 8, 9, 10, 11, 12] // Align with Student.currentGradeLevel
    },
    academicYear: { 
      type: String, 
      required: true // FIXED: String for "2024-2025" format
    },

    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for performance and uniqueness
subjectSchema.index({ teacher: 1 }); // Quick teacher subjects
subjectSchema.index({ gradeLevel: 1, academicYear: 1 }); // Filter by level/year
subjectSchema.index({ name: 1, gradeLevel: 1, academicYear: 1 }, { unique: true }); // No duplicate subjects per level/year

// Optional: Static method for enrolling students (helps avoid array bloat)
subjectSchema.statics.enrollStudent = async function(subjectId, studentId) {
  // Step 1: Fetch the target subject
  const subject = await this.findById(subjectId);
  if (!subject) {
    throw new Error('Subject not found');
  }

  // Step 2: Check for conflicts: Prevent enrollment if student is already in another ACTIVE subject with the same name
  const existingConflicts = await this.find({
    _id: { $ne: subjectId }, // Exclude this subject
    name: subject.name,       // Same name
    archived: false,          // Only active subjects conflict
    students: studentId       // Student already enrolled
  });

  if (existingConflicts.length > 0) {
    const conflictNames = existingConflicts.map(s => `${s.name} (Grade ${s.gradeLevel}, ${s.academicYear})`).join(', ');
    throw new Error(`Student is already enrolled in an active ${subject.name} class: ${conflictNames}. Archive the existing class first or choose a different subject.`);
  }

  // Step 3: Enroll if no conflict (uses $addToSet to prevent intra-array dups)
  const updatedSubject = await this.findByIdAndUpdate(
    subjectId,
    { $addToSet: { students: studentId } }, // Adds if not exists
    { new: true }
  ).populate('students');

  return updatedSubject;
};

subjectSchema.statics.unenrollStudent = async function(subjectId, studentId) {
  return this.findByIdAndUpdate(
    subjectId,
    { $pull: { students: studentId } },
    { new: true }
  ).populate('students');
};

module.exports = mongoose.model('Subject', subjectSchema);