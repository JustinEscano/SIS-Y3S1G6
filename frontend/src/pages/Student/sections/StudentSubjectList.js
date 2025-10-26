// src/pages/Student/sections/StudentSubjectList.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faChartLine, faHistory } from '@fortawesome/free-solid-svg-icons'; // Added faHistory
import subjectService from '../../../services/subjectService';
import { useAuth } from '../../../context/authContext';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination'; // Assuming you have this

const StudentSubjectList = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subjects, setSubjects] = useState([]); // Holds active or archived
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'

  // Fetch subjects based on viewMode
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
        let response;
        if (viewMode === 'active') {
          console.log('Fetching active student subjects...');
          response = await subjectService.getStudentSubjects(token);
        } else {
          console.log('Fetching archived student subjects...');
          response = await subjectService.getStudentArchivedSubjects(token);
        }
        // Handle potential variations in API response structure
        const responseData = response.data || response;
        const subjectsArray = responseData.data || responseData || [];

        console.log(`🔍 Loaded ${viewMode} student subjects:`, subjectsArray.length);
        if (!Array.isArray(subjectsArray)) {
             console.error("Expected an array of subjects, but received:", subjectsArray);
             throw new Error("Invalid data format received from server.");
        }
        setSubjects(subjectsArray);
      } catch (err) {
        const status = err.response?.status;
        let msg;
        if (status === 403) {
          msg = 'Access denied. Please ensure you are logged in as a student.';
        } else if (status === 401) {
          msg = 'Session expired. Please log in again.';
        } else {
          msg = err.message || `Failed to fetch ${viewMode} subjects. Please try again.`;
        }
        setError(msg);
        console.error(`Error fetching ${viewMode} student subjects:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [token, viewMode]);

  // Reset pagination on subjects change
  useEffect(() => {
    setCurrentPage(1);
  }, [subjects]);

  const paginatedSubjects = subjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCardClick = (subjectId) => {
    // Only navigate if the subject is active
    if (viewMode === 'active') {
      navigate(`/student/subjects/${subjectId}/analytics`);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Re-trigger fetch by toggling mode temporarily (or just call fetch function again)
    const fetchSubjectsAgain = async () => {
        // Copied fetch logic from useEffect
         try {
            setLoading(true);
            setError(null);
            let response;
            if (viewMode === 'active') {
            response = await subjectService.getStudentSubjects(token);
            } else {
            response = await subjectService.getStudentArchivedSubjects(token);
            }
            const responseData = response.data || response;
            const subjectsArray = responseData.data || responseData || [];
            if (!Array.isArray(subjectsArray)) {
                throw new Error("Invalid data format.");
            }
            setSubjects(subjectsArray);
        } catch (err) {
            setError(err.message || `Failed to fetch ${viewMode} subjects.`);
        } finally {
            setLoading(false);
        }
    };
    if(token) fetchSubjectsAgain();
  };

  if (loading && subjects.length === 0) { // Show full screen spinner only on initial load
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
        {/* Toggle Button */}
        <button
          onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
          title={viewMode === 'active' ? 'View Past Subjects' : 'View Current Subjects'}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm"
        >
          <FontAwesomeIcon icon={faHistory} />
          {viewMode === 'active' ? 'View Archived' : 'View Active'}
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          {viewMode === 'active' ? 'Currently Enrolled' : 'Past Subjects'} ({subjects.length})
        </h2>
        {loading ? ( // Inline loading indicator when switching modes
            <div className="text-center py-8"><LoadingSpinner message={`Loading ${viewMode} subjects...`} /></div>
        ) : subjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
             {viewMode === 'active' ? 'No subjects currently enrolled. Contact your teacher.' : 'No past subjects found.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {paginatedSubjects.map((subject) => (
                <div
                  key={subject._id}
                  className={`border rounded-lg p-4 pb-12 hover:shadow-md transition-shadow duration-200 relative min-h-[140px] ${ // Added pb-12 for icon space
                    viewMode === 'archived'
                      ? 'border-gray-300 bg-gray-50 opacity-70 cursor-not-allowed' // Make archived non-clickable visually
                      : 'border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => handleCardClick(subject._id)} // Click handled conditionally
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{subject.name}</h3>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Grade {subject.gradeLevel} - {subject.academicYear || 'N/A'}
                  </p>
                  {/* Teacher Info (Could be useful for past subjects) */}
                  {subject.teacher && (
                     <p className="text-xs text-gray-400 absolute bottom-4 left-4">
                        Teacher: {subject.teacher.name || 'N/A'}
                     </p>
                  )}

                  {/* Analytics Icon (Only for Active) */}
                  {viewMode === 'active' && (
                     <div className="absolute bottom-4 right-4" title="View Analytics">
                       <FontAwesomeIcon icon={faChartLine} className="text-[#81020b] text-lg" />
                     </div>
                  )}
                </div>
              ))}
            </div>
            {subjects.length > itemsPerPage && (
              <div className="mt-6 flex justify-center">
                 <Pagination // Use the Pagination component
                    totalItems={subjects.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                 />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSubjectList;