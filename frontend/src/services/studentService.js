// services/studentService.js (Updated: Removed registerStudent and loginStudent functions)
import AppService from "../appService";

// 📋 Get all students
const getAllStudents = async () => {
  try {
    console.log('🔍 Attempting to fetch all students...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + '/students');
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get("/students");
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch all students error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 👤 Get student by ID
const getStudentById = async (id) => {
  try {
    console.log('🔍 Attempting to fetch student by ID...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/students/${id}`);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get(`/students/${id}`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch student by ID error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 🔄 Update student
const updateStudent = async (id, updates) => {
  try {
    console.log('🔍 Attempting to update student...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/students/${id}`);
    console.log('📦 Updates:', updates);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.put(`/students/${id}`, updates);
    console.log('✅ Update successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Update student error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 🗑️ Delete student
const deleteStudent = async (id) => {
  try {
    console.log('🔍 Attempting to delete student...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/students/${id}`);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.delete(`/students/${id}`);
    console.log('✅ Delete successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Delete student error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

const studentService = {
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};

export default studentService;