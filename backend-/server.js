// server.js (Full refactored version - incorporating student routes and attendance)
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load .env early
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const studentRoutes = require('./routes/studentRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes'); // FIXED: Added missing attendance routes
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const notificationRoutes = require('./routes/notificationRoutes')

const app = express();

// 🧩 Middleware
app.use(cors());
app.use(express.json());

// 🗄️ Connect to MongoDB
connectDB();

// 🧭 Health check route
app.get('/', (req, res) => res.send('✅ API is running...'));

// 🧩 Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes)

// ⚠️ Global error handler
app.use(errorHandler);

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));