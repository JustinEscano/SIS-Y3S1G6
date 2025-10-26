// components/StudentSubjectList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faChartLine } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService'; // Adjust path as needed
import { useAuth } from '../../../context/authContext'; // Assume auth hook for token
import LoadingSpinner from '../../../components/loadingSpinner'; // Adjust path as needed

const StudentSubjectList = () => {
  const navigate = useNavigate();
  const { token } = useAuth(); // Get token from auth context
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // For 3x3 grid on lg screens

  // Fetch student's subjects on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Please log in to view your subjects.');
      return;
    }

    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await subjectService.getStudentSubjects(token); // Use student-specific method
        const subjectsArray = response.data?.data || response.data || []; // Safer extraction
        console.log('🔍 Loaded student subjects:', subjectsArray);
        setSubjects(subjectsArray);
      } catch (err) {
        const status = err.response?.status;
        let msg;
        if (status === 403) {
          msg = 'Access denied: You need student permissions to view this. Please log in as a student or contact support.';
        } else if (status === 401) {
          msg = 'Session expired. Please log in again.';
        } else {
          msg = err.message || 'Failed to fetch subjects. Please try again.';
        }
        setError(msg);
        console.error('Error fetching student subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [token]);

  // Reset pagination on subjects change
  useEffect(() => {
    setCurrentPage(1);
  }, [subjects]);

  const paginatedSubjects = subjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCardClick = (subjectId) => {
    navigate(`/student/subjects/${subjectId}/analytics`); // Navigate to analytics for selected subject
  };

  const handleRetry = () => {
    setError(null);
    // Re-trigger the fetch by updating a dependency or calling fetchSubjects directly
    // Since it's in useEffect with [token], we can just let it re-run if needed, but for retry, call it
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await subjectService.getStudentSubjects(token);
        const subjectsArray = response.data?.data || response.data || [];
        console.log('🔍 Loaded student subjects:', subjectsArray);
        setSubjects(subjectsArray);
      } catch (err) {
        const status = err.response?.status;
        let msg;
        if (status === 403) {
          msg = 'Access denied: You need student permissions to view this. Please log in as a student or contact support.';
        } else if (status === 401) {
          msg = 'Session expired. Please log in again.';
        } else {
          msg = err.message || 'Failed to fetch subjects. Please try again.';
        }
        setError(msg);
        console.error('Error fetching student subjects:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchSubjects();
    }
  };

  if (loading) {
    return (
      <LoadingSpinner 
        size="3xl" 
        color="blue" 
        fullScreen 
        message="Loading your subjects..." 
      />
    );
  }

  return (
    <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex justify-between items-start">
            <span>{error}</span>
            <div className="flex space-x-2">
              <button 
                onClick={handleRetry} 
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Retry
              </button>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">×</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold text-gray-800">My Subjects</h1>
      </div>

      {/* Subjects Grid */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Enrolled Subjects ({subjects.length})
        </h2>
        {subjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No subjects enrolled yet. Contact your teacher to get started!</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {paginatedSubjects.map((subject) => (
                <div 
                  key={subject._id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer relative min-h-[140px]"
                  onClick={() => handleCardClick(subject._id)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{subject.name}</h3>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Grade {subject.gradeLevel} - {subject.academicYear || 'N/A'}
                  </p>
                  
                  {/* Analytics Icon */}
                  <div className="absolute bottom-4 right-4">
                    <FontAwesomeIcon icon={faChartLine} className="text-[#81020b] text-lg" />
                  </div>
                </div>
              ))}
            </div>
            {subjects.length > itemsPerPage && (
              <div className="mt-6 flex justify-center">
                <nav className="flex space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 text-gray-500 bg-white disabled:opacity-50 rounded"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-700 bg-gray-100 rounded">
                    Page {currentPage} of {Math.ceil(subjects.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(subjects.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(subjects.length / itemsPerPage)}
                    className="px-3 py-1 border border-gray-300 text-gray-500 bg-white disabled:opacity-50 rounded"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSubjectList;