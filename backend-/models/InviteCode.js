const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 12,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'teacher', 'superadmin'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    usedByRole: {
      type: String,
      enum: ['student', 'teacher', 'superadmin'],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
