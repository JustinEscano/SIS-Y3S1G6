// services/attendanceService.js (Updated: Added getStudent for fetching student info via /students endpoint.
// Renamed getStudentSubjectAttendance to match controller. No changes to other methods.)
import AppService from "../appService";

// 📊 Get student info (reused for attendance history)
const getStudent = async (studentId, token) => {
  try {
    console.log('🔍 Fetching student info...');
    console.log('📡 URL:', `/students/${studentId}`);
    const res = await AppService.get(`/students/${studentId}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📊 Get attendance for a specific subject (with optional date range)
const getSubjectAttendance = async (subjectId, options = {}, token) => {
  try {
    const { dateFrom, dateTo } = options;
    let queryParams = '';
    if (dateFrom || dateTo) {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      queryParams = `?${params.toString()}`;
    }
    console.log('🔍 Fetching subject attendance...');
    console.log('📡 URL:', `/attendance/subjects/${subjectId}${queryParams}`);
    const res = await AppService.get(`/attendance/subjects/${subjectId}${queryParams}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching subject attendance:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📊 Get attendance for a specific student in a subject (with optional date range)
const getStudentSubjectAttendance = async (subjectId, studentId, options = {}, token) => {
  try {
    const { dateFrom, dateTo } = options;
    let queryParams = '';
    if (dateFrom || dateTo) {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      queryParams = `?${params.toString()}`;
    }
    console.log('🔍 Fetching student subject attendance...');
    console.log('📡 URL:', `/attendance/subjects/${subjectId}/students/${studentId}${queryParams}`);
    const res = await AppService.get(`/attendance/subjects/${subjectId}/students/${studentId}${queryParams}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student subject attendance:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 📊 Get aggregated attendance overview for the current student
const getStudentAttendanceOverview = async (tokenOrOptions = {}, maybeOptions) => {
  try {
    const options = Array.isArray(maybeOptions) || typeof maybeOptions === 'object'
      ? maybeOptions || {}
      : (typeof tokenOrOptions === 'object' && !Array.isArray(tokenOrOptions) ? tokenOrOptions : {});
    const token = typeof tokenOrOptions === 'string' ? tokenOrOptions : undefined;
    const { dateFrom, dateTo } = options;
    let queryParams = '';
    if (dateFrom || dateTo) {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      queryParams = `?${params.toString()}`;
    }
    console.log('🔍 Fetching student attendance overview...');
    console.log('📡 URL:', `/attendance/student/overview${queryParams}`);
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
    const res = await AppService.get(`/attendance/student/overview${queryParams}`, config);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching student attendance overview:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// ➕ Mark attendance (bulk for a date)
const markAttendance = async (subjectId, payload, token) => {
  try {
    console.log('🔍 Marking attendance...');
    console.log('📡 URL:', `/attendance/subjects/${subjectId}`);
    console.log('📦 Payload:', payload);
    const res = await AppService.post(`/attendance/subjects/${subjectId}`, payload, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error marking attendance:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// 🗑️ Delete attendance for a specific date
const deleteAttendance = async (subjectId, date, token) => {
  try {
    console.log('🔍 Deleting attendance...');
    console.log('📡 URL:', `/attendance/subjects/${subjectId}/${date}`);
    console.log('📅 Date:', date);
    const res = await AppService.delete(`/attendance/subjects/${subjectId}/${date}`, token);
    console.log('✅ Success:', res.status, res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Error deleting attendance:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

const attendanceService = {
  getSubjectAttendance,
  getStudentSubjectAttendance,
  getStudentAttendanceOverview,
  getStudent, // New: For fetching student details
  markAttendance,
  deleteAttendance,
};

export default attendanceService;