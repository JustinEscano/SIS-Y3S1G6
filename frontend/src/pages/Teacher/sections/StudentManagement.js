import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faRotate, faEye, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/authContext'; // Assuming auth context for token
import studentService from '../../../services/studentService'; // Assuming student service for fetching real data

const StudentManagement = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // New: Error state for UI
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const fetchStudents = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await studentService.getAllStudents(token);
      console.log('📥 Raw response:', response); // Debug log

      const apiData = response.data || response;
      let fetchedStudents = [];
      if (apiData.students && Array.isArray(apiData.students)) {
        fetchedStudents = apiData.students;
      } else if (apiData.data && Array.isArray(apiData.data)) {
        fetchedStudents = apiData.data;
      } else if (apiData.data && apiData.data.students && Array.isArray(apiData.data.students)) {
        fetchedStudents = apiData.data.students;
      } else if (Array.isArray(apiData)) {
        fetchedStudents = apiData;
      }
      console.log('📋 Extracted students length:', fetchedStudents.length); // Debug log
      setStudents(fetchedStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchTerm('');
  };

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student._id?.toString().includes(searchTerm) ||
      student.id?.toString().includes(searchTerm) ||
      (student.lrn && student.lrn.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading students...</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faTrash} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Error Loading Students</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={fetchStudents} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold text-gray-800">Student Management</h1>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-lg p-5 mb-5 shadow-sm border border-gray-200 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Search Panel</h2>
        <div className="flex gap-5 flex-wrap pb-4 border-b border-gray-200 mb-4">
          <div className="flex flex-col flex-1 min-w-[300px]">
            <label className="text-sm text-gray-600 mb-2 font-medium">Search by Name, Email, ID, or LRN</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Students Table ({filteredStudents.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LRN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No students found matching your search.' : 'No students available.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id || student.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.lrn || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gradeLevel || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-normal rounded-full ${
                        student.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openStudentModal(student)}
                        className="p-1 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded"
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Student Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{selectedStudent.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedStudent.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LRN</label>
                <p className="text-gray-900">{selectedStudent.lrn || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <p className="text-gray-900">{selectedStudent.gradeLevel || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-normal rounded-full ${
                  selectedStudent.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedStudent.status || 'Active'}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;