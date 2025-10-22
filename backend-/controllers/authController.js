const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');

// ---------------- TOKEN GENERATORS ----------------
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  });

// ---------------- REGISTER (ALL ROLES) ----------------
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, inviteCode, subjects } = req.body;

    let role;
    if (inviteCode === process.env.STUDENT_INVITE_CODE) role = 'student';
    else if (inviteCode === process.env.TEACHER_INVITE_CODE) role = 'teacher';
    else if (inviteCode === process.env.SUPERADMIN_INVITE_CODE) role = 'superadmin';
    else return res.status(403).json({ message: 'Invalid invite code' });

    const existing =
      role === 'student'
        ? await Student.findOne({ email })
        : await User.findOne({ email });

    if (existing)
      return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    let user;

    if (role === 'student') {
      user = new Student({ name, email, password: hashed });
    } else {
      user = new User({ name, email, password: hashed, role, subjects });
    }

    await user.save();

    res
      .status(201)
      .json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully` });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGIN ----------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('🔑 Login attempt for email:', email); // Debug: Track login starts

    let user = await Student.findOne({ email });
    let role = 'student';

    if (!user) {
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
      role = user.role;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Wrong password' });

    const token = generateAccessToken(user._id, role);
    const refreshToken = generateRefreshToken(user._id, role);

    console.log('✅ Login success - Generated tokens for', role, 'ID:', user._id.toString(), // Debug: Confirm token generation
      '- Access exp:', new Date(Date.now() + (process.env.ACCESS_TOKEN_EXPIRY || '15m')), // Rough exp calc
      '- Refresh exp:', new Date(Date.now() + (process.env.REFRESH_TOKEN_EXPIRY || '7d'))); // Debug: Expiry preview

    res.json({ token, refreshToken, role });
  } catch (err) {
    next(err);
  }
};

// ---------------- REFRESH TOKEN ----------------
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: 'Missing refresh token' });

  console.log('🔄 Refresh request received - Token preview:', refreshToken.substring(0, 20) + '...'); // Debug: Confirm incoming refresh

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log('✅ Refresh verify success for ID:', decoded.id, 'role:', decoded.role); // Debug: Valid refresh details

    const newAccessToken = generateAccessToken(decoded.id, decoded.role);
    console.log('🔄 Generated new access token for refresh - Exp:', new Date(Date.now() + (process.env.ACCESS_TOKEN_EXPIRY || '15m'))); // Debug: New token exp

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('❌ Refresh token verification failed:', err.name, '-', err.message, // Enhanced: Specific error type (e.g., TokenExpiredError)
      '- Token preview:', refreshToken.substring(0, 20) + '...'); // Debug: Which token failed
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};