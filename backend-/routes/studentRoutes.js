// routes/studentRoutes.js (Updated: Removed register and login routes)
const express = require('express');
const router = express.Router();
const { 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent 
} = require('../controllers/studentController');

// GET /api/students - Get all students (this fixes your 404!)
router.get('', getAllStudents);

// GET /api/students/:id
router.get('/:id', getStudentById);

// PUT /api/students/:id
router.put('/:id', updateStudent);

// DELETE /api/students/:id
router.delete('/:id', deleteStudent);

module.exports = router;