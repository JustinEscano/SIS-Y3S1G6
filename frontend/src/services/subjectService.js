// services/subjectService.js (Fully refactored: Consistent token param, streamlined logging, fixed addStudent payload handling)
import AppService from "../appService";

// 📚 Get all subjects for the authenticated teacher
const getTeacherSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher subjects...');
    console.log('📡 URL:', '/subjects');
    const res = await AppService.get('/subjects', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching teacher subjects:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Get all subjects for the authenticated student
const getStudentSubjects = async (token) => {
  try {
    console.log('🔍 Fetching student subjects...');
    console.log('📡 URL:', '/subjects/student');
    const res = await AppService.get('/subjects/student', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student subjects:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// ➕ Create a new subject
const createSubject = async (payload, token) => {
  try {
    console.log('🔍 Creating subject...');
    console.log('📡 URL:', '/subjects');
    console.log('📦 Payload:', payload);
    const res = await AppService.post('/subjects', payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating subject:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 👥 Get students in a specific subject
const getSubjectStudents = async (subjectId, token) => {
  try {
    console.log('🔍 Fetching subject students...');
    console.log('📡 URL:', `/subjects/${subjectId}/students`);
    const res = await AppService.get(`/subjects/${subjectId}/students`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching subject students:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// ➕ Add a single student to a subject
const addStudent = async (subjectId, payload, token) => {
  try {
    console.log('🔍 Adding student to subject...');
    console.log('📡 URL:', `/subjects/${subjectId}/students`);
    console.log('📦 Payload:', payload);
    const res = await AppService.post(`/subjects/${subjectId}/students`, payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error adding student:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🗑️ Remove a single student from a subject
const removeStudentFromSubject = async (subjectId, studentId, token) => {
  try {
    console.log('🔍 Removing student from subject...');
    console.log('📡 URL:', `/subjects/${subjectId}/students/${studentId}`);
    const res = await AppService.delete(`/subjects/${subjectId}/students/${studentId}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error removing student:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🔄 Update a subject
const updateSubject = async (subjectId, payload, token) => {
  try {
    console.log('🔍 Updating subject...');
    console.log('📡 URL:', `/subjects/${subjectId}`);
    console.log('📦 Payload:', payload);
    const res = await AppService.put(`/subjects/${subjectId}`, payload, token);
    console.log('✅ Success:', res.status, res.data);
    console.log('Request payload:', payload); // Assuming 'payload' is your request body
    return res.data;
  } catch (error) {
    console.error("❌ Error updating subject:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Get a specific subject by ID
const getSubject = async (subjectId, token) => {
  try {
    console.log('🔍 Fetching subject...');
    console.log('📡 URL:', `/subjects/${subjectId}`);
    const res = await AppService.get(`/subjects/${subjectId}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching subject:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const getTeacherArchivedSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher archived subjects...');
    console.log('📡 URL:', '/subjects/archived/teacher');
    const res = await AppService.get('/subjects/archived/teacher', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching teacher archived subjects:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Get ARCHIVED subjects for the authenticated student
const getStudentArchivedSubjects = async (token) => {
  try {
    console.log('🔍 Fetching student archived subjects...');
    console.log('📡 URL:', '/subjects/archived/student');
    const res = await AppService.get('/subjects/archived/student', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student archived subjects:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const subjectService = {
  getTeacherSubjects,
  getStudentSubjects,
  createSubject,
  getSubjectStudents,
  addStudent,
  removeStudentFromSubject,
  updateSubject,
  getSubject,
  getTeacherArchivedSubjects,
  getStudentArchivedSubjects,
};

export default subjectService;