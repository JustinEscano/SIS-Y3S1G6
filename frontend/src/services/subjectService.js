// services/subjectService.js (Updated: Added removeStudentFromSubject)
import AppService from "../appService";

// 📚 Get all subjects for the authenticated teacher
const getTeacherSubjects = async () => {
  try {
    console.log('🔍 Attempting to fetch teacher subjects...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + '/subjects');
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get("/subjects");
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch teacher subjects error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 📚 Get all subjects for the authenticated student
const getStudentSubjects = async () => {
  try {
    console.log('🔍 Attempting to fetch student subjects...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + '/subjects/student');
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get("/subjects/student");
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch student subjects error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// ➕ Create a new subject (for teachers)
const createSubject = async (payload) => {
  try {
    console.log('🔍 Attempting to create subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + '/subjects');
    console.log('📦 Payload:', payload);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.post("/subjects", payload);
    console.log('✅ Create successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Create subject error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 👥 Get students in a specific subject
const getSubjectStudents = async (subjectId) => {
  try {
    console.log('🔍 Attempting to fetch subject students...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/subjects/${subjectId}/students`);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get(`/subjects/${subjectId}/students`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch subject students error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// ➕ Add a single student to a subject
const addStudent = async (subjectId, payload) => {  // Fixed: payload instead of studentId
  try {
    console.log('🔍 Attempting to add student to subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/subjects/${subjectId}/students`);
    console.log('📦 Payload:', payload);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.post(`/subjects/${subjectId}/students`, payload);
    console.log('✅ Add successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Add student error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 🗑️ Remove a single student from a subject (with Grade deletion)
const removeStudentFromSubject = async (subjectId, studentId) => {
  try {
    console.log('🔍 Attempting to remove student from subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/subjects/${subjectId}/students/${studentId}`);
    console.log('🆔 Student ID:', studentId);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.delete(`/subjects/${subjectId}/students/${studentId}`);
    console.log('✅ Remove successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Remove student error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 🔄 Update a subject (e.g., add/remove students, edit details)
const updateSubject = async (subjectId, payload) => {
  try {
    console.log('🔍 Attempting to update subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/subjects/${subjectId}`);
    console.log('📦 Payload:', payload);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.put(`/subjects/${subjectId}`, payload);
    console.log('✅ Update successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Update subject error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

// 📚 Get a specific subject by ID
const getSubject = async (subjectId) => {
  try {
    console.log('🔍 Attempting to fetch subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/subjects/${subjectId}`);
    console.log('🔑 Token present:', !!localStorage.getItem('accessToken'));
    console.log('👤 Role:', localStorage.getItem('role'));

    const res = await AppService.get(`/subjects/${subjectId}`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch subject error:");
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Full config:', error.config);
    throw error;
  }
};

const subjectService = {
  getTeacherSubjects,
  getStudentSubjects,
  createSubject,
  getSubjectStudents,
  addStudent,
  removeStudentFromSubject, // New export
  updateSubject,
  getSubject,
};

export default subjectService;