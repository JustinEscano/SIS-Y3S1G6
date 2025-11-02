// src/services/gradeService.js
import AppService from "../appService";

// Helper to build auth config
const buildAuthConfig = (token, extraConfig = {}) => ({
  headers: { Authorization: `Bearer ${token}` },
  ...extraConfig
});

// 📚 Get grades for a specific subject
const getSubjectGrades = async (subjectId, token) => {
  try {
    console.log('🔍 Fetching subject grades...');
    console.log('📡 URL:', `/grades/subjects/${subjectId}`);
    const res = await AppService.get(`/grades/subjects/${subjectId}`, buildAuthConfig(token));
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
    const res = await AppService.get(`/grades/subjects/${subjectId}/students/${studentId}`, buildAuthConfig(token));
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
    const dataToSend = typeof payload === 'object' && payload !== null ? payload : {};
    const res = await AppService.put(`/grades/subjects/${subjectId}/students/${studentId}`, dataToSend, buildAuthConfig(token));
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

// Stub for comments
const updateStudentComments = async (subjectId, studentId, payload, token) => {
  const commentPayload = { comments: Array.isArray(payload) ? payload : [] };
  return updateStudentGrade(subjectId, studentId, commentPayload, token);
};

// 🔄 Update a general grade
const updateGrade = async (gradeId, payload, token) => {
  try {
    console.log('🔍 Updating grade...');
    console.log('📡 URL:', `/grades/${gradeId}`);
    console.log('📦 Payload:', payload);
    const dataToSend = typeof payload === 'object' && payload !== null ? payload : {};
    const res = await AppService.put(`/grades/${gradeId}`, dataToSend, buildAuthConfig(token));
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

// 📤 Export grades
const exportGrades = async (subjectId, studentId = null, token) => {
  try {
    console.log('🔍 Exporting grades...');
    let url = `/grades/subjects/${subjectId}/export`;
    if (studentId) url += `?studentId=${studentId}`;
    console.log('📡 URL:', url);
    const res = await AppService.get(url, {
      ...buildAuthConfig(token),
      responseType: 'blob'
    });
    console.log('✅ Export success');
    return res.data;
  } catch (error) {
    console.error("❌ Error exporting grades:", {
      status: error.response?.status,
      message: error.message
    });
    if (error.response && error.response.data instanceof Blob && error.response.data.type === "application/json") {
      const errJson = JSON.parse(await error.response.data.text());
      console.error("❌ Export error details:", errJson);
      throw new Error(errJson.message || 'Export failed');
    }
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
    const res = await AppService.post(`/grades/subjects/${subjectId}/import`, formData, {
      ...buildAuthConfig(token),
      'Content-Type': 'multipart/form-data'
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

// 📈 Get student grade progress report across years - CRITICAL FIX
const getStudentGradeProgress = async (studentId, token) => {
  try {
    console.log('🔍 Fetching student grade progress...');
    console.log('📡 URL:', `/grades/student/${studentId}/progress`);
    const res = await AppService.get(`/grades/student/${studentId}/progress`, buildAuthConfig(token));
    console.log('✅ Success fetching grade progress:', res.status);
    console.log('📊 Progress data structure:', {
      hasData: !!res.data,
      hasSuccess: res.data?.success,
      dataType: typeof res.data?.data,
      isArray: Array.isArray(res.data?.data),
      fullResponse: res.data
    });
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student grade progress:", {
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
  getStudentGradeProgress,
};

export default gradeService;