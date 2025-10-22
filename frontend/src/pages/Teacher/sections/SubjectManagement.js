// Updated SubjectManagement.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEllipsisV, faArchive, faSpinner } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService'; // Adjust path as needed

const SubjectManagement = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null); // For dropdown
  const [newSubject, setNewSubject] = useState({ 
    name: "", 
    description: "", 
    gradeLevel: "", 
    schoolYear: "" 
  });

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await subjectService.getTeacherSubjects();
        setSubjects(response.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch subjects');
        console.error('Error fetching subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleCardClick = (subjectId) => {
    navigate(`/teacher/subjects/${subjectId}`);
  };

  const handleAddSubject = async () => {
    if (newSubject.name && newSubject.gradeLevel && newSubject.schoolYear) {
      try {
        const payload = {
          name: newSubject.name,
          description: newSubject.description || '',
          gradeLevel: parseInt(newSubject.gradeLevel),
          schoolYear: newSubject.schoolYear,
          students: []
        };
        await subjectService.createSubject(payload);
        setShowModal(false);
        setNewSubject({ name: "", description: "", gradeLevel: "", schoolYear: "" });
        
        // Refetch
        const response = await subjectService.getTeacherSubjects();
        setSubjects(response.data || []);
      } catch (err) {
        setError(err.message || 'Failed to create subject');
        console.error('Error creating subject:', err);
      }
    }
  };

  const handleCloseModal = () => {
    setNewSubject({ name: "", description: "", gradeLevel: "", schoolYear: "" });
    setShowModal(false);
  };

  const handleDeleteSubject = async (subjectId) => {
    const subject = subjects.find(s => s._id === subjectId);
    if (subject.students.length > 0) {
      alert('Cannot delete subject with enrolled students. Archive instead.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      // Backend needs DELETE /subjects/:id
      await subjectService.deleteSubject(subjectId); // Add to service/backend
      // Refetch
      const response = await subjectService.getTeacherSubjects();
      setSubjects(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to delete subject');
      console.error('Error deleting subject:', err);
    }
  };

  const handleArchiveSubject = async (subjectId) => {
    try {
      // Backend needs PUT /subjects/:id with { archived: true }
      await subjectService.updateSubject(subjectId, { archived: true });
      // Refetch
      const response = await subjectService.getTeacherSubjects();
      setSubjects(response.data || []);
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
      schoolYear: subject.schoolYear
    });
    setShowModal(true);
    // Full edit: Add isEdit state and updateSubject call
  };

  if (loading) {
    return (
      <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} className="text-3xl text-[#81020b] animate-spin" />
      </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {subjects.map((subject) => (
              <div 
                key={subject._id} 
                className="border border-gray-200 rounded-lg p-4 pb-16 hover:shadow-md transition-shadow duration-200 cursor-pointer relative min-h-[140px]"
                onClick={() => handleCardClick(subject._id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{subject.name}</h3>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
                <p className="text-sm text-gray-500 mb-4">Grade {subject.gradeLevel} - {subject.schoolYear}</p>
                
                {/* Actions Row - Always visible at bottom-left */}
                <div className="absolute bottom-4 left-4 flex space-x-2">
                  <button 
                    className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card navigation
                      handleEditSubject(subject);
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button 
                    className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded relative"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card navigation
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
        )}
      </div>

      {/* Create New Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Create New Subject</h2>
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
                value={newSubject.schoolYear} 
                onChange={(e) => setNewSubject({ ...newSubject, schoolYear: e.target.value })}
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
                onClick={handleAddSubject}
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;