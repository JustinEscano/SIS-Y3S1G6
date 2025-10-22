// models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    gradeLevel: { type: Number, required: true },
    schoolYear: { type: String, required: true },

    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
