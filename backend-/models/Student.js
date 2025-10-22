// models/Student.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },

    // Extra student-specific fields
    gradeLevel: { type: Number },
    section: { type: String },
    lrn: { type: String, unique: true, sparse: true }, // Learner Reference Number
    parentName: { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Student', studentSchema);
