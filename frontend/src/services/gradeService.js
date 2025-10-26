// services/gradeService.js (Fully refactored: Removed duplicates, consistent error handling/logging, added token param where needed, polished stubs)
import AppService from "../appService";

// 📚 Get grades for a specific subject
const getSubjectGrades = async (subjectId, token) => {
  try {
    console.log('🔍 Fetching subject grades...');
    console.log('📡 URL:', `/grades/subjects/${subjectId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching subject grades:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Get grades for a specific student in a subject
const getStudentSubjectGrades = async (subjectId, studentId, token) => {
  try {
    console.log('🔍 Fetching student subject grades...');
    console.log('📡 URL:', `/grades/subjects/${subjectId}/students/${studentId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}/students/${studentId}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student subject grades:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// ➕ Update student grade (quarters/comments)
const updateStudentGrade = async (subjectId, studentId, payload, token) => {
  try {
    console.log('🔍 Updating student grade...');
    console.log('📡 URL:', `/grades/subjects/${subjectId}/students/${studentId}`);
    console.log('📦 Payload:', payload);
    const res = await AppService.put(`/grades/subjects/${subjectId}/students/${studentId}`, payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating student grade:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// Stub for comments (merged with updateStudentGrade)
const updateStudentComments = async (subjectId, studentId, payload, token) => {
  return updateStudentGrade(subjectId, studentId, { comments: payload }, token);
};

// 🔄 Update a general grade
const updateGrade = async (gradeId, payload, token) => {
  try {
    console.log('🔍 Updating grade...');
    console.log('📡 URL:', `/grades/${gradeId}`);
    console.log('📦 Payload:', payload);
    const res = await AppService.put(`/grades/${gradeId}`, payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating grade:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📤 Export grades (returns blob for download)
const exportGrades = async (subjectId, studentId = null, token) => {
  try {
    console.log('🔍 Exporting grades...');
    let url = `/grades/subjects/${subjectId}/export`;
    if (studentId) url += `?studentId=${studentId}`;
    console.log('📡 URL:', url);
    const res = await AppService.get(url, token, { responseType: 'blob' });
    console.log('✅ Export success');
    return res.data;
  } catch (error) {
    console.error("❌ Error exporting grades:", {
      status: error.response?.status,
      message: error.message
    });
    throw error;
  }
};

// 📥 Import grades from file
const importGrades = async (subjectId, file, token) => {
  try {
    console.log('🔍 Importing grades...');
    console.log('📡 URL:', `/grades/subjects/${subjectId}/import`);
    const formData = new FormData();
    formData.append('file', file);
    const res = await AppService.post(`/grades/subjects/${subjectId}/import`, formData, token, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ Import success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error importing grades:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const gradeService = {
  getSubjectGrades,
  getStudentSubjectGrades,
  updateGrade,
  updateStudentGrade,
  updateStudentComments,
  exportGrades,
  importGrades,
};

export default gradeService;