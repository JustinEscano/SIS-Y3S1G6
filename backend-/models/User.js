const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['teacher', 'superadmin'],
      required: true,
    },
    subjects: [{ type: String }], // optional for teachers or admins
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
