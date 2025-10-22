// controllers/studentController.js (Updated: Removed register and login functions)
const Student = require('../models/Student');

// Get all students (admin/teacher only; add auth middleware in production)
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select('-password'); // Exclude passwords
    res.status(200).json({ 
      success: true, 
      count: students.length,
      students 
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error fetching students' });
  }
};

// Get student by ID
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error fetching student' });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const updates = req.body;
    // Skip password hashing since auth is handled elsewhere; assume updates don't include password

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Server error updating student' });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ success: true, message: 'Student deleted' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error deleting student' });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};