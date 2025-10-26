// src/pages/Student/sections/GradeProgress.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/authContext';
import gradeService from '../../../services/gradeService';
import LoadingSpinner from '../../../components/loadingSpinner'; // Ensure correct path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faMinus, faChartLine, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'; // Added icons

const GradeProgress = () => {
  const { user, token } = useAuth();
  const [progressData, setProgressData] = useState([]); // Array of { subjectName, progress: [{ academicYear, finalGrade, letterGrade, delta }] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id || !token) {
      setError("User not authenticated. Please log in.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching grade progress for student ID: ${user.id}`);
        const response = await gradeService.getStudentGradeProgress(user.id, token);
        console.log("Progress data received:", response);
        // Ensure response.data is an array before setting state
        if (response && Array.isArray(response.data)) {
           setProgressData(response.data);
        } else {
           console.warn("Received non-array data for progress:", response);
           setProgressData([]); // Set to empty array if data is invalid
        }
      } catch (err) {
        console.error("Error fetching grade progress:", err);
        setError(err.response?.data?.message || err.message || "Failed to load grade progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  // Helper to render the delta with an icon and color
  const renderDelta = (delta) => {
    if (delta === null || delta === undefined) {
      return <span className="text-gray-400 italic text-xs">N/A</span>; // First year has no delta
    }
    const absDelta = Math.abs(delta);
    if (delta > 0.1) { // Threshold for significance
      return <span className="text-green-600 font-medium"><FontAwesomeIcon icon={faArrowUp} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    if (delta < -0.1) { // Threshold for significance
      return <span className="text-red-600 font-medium"><FontAwesomeIcon icon={faArrowDown} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    // Very small or zero change
    return <span className="text-gray-500"><FontAwesomeIcon icon={faMinus} size="xs" /> {absDelta.toFixed(1)}</span>;
  };

  if (loading) {
    return <LoadingSpinner message="Loading grade progress history..." />;
  }

  if (error) {
    return (
       <div className="m-6 p-4 text-red-700 bg-red-100 rounded-lg border border-red-300 flex items-center gap-3">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
       </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
         <FontAwesomeIcon icon={faChartLine} className="text-[#81020b]" />
         Grade Progress Over Years
      </h1>

      {progressData.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-lg shadow border border-gray-200">
           <p className="text-lg text-gray-500">No grade history found across different academic years to compare.</p>
           <p className="text-sm text-gray-400 mt-2">Complete more subjects over time to see your progress here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {progressData.map((subjectProgress) => (
            <div key={subjectProgress.subjectId} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <h2 className="text-xl font-semibold text-gray-700 p-4 bg-gray-50 border-b">{subjectProgress.subjectName}</h2>
              {/* Check if there's enough data to compare */}
              {subjectProgress.progress && subjectProgress.progress.length > 1 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Academic Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Final Grade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Letter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subjectProgress.progress.map((yearGrade, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{yearGrade.academicYear}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{yearGrade.finalGrade?.toFixed(1) ?? 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{yearGrade.letterGrade ?? 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {/* Render delta only from the second year onwards */}
                            {index > 0 ? renderDelta(yearGrade.delta) : <span className="text-gray-400 italic text-xs">N/A</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                 <p className="p-4 text-sm text-gray-500 italic">Not enough historical data for this subject to show progress yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradeProgress;