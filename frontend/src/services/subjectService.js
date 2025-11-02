// services/subjectService.js
import AppService from "../appService";

// Subject enums from schema (for client-side validation)
const SUBJECT_TYPES = [
  'Math', 'Science', 'Social Sciences', 'English', 'MAPEH',
  'Computer Science', 'Filipino', 'Reading', 'TLE', 'Values', 'Other'
];
const GRADE_LEVELS = [7, 8, 9, 10];

// Helper to build auth config (reusable)
const buildAuthConfig = (token, extraConfig = {}) => ({
  headers: { Authorization: `Bearer ${token}` },
  ...extraConfig
});

// Helper to validate base payload (shared for create/update)
const validateBasePayload = (payload, isCreate = false) => {
  const errors = [];
  if (!payload.name || !payload.name.trim()) errors.push('Name is required.');
  if (!GRADE_LEVELS.includes(payload.gradeLevel)) errors.push('Grade level must be 7-10.');
  if (!payload.academicYear || !payload.academicYear.match(/^\d{4}-\d{4}$/)) {
    errors.push('Invalid academic year format (e.g., 2025-2026).');
  }
  
  // FIXED: Only require subjectType for creation, allow it for updates
  if (isCreate && (!payload.subjectType || !SUBJECT_TYPES.includes(payload.subjectType))) {
    errors.push('Valid subjectType is required for creation.');
  }
  
  // FIXED: For updates, validate subjectType only if provided
  if (!isCreate && payload.subjectType && !SUBJECT_TYPES.includes(payload.subjectType)) {
    errors.push('Invalid subject type provided.');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  return { ...payload, name: payload.name.trim(), gradeLevel: parseInt(payload.gradeLevel) };
};

// 📚 Get all subjects for the authenticated teacher
const getTeacherSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher subjects...');
    console.log('📡 URL:', '/subjects');
    const res = await AppService.get('/subjects', buildAuthConfig(token));
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
const getStudentSubjects = async (tokenOrConfig) => {
  try {
    console.log('🔍 Fetching student subjects...');
    console.log('📡 URL:', '/subjects/student');
    let config;
    if (typeof tokenOrConfig === 'string') {
      config = buildAuthConfig(tokenOrConfig);
    } else {
      // Merge existing config (e.g., for params/query)
      const token = tokenOrConfig.headers?.Authorization?.replace('Bearer ', '') || '';
      config = {
        ...tokenOrConfig,
        headers: { ...tokenOrConfig.headers, Authorization: `Bearer ${token}` }
      };
    }
    const res = await AppService.get('/subjects/student', config);
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
    console.log('📦 Raw payload:', payload);
    
    // Validate full create payload
    const validatedPayload = validateBasePayload(payload, true); // Requires subjectType
    console.log('📦 Validated create payload:', validatedPayload);
    console.log('📡 URL:', '/subjects');
    
    const res = await AppService.post('/subjects', validatedPayload, buildAuthConfig(token));
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating subject:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      payloadSent: payload
    });
    throw error;
  }
};

// 👥 Get students in a specific subject
const getSubjectStudents = async (subjectId, token) => {
  try {
    console.log('🔍 Fetching subject students...');
    console.log('📡 URL:', `/subjects/${subjectId}/students`);
    const res = await AppService.get(`/subjects/${subjectId}/students`, buildAuthConfig(token));
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
    console.log('📦 Payload:', payload);
    console.log('📡 URL:', `/subjects/${subjectId}/students`);
    const res = await AppService.post(`/subjects/${subjectId}/students`, payload, buildAuthConfig(token));
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
    const res = await AppService.delete(`/subjects/${subjectId}/students/${studentId}`, buildAuthConfig(token));
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

// 🔄 Update a subject - FIXED: Allow subjectType updates
const updateSubject = async (subjectId, payload, token) => {
  try {
    console.log('🔍 Updating subject...');
    console.log('📦 Raw payload:', payload);
    
    // Validate base update payload
    let validatedPayload = validateBasePayload(payload, false);
    
    // FIXED: Only filter truly immutable fields, allow subjectType updates
    const immutableFields = []; // Remove 'subjectType' from this array
    immutableFields.forEach(field => delete validatedPayload[field]);
    
    console.log('📦 Filtered update payload:', validatedPayload);
    console.log('📡 URL:', `/subjects/${subjectId}`);
    
    const res = await AppService.put(`/subjects/${subjectId}`, validatedPayload, buildAuthConfig(token));
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error updating subject:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      payloadSent: payload
    });
    throw error;
  }
};

// 🗑️ Delete/Archive a subject
const deleteSubject = async (subjectId, token) => {
  try {
    console.log('🔍 Deleting/archiving subject...');
    console.log('📡 URL:', `/subjects/${subjectId}`);
    // Option 1: Soft delete via update { archived: true }
    const res = await AppService.put(`/subjects/${subjectId}`, { archived: true }, buildAuthConfig(token));
    console.log('✅ Success (archived):', res.status, res.data);
    return res.data;
    // Option 2: Hard delete: await AppService.delete(`/subjects/${subjectId}`, buildAuthConfig(token));
  } catch (error) {
    console.error("❌ Error deleting subject:", {
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
    const res = await AppService.get(`/subjects/${subjectId}`, buildAuthConfig(token));
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

// 📚 Get archived subjects for the authenticated teacher
const getTeacherArchivedSubjects = async (token) => {
  try {
    console.log('🔍 Fetching teacher archived subjects...');
    console.log('📡 URL:', '/subjects/archived/teacher');
    const res = await AppService.get('/subjects/archived/teacher', buildAuthConfig(token));
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

// 📚 Get archived subjects for the authenticated student
const getStudentArchivedSubjects = async (token) => {
  try {
    console.log('🔍 Fetching student archived subjects...');
    console.log('📡 URL:', '/subjects/archived/student');
    const res = await AppService.get('/subjects/archived/student', buildAuthConfig(token));
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
  deleteSubject,
  getSubject,
  getTeacherArchivedSubjects,
  getStudentArchivedSubjects,
  // Export constants for use in components if needed
  SUBJECT_TYPES,
  GRADE_LEVELS
};

export default subjectService;