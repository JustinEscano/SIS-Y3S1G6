// sections/SubjectStudents.jsx (Updated: Replaced window.confirm with delete confirmation modal)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faPlus, faSearch, faTimes, faChartLine, faArrowLeft, faTrash, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService'; // Adjust path as needed
import studentService from '../../../services/studentService'; // Import studentService for fetching all students

const SubjectStudents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Added for potential legacy /students handling
  const [students, setStudents] = useState([]); // Enrolled students (used for filtering/checks)
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // New: Delete confirmation modal
  const [studentToDelete, setStudentToDelete] = useState(null); // New: Track student for deletion
  const [allStudents, setAllStudents] = useState([]); // List of all available students
  const [filteredStudents, setFilteredStudents] = useState([]); // Filtered list for search + type
  const [searchQuery, setSearchQuery] = useState(''); // Search input
  const [filterType, setFilterType] = useState('All'); // Filter: All, Enrolled, Not Enrolled
  const [enrolling, setEnrolling] = useState(false); // Loading state for enrollment
  const [removing, setRemoving] = useState({}); // Per-student removal loading state

  useEffect(() => {
    console.log('🗺️ Current subjectId from params:', id);
    console.log('🗺️ Current pathname:', location.pathname); // Debug current path

    // Legacy Redirect: If somehow accessed via old /students suffix, redirect to clean /subjects/:id
    if (location.pathname.endsWith('/students')) {
      console.log('🔄 Redirecting from legacy /students path');
      navigate(location.pathname.replace('/students', ''), { replace: true });
      return;
    }

    const fetchStudents = async () => {
      if (!id) {
        console.warn('⚠️ No subjectId provided - redirecting or showing error');
        setError('Invalid subject ID. Please select a valid subject.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🚀 Starting fetch for subjectId:', id);
        const response = await subjectService.getSubjectStudents(id);
        console.log('📥 Raw response structure:', JSON.stringify(response, null, 2)); // Full log for debugging
        console.log('📥 Response keys:', Object.keys(response)); // Top-level keys

        // Fixed Extraction: Backend returns { success, count, data: { subject, students } }
        const apiData = response.data || response; // response is already res.data from service
        const innerData = apiData.data || apiData; // Dive into 'data' nesting
        const extractedSubject = innerData.subject || innerData; // Fallback if not nested further
        const extractedStudents = innerData.students || [];

        console.log('📋 Extracted subject keys:', Object.keys(extractedSubject)); // Debug keys
        console.log('📋 Extracted subject name:', extractedSubject.name); // Confirm field access
        console.log('📋 Extracted students length:', extractedStudents.length); // Confirm students

        setStudents(extractedStudents);
        setSubjectInfo(extractedSubject);
      } catch (err) {
        console.error('💥 Fetch error details:', { status: err.response?.status, data: err.response?.data, message: err.message });
        setError(err.response?.data?.message || err.message || 'Failed to fetch students');
      } finally {
        setLoading(false);
        console.log('⏹️ Loading state set to false');
      }
    };

    fetchStudents();
  }, [id, navigate, location.pathname]);

  // Apply filters (search + type) to update filteredStudents
  const applyFilters = () => {
    let temp = [...allStudents];

    // Apply type filter
    if (filterType === 'Enrolled') {
      temp = temp.filter(s => students.some(en => en._id === s._id));
    } else if (filterType === 'Not Enrolled') {
      temp = temp.filter(s => !students.some(en => en._id === s._id));
    }

    // Apply search
    if (searchQuery) {
      temp = temp.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.lrn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(temp);
  };

  // Fetch all students when modal opens
  const fetchAllStudents = async () => {
    try {
      console.log('🚀 Fetching all students for enrollment');
      const response = await studentService.getAllStudents();
      // Fixed Extraction: Assuming studentService returns { success, count, students } or similar
      const apiData = response.data || response;
      const innerData = apiData.data || apiData.students || apiData; // Flexible for student API structure
      const fetchedStudents = Array.isArray(innerData) ? innerData : (innerData.students || []);
      setAllStudents(fetchedStudents);
      applyFilters(); // Initial filter application
    } catch (err) {
      console.error('💥 Fetch all students error:', err);
      setError('Failed to fetch available students');
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters();
  };

  // Handle filter type change
  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    applyFilters();
  };

  // Handle enrolling a student to the subject
  const handleEnrollStudent = async (studentId) => {
    if (!id || !studentId) return;

    try {
      setEnrolling(true);
      console.log('🚀 Enrolling studentId to subjectId:', { studentId, subjectId: id });
      const response = await subjectService.addStudent(id, { studentId });
      console.log('📥 Enroll response:', response);

      // Refresh students list with fixed parsing
      const refreshedResponse = await subjectService.getSubjectStudents(id);
      const apiData = refreshedResponse.data || refreshedResponse;
      const innerData = apiData.data || apiData;
      setStudents(innerData.students || []);

      // Close modal
      setShowAddModal(false);
      setSearchQuery('');
      setFilteredStudents([]);
    } catch (err) {
      console.error('💥 Enroll error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to enroll student');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle opening delete modal
  const openDeleteModal = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!studentToDelete || !id) return;

    try {
      setRemoving(prev => ({ ...prev, [studentToDelete._id]: true }));
      console.log('🚀 Removing studentId from subjectId:', { studentId: studentToDelete._id, subjectId: id });
      const response = await subjectService.removeStudentFromSubject(id, studentToDelete._id);
      console.log('📥 Remove response:', response);

      // Refresh students list with fixed parsing
      const refreshedResponse = await subjectService.getSubjectStudents(id);
      const apiData = refreshedResponse.data || refreshedResponse;
      const innerData = apiData.data || apiData;
      setStudents(innerData.students || []);

      // Close modal
      setShowDeleteModal(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error('💥 Remove error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to remove student');
    } finally {
      setRemoving(prev => ({ ...prev, [studentToDelete._id]: false }));
    }
  };

  // Check if a student is enrolled
  const isStudentEnrolled = (studentId) => {
    return students.some(student => student._id === studentId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-red-500 mr-2" />
        <span className="text-lg">Loading students...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/teacher/subjects')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Subject Header - Aligned with Mockup, Switched Back Button to Right */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            {subjectInfo?.name || 'Unknown Subject'} - Students
          </h1>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-200"
            onClick={() => navigate('/teacher/subjects')} // Back to subjects list
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Subjects
          </button>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg text-gray-600 mb-2">
            Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.schoolYear || 'N/A'}
          </p>
          <p className="text-gray-500">
            {subjectInfo?.description || 'No description available'}
          </p>
        </div>
      </div>

      {/* Students Section - With Buttons Row (Manage Grades to the left of Add) */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Students ({students.length})</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate(`grades`)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            <FontAwesomeIcon icon={faChartLine} className="mr-2" />
            Manage Grades
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchAllStudents(); // Fetch on open
            }}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Existing Student
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-lg mb-4">No students enrolled yet.</p>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchAllStudents();
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Enroll Your First Student
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LRN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student, index) => (
                <tr key={student._id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Grade {student.gradeLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.section}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.lrn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => openDeleteModal(student)}
                      disabled={removing[student._id]}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center"
                      title="Remove Student"
                    >
                      {removing[student._id] ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Existing Student Modal - Updated with Searchable List, Filter Dropdown, and Enrolled Check */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Enroll Existing Student</h3>
            
            {/* Filter Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Students:</label>
              <select
                value={filterType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="All">All Students</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Not Enrolled">Not Enrolled</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or LRN..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    applyFilters();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            {/* Students List */}
            <div className="max-h-64 overflow-y-auto mb-4">
              {filteredStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {searchQuery ? 'No students found matching your search.' : 'No students available.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredStudents.map((student) => {
                    const isEnrolled = isStudentEnrolled(student._id);
                    return (
                      <li key={student._id} className={`flex justify-between items-center p-3 rounded-md ${isEnrolled ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email} • {student.lrn}</p>
                          {isEnrolled && <p className="text-xs text-green-600 mt-1">Already enrolled</p>}
                        </div>
                        <button
                          onClick={() => !isEnrolled && handleEnrollStudent(student._id)}
                          disabled={isEnrolled || enrolling}
                          className={`px-4 py-2 rounded-md transition disabled:opacity-50 flex items-center ${
                            isEnrolled
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {enrolling ? (
                            <>
                              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                              Enrolling...
                            </>
                          ) : isEnrolled ? (
                            'Enrolled'
                          ) : (
                            'Enroll'
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setFilteredStudents([]);
                  setFilterType('All');
                }}
                disabled={enrolling}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-start mb-4">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-2xl text-red-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Confirm Removal</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to remove <strong>{studentToDelete?.name}</strong> from this subject? This action will also permanently delete their grades and comments for {subjectInfo?.name}.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setStudentToDelete(null);
                }}
                disabled={removing[studentToDelete?._id]}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={removing[studentToDelete?._id]}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center"
              >
                {removing[studentToDelete?._id] ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  'Remove Student'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectStudents;