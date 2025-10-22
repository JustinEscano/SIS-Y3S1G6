// services/gradeService.js (Updated: Fix getStudentGrades to use correct endpoint /grades/subjects/:subjectId/students/:studentId)
import AppService from "../appService";

// 📚 Get grades for a specific subject
const getSubjectGrades = async (subjectId, token) => {
  try {
    console.log('🔍 Attempting to fetch subject grades...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/grades/subjects/${subjectId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch subject grades error:", error.response?.status, error.response?.data, error.message);
    throw error;
  }
};

// 📚 Get grades for a specific student in a subject (renamed to match frontend)
const getStudentSubjectGrades = async (subjectId, studentId, token) => {
  try {
    console.log('🔍 Attempting to fetch student grades for subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/grades/subjects/${subjectId}/students/${studentId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}/students/${studentId}`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch student grades error:", error.response?.status, error.response?.data, error.message);
    throw error;
  }
};

// 📚 Get grades for a specific student in a subject
const getStudentGrades = async (subjectId, studentId, token) => {
  try {
    console.log('🔍 Attempting to fetch student grades for subject...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/grades/subjects/${subjectId}/students/${studentId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}/students/${studentId}`);
    console.log('✅ Fetch successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Fetch student grades error:", error.response?.status, error.response?.data, error.message);
    throw error;
  }
};

// ➕ Update student grade (quarters/comments)
const updateStudentGrade = async (subjectId, studentId, payload, token) => {
  try {
    console.log('🔍 Attempting to update student grade...');
    console.log('📡 Request URL:', AppService.defaults.baseURL + `/grades/subjects/${subjectId}/students/${studentId}`);
    console.log('📦 Payload:', payload);
    const res = await AppService.put(`/grades/subjects/${subjectId}/students/${studentId}`, payload);
    console.log('✅ Update successful:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Update student grade error:", error.response?.status, error.response?.data, error.message);
    throw error;
  }
};

// Stub for comments (can merge with updateStudentGrade)
const updateStudentComments = async (subjectId, studentId, payload, token) => {
  return updateStudentGrade(subjectId, studentId, payload, token);
};

// Existing stubs
const updateGrade = async (gradeId, payload, token) => {
  // Implementation
};

const exportGrades = async (subjectId, token) => {
  // Implementation (return blob)
};

const importGrades = async (subjectId, file, token) => {
  // Implementation
};

const gradeService = {
  getStudentSubjectGrades,
  getSubjectGrades,
  getStudentGrades,
  updateGrade,
  updateStudentGrade,
  updateStudentComments,
  exportGrades,
  importGrades,
};

export default gradeService;