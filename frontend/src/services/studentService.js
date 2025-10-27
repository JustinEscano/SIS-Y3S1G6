// services/studentService.js (Fully refactored: Consistent logging, added token param, improved error objects)
import AppService from "../appService";

// 📋 Get all students
const getAllStudents = async (token) => {
  try {
    console.log('🔍 Fetching all students...');
    console.log('📡 URL:', '/students');
    const res = await AppService.get('/students', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching all students:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 👤 Get student by ID
const getStudentById = async (id, token) => {
  try {
    console.log('🔍 Fetching student by ID...');
    console.log('📡 URL:', `/students/${id}`);
    const res = await AppService.get(`/students/${id}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student by ID:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🔄 Update student
const updateStudent = async (id, updates, token) => {
  try {
    console.log('🔍 Updating student...');
    console.log('📡 URL:', `/students/${id}`);
    console.log('📦 Updates:', updates);
    const res = await AppService.put(`/students/${id}`, updates, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating student:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🗑️ Delete student
const deleteStudent = async (id, token) => {
  try {
    console.log('🔍 Deleting student...');
    console.log('📡 URL:', `/students/${id}`);
    const res = await AppService.delete(`/students/${id}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error deleting student:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const updateOwnProfile = async (payload) => {
  try {
    console.log('🔍 Updating current student profile...');
    console.log('📡 URL:', `/students/profile/me`);
    const res = await AppService.put('/students/profile/me', payload);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating current student profile:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const studentService = {
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  updateOwnProfile,
};

export default studentService;