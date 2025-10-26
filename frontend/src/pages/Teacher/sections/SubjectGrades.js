// sections/SubjectGrades.jsx (Fixed: Use absolute paths with /teacher prefix to avoid relative duplication)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faDownload, faUpload, faEye } from '@fortawesome/free-solid-svg-icons';
import gradeService from '../../../services/gradeService'; // Adjust path as needed
import subjectService from '../../../services/subjectService'; // Import for subject fetch
import { useAuth } from '../../../context/authContext'; // Assume auth context for token
import LoadingSpinner from '../../../components/loadingSpinner'; // Adjust path as needed
import Pagination from '../../../components/Pagination'; // Adjust path as needed

const SubjectGrades = () => {
  const { id: subjectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth(); // Get token from auth context
  const [grades, setGrades] = useState([]); // Array of grade objects with populated student
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false); // Loading for export
  const [importing, setImporting] = useState(false); // Loading for import
  const fileInputRef = useRef(null); // Ref for file input
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!subjectId || !token) {
      setError('Invalid subject ID or authentication missing.');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch grades (array of { _id, student: { _id, name, email }, finalGrade, etc. })
        console.log('🚀 Fetching grades for subjectId:', subjectId);
        const gradesResponse = await gradeService.getSubjectGrades(subjectId, token);
        console.log('📥 Raw grades response:', JSON.stringify(gradesResponse, null, 2));
        // Fetch full subject info separately (for header)
        console.log('🚀 Fetching subject info for subjectId:', subjectId);
        const subjectResponse = await subjectService.getSubject(subjectId); // Updated: No token param needed (AppService handles via localStorage)
        console.log('📥 Raw subject response:', JSON.stringify(subjectResponse, null, 2));
        // Robust Grades Extraction: Expect array directly or in data[]
        const gradesApiData = gradesResponse.data || gradesResponse;
        const gradesInnerData = gradesApiData.data || gradesApiData;
        let extractedGrades = Array.isArray(gradesInnerData) ? gradesInnerData : [];
        if (!extractedGrades.length && Array.isArray(gradesApiData)) {
          extractedGrades = gradesApiData; // Fallback if no 'data' nesting
        }
        // Robust Subject Extraction: From subject response
        const subjectApiData = subjectResponse.data || subjectResponse;
        const subjectInnerData = subjectApiData.data || subjectApiData;
        const extractedSubject = subjectInnerData.subject || subjectInnerData || null;
        console.log('📋 Extracted grades length:', extractedGrades.length);
        console.log('📋 Sample grade structure:', JSON.stringify(extractedGrades[0], null, 2));
        console.log('📋 Extracted subject:', JSON.stringify(extractedSubject, null, 2));
        setGrades(extractedGrades);
        setSubjectInfo(extractedSubject);
      } catch (err) {
        console.error('💥 Fetch data error details:', { status: err.response?.status, data: err.response?.data, message: err.message });
        setError(err.response?.data?.message || err.message || 'Failed to fetch grades or subject info');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [subjectId, token]);

  // Reset pagination on grades change
  useEffect(() => {
    setCurrentPage(1);
  }, [grades]);

  const paginatedGrades = grades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle export grades as XLSX
  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await gradeService.exportGrades(subjectId, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades-${subjectId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('💥 Export error:', err);
      setError(err.message || 'Failed to export grades');
    } finally {
      setExporting(false);
    }
  };

  // Handle import grades from XLSX
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.xlsx')) {
      setError('Please select a valid XLSX file.');
      return;
    }
    try {
      setImporting(true);
      await gradeService.importGrades(subjectId, file, token);
      console.log('✅ Grades imported');
      // Refresh grades
      const refreshedResponse = await gradeService.getSubjectGrades(subjectId, token);
      const apiData = refreshedResponse.data || refreshedResponse;
      const innerData = apiData.data || apiData;
      let refreshedGrades = Array.isArray(innerData) ? innerData : [];
      if (!refreshedGrades.length && Array.isArray(apiData)) {
        refreshedGrades = apiData;
      }
      setGrades(refreshedGrades);
      fileInputRef.current.value = ''; // Reset input
      setError(null);
    } catch (err) {
      console.error('💥 Import error:', err);
      setError(err.message || 'Failed to import grades');
    } finally {
      setImporting(false);
    }
  };

  // Navigate to individual student analytics (fixed: absolute path to avoid duplication)
  const handleViewStudent = (studentId) => {
    navigate(`/teacher/subjects/${subjectId}/grades/${studentId}/analytics`);
  };

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading grades..." 
        size="lg" 
        color="red" 
        fullScreen={false} 
      />
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
            onClick={() => navigate('/teacher/subjects')} // Fixed: Absolute path
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
      {/* Subject Header - Full Display with Back Button in Top Right */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {subjectInfo?.name || 'Unknown Subject'} - Grades
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.schoolYear || 'N/A'}
          </p>
          <p className="text-gray-500 mb-2">
            {subjectInfo?.description || 'No description available'}
          </p>
          {/* Additional Subject Info if Available */}
          {subjectInfo && (
            <div className="text-sm text-gray-400">
              ID: {subjectInfo._id || 'N/A'} | Enrolled Students: {grades.length || 0}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/teacher/subjects/${subjectId}`)} // Fixed: Absolute path
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition self-start"
        >
          Back to Students
        </button>
      </div>

      {/* Actions: Export/Import Buttons */}
      <div className="flex justify-end items-center space-x-4 mb-6">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50"
        >
          {exporting ? (
            <>
              <FontAwesomeIcon icon={faDownload} className="animate-spin mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Export XLSX
            </>
          )}
        </button>
        <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md cursor-pointer disabled:opacity-50">
          {importing ? (
            <>
              <FontAwesomeIcon icon={faUpload} className="animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Import XLSX
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>

      {/* Grades Table - Simplified: Removed LRN and Quarter Grades, View button */}
      {grades.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-lg mb-4">No grades recorded yet. Enroll students first!</p>
          <button
            onClick={() => navigate(`/teacher/subjects/${subjectId}`)} // Fixed: Absolute path
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Manage Students
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Letter Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedGrades.map((gradeItem) => {
                // Cross-Reference: Grade item has student populated and grade fields
                const student = gradeItem.student || { name: 'N/A', email: 'N/A' };
                const gradeId = gradeItem._id;
                const currentFinal = gradeItem.finalGrade || '';
                const letterGrade = gradeItem.letterGrade || 'N/A';
                const remarks = gradeItem.remarks || 'N/A';
                return (
                  <tr key={gradeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${parseFloat(currentFinal) >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentFinal || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{letterGrade}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{remarks}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewStudent(student._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {grades.length > itemsPerPage && (
            <Pagination
              totalItems={grades.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectGrades;