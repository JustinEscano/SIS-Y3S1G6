// server.js (Full refactored version - incorporating student routes)
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
app.use('/api/grades', gradeRoutes)

// ⚠️ Global error handler
app.use(errorHandler);

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));