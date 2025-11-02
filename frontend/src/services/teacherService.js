// services/teacherService.js
import AppService from "../appService";

// 📋 Get teacher profile
const getProfile = async (token) => {
  try {
    console.log('🔍 Fetching teacher profile...');
    console.log('📡 URL:', '/teacher/profile');
    const res = await AppService.get('/teacher/profile', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching teacher profile:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🔄 Update teacher profile
const updateProfile = async (payload, token) => {
  try {
    console.log('🔍 Updating teacher profile...');
    console.log('📡 URL:', '/teacher/profile');
    console.log('📦 Payload:', payload);
    const res = await AppService.put('/teacher/profile', payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating teacher profile:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🔐 Change password
const changePassword = async (payload, token) => {
  try {
    console.log('🔍 Changing teacher password...');
    console.log('📡 URL:', '/teacher/profile/password');
    const res = await AppService.put('/teacher/profile/password', payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error changing teacher password:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📊 Get dashboard data
const getDashboard = async (token) => {
  try {
    console.log('🔍 Fetching teacher dashboard...');
    console.log('📡 URL:', '/teacher/dashboard');
    const res = await AppService.get('/teacher/dashboard', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching teacher dashboard:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📈 Get analytics data
const getAnalytics = async (token) => {
  try {
    console.log('🔍 Fetching teacher analytics...');
    console.log('📡 URL:', '/teacher/analytics');
    const res = await AppService.get('/teacher/analytics', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching teacher analytics:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Get teacher subjects
const getTeacherSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher subjects...');
    console.log('📡 URL:', '/teacher/subjects');
    const res = await AppService.get('/teacher/subjects', token);
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

// 📚 Get teacher archived subjects
const getTeacherArchivedSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher archived subjects...');
    console.log('📡 URL:', '/teacher/subjects/archived');
    const res = await AppService.get('/teacher/subjects/archived', token);
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

const teacherService = {
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  getAnalytics,
  getTeacherSubjects,
  getTeacherArchivedSubjects,
};

export default teacherService;