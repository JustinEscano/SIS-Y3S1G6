const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },

    // Core student-specific fields (no grade levels or progression—derive from enrolled subjects)
    section: { type: String },
    currentGradeLevel: { type: Number, min: 7, max: 12, default: null },
    lrn: { type: String, unique: true, sparse: true }, // Learner Reference Number
    parentName: { type: String },

    // Optional: Enrollment history (for "past classes" view, like Google Classroom)
    enrolledClasses: [{
      subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
      joinedAt: { type: Date, default: Date.now },
      academicYear: { type: String }, // e.g., "2025-2026"
      status: { type: String, enum: ['active', 'archived'], default: 'active' },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
  },
  { timestamps: true }
);

// Indexes for queries
studentSchema.index({ lrn: 1 });
studentSchema.index({ 'enrolledClasses.subject': 1 });
studentSchema.index({ 'enrolledClasses.academicYear': 1 });

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Virtual: All historical grades across classes (populate for "view past gradings")
studentSchema.virtual('allGrades', {
  ref: 'Grade',
  localField: '_id',
  foreignField: 'student',
  options: { 
    sort: { createdAt: -1 }, // Recent first
    populate: { path: 'subject', select: 'name gradeLevel academicYear' } // Include class context
  }
});

// ✅ Fix: Instance method for password comparison
studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// NEW: Instance method to dynamically calculate current grade level
studentSchema.methods.getCurrentGradeLevel = async function() {
  // Use mongoose.model to avoid circular dependency
  const Subject = mongoose.model('Subject'); 
  
  try {
    // Find all active subjects this student is in
    const activeSubjects = await Subject.find({
      students: this._id,  // 'this._id' is the student's ID
      archived: false
    })
    .select('gradeLevel') // Only get the gradeLevel field
    .sort({ gradeLevel: -1 }) // Sort descending (12, 11, 10...)
    .limit(1); // We only need the highest one

    if (activeSubjects.length === 0) {
      return null; // No active subjects, no current grade level
    }
    
    return activeSubjects[0].gradeLevel; // Return the highest grade level
  } catch (error) {
    console.error(`Error fetching current grade level for student ${this._id}:`, error);
    return null;
  }
};

// Remove if schema.index({ lrn: 1 }) exists elsewhere to fix duplicate warning
// studentSchema.index({ lrn: 1 });

module.exports = mongoose.model('Student', studentSchema);

// Ensure virtuals are included in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', studentSchema);