// services/superadminService.js
import AppService from "../appService";

// 👥 User Management

// 📋 Get all users
const getAllUsers = async (token) => {
  try {
    console.log('🔍 Fetching all users...');
    console.log('📡 URL:', '/superadmin/users');
    const res = await AppService.get('/superadmin/users', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching all users:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 👤 Get user by ID
const getUserById = async (id, token) => {
  try {
    console.log('🔍 Fetching user by ID...');
    console.log('📡 URL:', `/superadmin/users/${id}`);
    const res = await AppService.get(`/superadmin/users/${id}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching user by ID:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// ➕ Create user
const createUser = async (payload, token) => {
  try {
    console.log('🔍 Creating user...');
    console.log('📡 URL:', '/superadmin/users');
    console.log('📦 Payload:', payload);
    const res = await AppService.post('/superadmin/users', payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating user:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🔄 Update user
const updateUser = async (id, updates, token) => {
  try {
    console.log('🔍 Updating user...');
    console.log('📡 URL:', `/superadmin/users/${id}`);
    console.log('📦 Updates:', updates);
    const res = await AppService.put(`/superadmin/users/${id}`, updates, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating user:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🗑️ Delete user
const deleteUser = async (id, token) => {
  try {
    console.log('🔍 Deleting user...');
    console.log('📡 URL:', `/superadmin/users/${id}`);
    const res = await AppService.delete(`/superadmin/users/${id}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error deleting user:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📚 Subject Management (Admin level)

// 📋 Get all subjects (admin view)
const getAllSubjectsAdmin = async (token) => {
  try {
    console.log('🔍 Fetching all subjects (admin view)...');
    console.log('📡 URL:', '/superadmin/subjects');
    const res = await AppService.get('/superadmin/subjects', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching all subjects (admin view):", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📊 Analytics & Reports

// 📈 Get system analytics
const getSystemAnalytics = async (token) => {
  try {
    console.log('🔍 Fetching system analytics...');
    console.log('📡 URL:', '/superadmin/analytics');
    const res = await AppService.get('/superadmin/analytics', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching system analytics:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📋 Get system overview
const getSystemOverview = async (token) => {
  try {
    console.log('🔍 Fetching system overview...');
    console.log('📡 URL:', '/superadmin/overview');
    const res = await AppService.get('/superadmin/overview', token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching system overview:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🏫 School Management

// 🔧 Update school settings
const updateSchoolSettings = async (payload, token) => {
  try {
    console.log('🔍 Updating school settings...');
    console.log('📡 URL:', '/superadmin/school-settings');
    console.log('📦 Payload:', payload);
    const res = await AppService.put('/superadmin/school-settings', payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating school settings:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const superadminService = {
  // User Management
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  
  // Subject Management
  getAllSubjectsAdmin,
  
  // Analytics & Reports
  getSystemAnalytics,
  getSystemOverview,
  
  // School Management
  updateSchoolSettings,
};

export default superadminService;