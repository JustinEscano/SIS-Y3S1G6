const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Generates JWT tokens for access/refresh.
 * @param {Object} payload - { id, role }
 * @param {boolean} isRefresh - True for refresh token (7d exp, optional fallback secret)
 * @returns {string} Signed JWT
 */
const generateToken = (payload, isRefresh = false) => {
  const secret = isRefresh 
    ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) 
    : process.env.JWT_SECRET;
  const expiresIn = isRefresh ? '7d' : '15m';
  if (!secret) {
    throw new Error('JWT_SECRET missing'); // Fail fast in dev
  }
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Fetches user by email from Student or User model, with password.
 * @param {string} email - Normalized email
 * @returns {Object|null} User doc or null
 */
const fetchUserByEmail = async (email) => {
  let user = await Student.findOne({ email }).select('+password');
  if (user) return { user, role: 'student' };

  user = await User.findOne({ email }).select('+password');
  if (user) return { user, role: user.role }; // Use actual role from user document (teacher or superadmin)

  return null;
};

/**
 * Register handler: Creates new student or teacher account.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, inviteCode, section, lrn, parentName, department } = req.body;

  // Validation
  if (!name || !email || !password || !inviteCode) {
    console.warn('🚫 Invalid registration payload:', { name, email, hasInviteCode: !!inviteCode });
    return res.status(400).json({ message: 'Name, email, password, and invite code are required' });
  }

  // Determine role based on invite code
  let role;
  if (inviteCode === process.env.STUDENT_INVITE_CODE) {
    role = 'student';
  } else if (inviteCode === process.env.TEACHER_INVITE_CODE) {
    role = 'teacher';
  } else if (inviteCode === process.env.SUPERADMIN_INVITE_CODE) {
    role = 'superadmin';
  } else {
    console.warn('🚫 Invalid invite code provided');
    return res.status(400).json({ message: 'Invalid invite code' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log(`📝 Registration attempt for email: ${normalizedEmail}, role: ${role}`);

  // Check if user already exists
  const existingStudent = await Student.findOne({ email: normalizedEmail });
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingStudent || existingUser) {
    console.warn(`🚫 Email already registered: ${normalizedEmail}`);
    return res.status(409).json({ message: 'Email already registered' });
  }

  try {
    let newUser;

    if (role === 'student') {
      // Create student account
      newUser = await Student.create({
        name,
        email: normalizedEmail,
        password,
        role: 'student',
        section,
        lrn,
        parentName
      });
      console.log(`✅ Student created: ID ${newUser._id}, email: ${normalizedEmail}`);
    } else {
      // Create teacher or superadmin account
      newUser = await User.create({
        name,
        email: normalizedEmail,
        password,
        role, // 'teacher' or 'superadmin'
        department
      });
      console.log(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} created: ID ${newUser._id}, email: ${normalizedEmail}`);
    }

    // Generate tokens
    const payload = { id: newUser._id, role };
    const accessToken = generateToken(payload, false);
    const refreshToken = generateToken(payload, true);

    console.log(`✅ Registration success - Generated tokens for ${role} ID: ${newUser._id}`);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        role,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

/**
 * Login handler: Validates creds, generates tokens.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ✅ Validation: Early fail on missing/invalid input
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    console.warn('🚫 Invalid login payload:', { email, hasPassword: !!password });
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log(`🔑 Login attempt for email: ${normalizedEmail}`);

  // Env check (optional, for debug)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Env check:', { 
      secret: !!process.env.JWT_SECRET, 
      refreshSecret: !!process.env.JWT_REFRESH_SECRET 
    });
  }

  // Fetch user
  const userData = await fetchUserByEmail(normalizedEmail);
  if (!userData) {
    console.warn(`🚫 No user found for email: ${normalizedEmail}`);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const { user, role } = userData;
  console.log(`🔍 ${role.charAt(0).toUpperCase() + role.slice(1)} lookup for ${normalizedEmail}: Found`);

  // Password check
  const pwMatch = await user.matchPassword(password);
  if (!pwMatch) {
    console.warn(`🚫 Password mismatch for ${role} ID: ${user._id}`);
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  console.log(`🔍 Password match: Success for ${role} ID: ${user._id}`);

  const payload = { id: user._id, role };

  const accessToken = generateToken(payload, false);
  const refreshToken = generateToken(payload, true);

  // Exp logging
  const accessExpMs = 15 * 60 * 1000;
  const refreshExpMs = 7 * 24 * 60 * 60 * 1000;
  const accessExp = new Date(Date.now() + accessExpMs).toISOString();
  const refreshExp = new Date(Date.now() + refreshExpMs).toISOString();
  console.log(`✅ Login success - Generated tokens for ${role} ID: ${user._id} - Access exp: ${accessExp} - Refresh exp: ${refreshExp}`);

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { 
      id: user._id, 
      role,
      email: user.email,
      name: user.name // Assuming field exists; add if needed
    }
  });
});

/**
 * Refresh handler: Validates refresh token, issues new pair.
 */
const refreshTokenHandler = asyncHandler(async (req, res) => {
  let incomingRefreshToken = req.body.refreshToken || req.headers.authorization?.split(' ')[1];

  if (!incomingRefreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    console.log('🔄 Refresh request received - Token preview:', incomingRefreshToken.substring(0, 20) + '...');

    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    console.log(`🔍 Refresh token decoded: ID ${decoded.id}, role ${decoded.role}`);

    const UserModel = decoded.role === 'student' ? Student : User;
    const user = await UserModel.findById(decoded.id).select('-password');

    if (!user) {
      console.warn(`🚫 User not found for refresh ID: ${decoded.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const payload = { id: user._id, role: decoded.role };

    const newAccessToken = generateToken(payload, false);
    const newRefreshToken = generateToken(payload, true);

    const accessExpMs = 15 * 60 * 1000;
    const accessExp = new Date(Date.now() + accessExpMs).toISOString();
    console.log(`🔄 Generated new access token for refresh - Exp: ${accessExp}`);
    console.log(`✅ Refresh verify success for ID: ${decoded.id} role: ${decoded.role}`);

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { 
        id: user._id, 
        role: decoded.role 
      }
    });
  } catch (err) {
    console.error('❌ Refresh verification failed:', { 
      message: err.message, 
      name: err.name,
      tokenPreview: incomingRefreshToken.substring(0, 20) + '...' 
    });
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

module.exports = { register, login, refreshToken: refreshTokenHandler };