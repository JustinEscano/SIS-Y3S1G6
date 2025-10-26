// src/pages/Teacher/sections/SubjectAttendance.js (Fixed ESLint: Replaced confirm() with React state-based modal.
// Added ConfirmationModal component inline for bulk actions. Alert kept as-is; if needed, disable no-alert.)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendar, faSave, faEye, faSpinner, faExclamationTriangle, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService';
import attendanceService from '../../../services/attendanceService';
import { useAuth } from '../../../context/authContext';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination';

const SubjectAttendance = () => {
  const { id: subjectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [students, setStudents] = useState([]); // Enrolled students
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: { status: '', notes: '' } }
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today: 2025-10-25
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState(new Set()); // Set of student IDs for bulk selection
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null, title: '' });
  const itemsPerPage = 10;

  // Fetch subject and enrolled students on load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!subjectId || !token) {
        setError('Invalid subject or authentication missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch subject info
        const subjectResponse = await subjectService.getSubject(subjectId);
        const apiData = subjectResponse.data || subjectResponse;
        const innerData = apiData.data || apiData;
        setSubjectInfo(innerData.subject || innerData || null);

        // Fetch enrolled students
        const studentsResponse = await subjectService.getSubjectStudents(subjectId);
        const studentsApiData = studentsResponse.data || studentsResponse;
        const studentsInnerData = studentsApiData.data || studentsApiData;
        const fetchedStudents = studentsInnerData.students || [];
        setStudents(fetchedStudents);

        // Initialize empty attendance data
        const initialData = {};
        fetchedStudents.forEach(student => {
          initialData[student._id] = { status: '', notes: '' };
        });
        setAttendanceData(initialData);

        // Load attendance for selected date
        await loadAttendanceForDate();
      } catch (err) {
        console.error('💥 Initial fetch error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [subjectId, token]);

  // Force selectedDate to today if invalid
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!selectedDate || selectedDate > today) {
      setSelectedDate(today);
    }
  }, []);

  // Reset pagination and selections on students change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents(new Set());
  }, [students]);

  // Reset selections on date change
  useEffect(() => {
    setSelectedStudents(new Set());
  }, [selectedDate]);

  // Load or update attendance when date changes
  const loadAttendanceForDate = async () => {
    if (!subjectId || !token || !students.length) return;

    try {
      setFetchingAttendance(true);
      setError(null);

      console.log('🔍 Loading attendance for date:', selectedDate);
      const response = await attendanceService.getSubjectAttendance(subjectId, { dateFrom: selectedDate, dateTo: selectedDate }, token);
      const attendances = response.data || [];

      // Pre-populate form with existing data
      const updatedData = { ...attendanceData };
      attendances.forEach(att => {
        if (updatedData[att.student._id]) {
          updatedData[att.student._id] = {
            status: att.status,
            notes: att.notes || ''
          };
        }
      });

      // Fill any missing students with defaults
      students.forEach(student => {
        if (!updatedData[student._id]) {
          updatedData[student._id] = { status: '', notes: '' };
        }
      });

      setAttendanceData(updatedData);
    } catch (err) {
      console.error('💥 Load attendance error:', err);
      if (err.response?.status !== 404) { // 404 means no attendance yet - ok
        setError(err.response?.data?.message || err.message || 'Failed to load attendance');
      }
    } finally {
      setFetchingAttendance(false);
    }
  };

  useEffect(() => {
    loadAttendanceForDate();
  }, [selectedDate]);

  // Handle status change
  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  // Handle notes change
  const handleNotesChange = (studentId, notes) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  // Toggle individual student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set()); // Deselect all
    } else {
      setSelectedStudents(new Set(paginatedStudents.map(s => s._id))); // Select all on current page
    }
  };

  // Bulk update status for selected students (now with modal confirmation)
  const bulkUpdateStatus = (status) => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student.'); // Can replace with toast if needed
      return;
    }

    setConfirmModal({
      show: true,
      title: `Confirm Bulk Update`,
      message: `Mark ${selectedStudents.size} selected students as "${status}" for ${selectedDate}?`,
      onConfirm: () => {
        setAttendanceData(prev => {
          const updated = { ...prev };
          selectedStudents.forEach(studentId => {
            if (updated[studentId]) {
              updated[studentId].status = status;
            }
          });
          return updated;
        });
        setConfirmModal({ show: false, message: '', onConfirm: null, title: '' });
      }
    });
  };

  // Close modal
  const closeConfirmModal = () => {
    setConfirmModal({ show: false, message: '', onConfirm: null, title: '' });
  };

  // Save attendance (supports bulk if selected)
  const handleSaveAttendance = async (isBulk = false) => {
    if (!subjectId || !token) return;

    try {
      setSaving(true);
      setError(null);

      // Use selected students if bulk and any selected; otherwise use all
      const studentsToSave = isBulk && selectedStudents.size > 0 
        ? Array.from(selectedStudents).map(id => {
            const student = students.find(s => s._id === id);
            return { studentId: id, status: attendanceData[id]?.status || 'Absent', notes: attendanceData[id]?.notes || '' };
          }).filter(item => item.status)
        : students.map(student => ({
            studentId: student._id,
            status: attendanceData[student._id]?.status || 'Absent',
            notes: attendanceData[student._id]?.notes || ''
          })).filter(item => item.status);

      if (studentsToSave.length === 0) {
        setError('Please select at least one status.');
        return;
      }

      console.log('💾 Saving attendance for date:', selectedDate);
      const payload = { date: selectedDate, attendances: studentsToSave };
      const response = await attendanceService.markAttendance(subjectId, payload, token);
      console.log('✅ Save response:', response);

      // Reload to reflect changes
      await loadAttendanceForDate();

      // Confirmation
      const message = `Attendance marked for ${studentsToSave.length} student(s) on ${selectedDate}.`;
      alert(message); // Replace with toast notification (e.g., react-hot-toast) for better UX

      // Clear selections after bulk save
      if (isBulk) {
        setSelectedStudents(new Set());
      }
    } catch (err) {
      console.error('💥 Save error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Paginated students
  const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <LoadingSpinner message="Loading attendance..." size="lg" color="green" fullScreen={false} />;
  }

  if (error && !subjectInfo) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Subject Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            {subjectInfo?.name || 'Unknown Subject'} - Attendance
          </h1>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-200"
            onClick={() => navigate(`/teacher/subjects/${subjectId}`)}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Students
          </button>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg text-gray-600 mb-2">
            Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.academicYear || 'N/A'}
          </p>
          <p className="text-gray-500">
            {subjectInfo?.description || 'No description available'}
          </p>
        </div>
      </div>

      {/* Date Selector & Save */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FontAwesomeIcon icon={faCalendar} />
            Select Date:
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              min="2025-01-01"
              // max removed to allow current day; backend should validate if needed
            />
          </label>
          {fetchingAttendance && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-green-500" />}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <button
          onClick={() => handleSaveAttendance(selectedStudents.size > 0)}
          disabled={saving || fetchingAttendance}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {/* Bulk Actions */}
      {students.length > 0 && (
        <div className="mb-4 flex gap-2 items-center">
          <span className="text-sm text-gray-600">
            {selectedStudents.size > 0 ? `${selectedStudents.size} selected` : 'No selection'}
          </span>
          {selectedStudents.size > 0 && (
            <>
              <button
                onClick={() => bulkUpdateStatus('Present')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
              >
                Bulk Present
              </button>
              <button
                onClick={() => bulkUpdateStatus('Absent')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
              >
                Bulk Absent
              </button>
              <button
                onClick={() => bulkUpdateStatus('Tardy')}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 text-sm"
              >
                Bulk Tardy
              </button>
            </>
          )}
        </div>
      )}

      {/* Students Attendance Table */}
      {students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-lg mb-4">No students enrolled yet.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Manage Students First
          </button>
        </div>
      ) : fetchingAttendance ? (
        <LoadingSpinner message="Loading attendance data..." size="md" color="green" fullScreen={false} />
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size > 0 && paginatedStudents.every(s => selectedStudents.has(s._id))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedStudents.map((student) => {
                const att = attendanceData[student._id] || { status: '', notes: '' };
                return (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student._id)}
                        onChange={() => toggleStudentSelection(student._id)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={att.status}
                        onChange={(e) => handleStatusChange(student._id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="">Select Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Tardy">Tardy</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={att.notes}
                        onChange={(e) => handleNotesChange(student._id, e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => navigate(`/teacher/subjects/${subjectId}/attendance/students/${student._id}`)}
                        className="text-green-600 hover:text-green-900 flex items-center"
                        title="View Attendance History"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {students.length > itemsPerPage && (
            <Pagination
              totalItems={students.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{confirmModal.title}</h3>
              <button onClick={closeConfirmModal} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmModal}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faCheck} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectAttendance;