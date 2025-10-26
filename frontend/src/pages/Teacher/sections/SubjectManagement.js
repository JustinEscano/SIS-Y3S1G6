import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEllipsisV, faArchive } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService'; // Adjust path as needed
import LoadingSpinner from '../../../components/loadingSpinner'; // Adjust path as needed
import Pagination from '../../../components/Pagination'; // Adjust path as needed
import { useAuth } from '../../../context/authContext'; // FIXED: Assume auth hook for token

const SubjectManagement = () => {
  const navigate = useNavigate();
  const { token } = useAuth(); // FIXED: Get token from auth context (or localStorage.getItem('accessToken'))
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null); // For dropdown
  const [newSubject, setNewSubject] = useState({ 
    name: "", 
    description: "", 
    gradeLevel: "", 
    academicYear: "" 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // For 3x3 grid on lg screens

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await subjectService.getTeacherSubjects(token); // FIXED: Pass token
        const subjectsArray = response.data?.data || response.data || []; // FIXED: Safer extraction
        console.log('🔍 Loaded subjects array:', subjectsArray); // Debug
        console.log('🔍 First subject sample:', subjectsArray[0]); // Debug: Verify academicYear
        setSubjects(subjectsArray);
        if (response.success === false) {
          throw new Error(response.error || 'API response invalid');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch subjects');
        console.error('Error fetching subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [token]); // FIXED: Re-fetch on token change

  // Reset pagination on subjects change
  useEffect(() => {
    setCurrentPage(1);
  }, [subjects]);

  const paginatedSubjects = subjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCardClick = (subjectId) => {
    navigate(`/teacher/subjects/${subjectId}`);
  };

  const handleSaveSubject = async () => {
    if (newSubject.name && newSubject.gradeLevel && newSubject.academicYear) {
      try {
        const payload = {
          name: newSubject.name,
          description: newSubject.description || '',
          gradeLevel: parseInt(newSubject.gradeLevel),
          academicYear: newSubject.academicYear, // String "2024-2025"
          students: []
        };
        if (isEditing && editingSubjectId) {
          await subjectService.updateSubject(editingSubjectId, payload, token); // FIXED: Pass token
        } else {
          await subjectService.createSubject(payload, token); // FIXED: Pass token
        }
        setShowModal(false);
        setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "" });
        setIsEditing(false);
        setEditingSubjectId(null);
        
        // Refetch
        const response = await subjectService.getTeacherSubjects(token); // FIXED: Pass token
        const subjectsArray = response.data?.data || response.data || [];
        console.log('🔍 Refetched subjects:', subjectsArray); // Debug
        setSubjects(subjectsArray);
      } catch (err) {
        setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} subject`);
        console.error(`Error ${isEditing ? 'updating' : 'creating'} subject:`, err);
      }
    }
  };

  const handleCloseModal = () => {
    setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "" });
    setShowModal(false);
    setIsEditing(false);
    setEditingSubjectId(null);
  };

  const handleDeleteSubject = async (subjectId) => {
    const subject = subjects.find(s => s._id === subjectId);
    if (subject.students.length > 0) {
      alert('Cannot delete subject with enrolled students. Archive instead.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectService.deleteSubject(subjectId, token); // FIXED: Pass token (add method to service if missing)
      // Refetch
      const response = await subjectService.getTeacherSubjects(token); // FIXED: Pass token
      const subjectsArray = response.data?.data || response.data || [];
      setSubjects(subjectsArray);
    } catch (err) {
      setError(err.message || 'Failed to delete subject');
      console.error('Error deleting subject:', err);
    }
  };

  const handleArchiveSubject = async (subjectId) => {
    try {
      await subjectService.updateSubject(subjectId, { archived: true }, token); // FIXED: Pass token
      // Refetch
      const response = await subjectService.getTeacherSubjects(token); // FIXED: Pass token
      const subjectsArray = response.data?.data || response.data || [];
      setSubjects(subjectsArray);
    } catch (err) {
      setError(err.message || 'Failed to archive subject');
      console.error('Error archiving subject:', err);
    }
  };

  const toggleDropdown = (subjectId) => {
    setSelectedSubjectId(selectedSubjectId === subjectId ? null : subjectId);
  };

  const handleEditSubject = (subject) => {
    setNewSubject({
      name: subject.name,
      description: subject.description || '',
      gradeLevel: subject.gradeLevel.toString(),
      academicYear: subject.academicYear || '' // String from DB
    });
    setEditingSubjectId(subject._id);
    setIsEditing(true);
    setShowModal(true);
  };

  if (loading) {
    return (
      <LoadingSpinner 
        size="3xl" 
        color="red" 
        fullScreen 
        message="Loading subjects..." 
      />
    );
  }

  return (
    <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold text-gray-800">Subject Management</h1>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200"
          onClick={() => setShowModal(true)}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add New
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Subjects ({subjects.length})
        </h2>
        {subjects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No subjects found. Create one to get started!</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {paginatedSubjects.map((subject) => (
                <div 
                  key={subject._id} 
                  className="border border-gray-200 rounded-lg p-4 pb-16 hover:shadow-md transition-shadow duration-200 cursor-pointer relative min-h-[140px]"
                  onClick={() => handleCardClick(subject._id)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{subject.name}</h3>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Grade {subject.gradeLevel} - {subject.academicYear || 'N/A'} {/* FIXED: Direct string display */}
                  </p>
                  
                  {/* Actions Row */}
                  <div className="absolute bottom-4 left-4 flex space-x-2">
                    <button 
                      className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSubject(subject);
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button 
                      className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(subject._id);
                      }}
                    >
                      <FontAwesomeIcon icon={faEllipsisV} />
                      {selectedSubjectId === subject._id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 z-10">
                          <button 
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveSubject(subject._id);
                              setSelectedSubjectId(null);
                            }}
                          >
                            <FontAwesomeIcon icon={faArchive} className="mr-2" />
                            Archive
                          </button>
                          <button 
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(subject._id);
                              setSelectedSubjectId(null);
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} className="mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {subjects.length > itemsPerPage && (
              <Pagination
                totalItems={subjects.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Create/Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              {isEditing ? 'Edit Subject' : 'Create New Subject'}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
              <input 
                type="text" 
                value={newSubject.name} 
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="e.g., Advanced Mathematics"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea 
                value={newSubject.description} 
                onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                placeholder="Brief description of the subject..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
              <select 
                value={newSubject.gradeLevel} 
                onChange={(e) => setNewSubject({ ...newSubject, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
              >
                <option value="">Select Grade</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Grade {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <input 
                type="text" 
                value={newSubject.academicYear} 
                onChange={(e) => setNewSubject({ ...newSubject, academicYear: e.target.value })}
                placeholder="e.g., 2024-2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button 
                className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200"
                onClick={handleSaveSubject}
              >
                {isEditing ? 'Update Subject' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;