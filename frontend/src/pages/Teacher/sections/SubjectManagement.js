// src/pages/Teacher/sections/SubjectManagement.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEllipsisV, faArchive, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination';
import { useAuth } from '../../../context/authContext';

const SubjectManagement = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [subjects, setSubjects] = useState([]); // Will hold either active or archived
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
    const itemsPerPage = 9;
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'

    // Fetch subjects based on viewMode
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!token) {
                setError("Authentication token not found. Please log in.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                let response;
                if (viewMode === 'active') {
                    console.log('Fetching active subjects...');
                    response = await subjectService.getTeacherSubjects(token);
                } else {
                    console.log('Fetching archived subjects...');
                    response = await subjectService.getTeacherArchivedSubjects(token);
                }
                const subjectsArray = response.data?.data || response.data || [];
                console.log(`🔍 Loaded ${viewMode} subjects:`, subjectsArray.length);
                setSubjects(subjectsArray);
            } catch (err) {
                setError(err.message || `Failed to fetch ${viewMode} subjects`);
                console.error(`Error fetching ${viewMode} subjects:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, [token, viewMode]); // Refetch when viewMode changes

    // Reset pagination on subjects change
    useEffect(() => {
        setCurrentPage(1);
    }, [subjects]);

    const paginatedSubjects = subjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // MODIFIED: Navigate based on viewMode
    const handleCardClick = (subjectId) => {
        if (viewMode === 'active') {
            // For active subjects, go to the student management/roster page
            navigate(`/teacher/subjects/${subjectId}`);
        } else { // viewMode === 'archived'
            // For archived subjects, go directly to the grades view page
            navigate(`/teacher/subjects/${subjectId}`);
        }
    };

    const handleSaveSubject = async () => {
        // Basic validation
        if (!newSubject.name || !newSubject.gradeLevel || !newSubject.academicYear || !/^\d{4}-\d{4}$/.test(newSubject.academicYear)) {
            setError("Please fill in Subject Name, Grade Level, and Academic Year (YYYY-YYYY format).");
            return;
        }
        if (isNaN(parseInt(newSubject.gradeLevel)) || parseInt(newSubject.gradeLevel) < 7 || parseInt(newSubject.gradeLevel) > 12) {
            setError("Grade Level must be between 7 and 12.");
            return;
        }

        try {
            setError(null); // Clear previous errors
            const payload = {
                name: newSubject.name,
                description: newSubject.description || '',
                gradeLevel: parseInt(newSubject.gradeLevel),
                academicYear: newSubject.academicYear,
            };
            if (isEditing && editingSubjectId) {
                await subjectService.updateSubject(editingSubjectId, payload, token);
            } else {
                await subjectService.createSubject(payload, token);
            }
            setShowModal(false);
            setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "" });
            setIsEditing(false);
            setEditingSubjectId(null);

            // Refetch based on current view mode
            const response = viewMode === 'active'
                ? await subjectService.getTeacherSubjects(token)
                : await subjectService.getTeacherArchivedSubjects(token);
            const subjectsArray = response.data?.data || response.data || [];
            setSubjects(subjectsArray);
        } catch (err) {
            setError(err.response?.data?.error || err.message || `Failed to ${isEditing ? 'update' : 'create'} subject`);
            console.error(`Error ${isEditing ? 'updating' : 'creating'} subject:`, err);
        }
    };

    const handleCloseModal = () => {
        setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "" });
        setShowModal(false);
        setIsEditing(false);
        setEditingSubjectId(null);
        setError(null); // Clear modal errors on close
    };

    const handleDeleteSubject = async (subjectId) => {
        const subject = subjects.find(s => s._id === subjectId);
        if (!subject) return;

        if (subject.students && subject.students.length > 0) {
            alert('Cannot delete subject with enrolled students. Please remove students first or archive the subject.');
            setSelectedSubjectId(null); // Close dropdown
            return;
        }
        if (!window.confirm(`Are you sure you want to permanently delete the subject "${subject.name}"? This action cannot be undone.`)) {
            setSelectedSubjectId(null); // Close dropdown
            return;
        }
        try {
            setError(null);
            console.warn("Delete functionality not fully implemented in service. Placeholder action.");
            alert("Delete action placeholder. Implement actual API call.");

            const response = viewMode === 'active'
                ? await subjectService.getTeacherSubjects(token)
                : await subjectService.getTeacherArchivedSubjects(token);
            const subjectsArray = response.data?.data || response.data || [];
            setSubjects(subjectsArray);
        } catch (err) {
            setError(err.message || 'Failed to delete subject');
            console.error('Error deleting subject:', err);
        } finally {
            setSelectedSubjectId(null); // Ensure dropdown closes
        }
    };

    const handleArchiveToggle = async (subjectId, shouldArchive) => {
        const action = shouldArchive ? 'archive' : 'unarchive';
        const subjectName = subjects.find(s => s._id === subjectId)?.name || 'this subject';
        if (!window.confirm(`Are you sure you want to ${action} "${subjectName}"?`)) {
            setSelectedSubjectId(null); // Close dropdown
            return;
        }

        try {
            setError(null);
            await subjectService.updateSubject(subjectId, { archived: shouldArchive }, token);
            // Refetch based on current view mode to update list correctly
            const response = viewMode === 'active'
                ? await subjectService.getTeacherSubjects(token)
                : await subjectService.getTeacherArchivedSubjects(token);
            const subjectsArray = response.data?.data || response.data || [];
            setSubjects(subjectsArray);
        } catch (err) {
            setError(err.message || `Failed to ${action} subject`);
            console.error(`Error ${action}ing subject:`, err);
        } finally {
            setSelectedSubjectId(null); // Close dropdown
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
            academicYear: subject.academicYear || ''
        });
        setEditingSubjectId(subject._id);
        setIsEditing(true);
        setShowModal(true);
        setSelectedSubjectId(null); // Close dropdown if open
    };

    return (
        <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
            {error && !showModal && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold text-red-700 hover:text-red-900">×</button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-3xl font-bold text-gray-800">Subject Management</h1>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200"
                    onClick={() => { setIsEditing(false); setEditingSubjectId(null); setShowModal(true); }}
                >
                    <FontAwesomeIcon icon={faPlus} />
                    Add New
                </button>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-4 flex space-x-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setViewMode('active')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'active' ? 'bg-red-100 text-[#81020b]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                    Active Subjects
                </button>
                <button
                    onClick={() => setViewMode('archived')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'archived' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                    Archived Subjects
                </button>
            </div>

            {/* Subjects Grid Container */}
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {viewMode === 'active' ? 'Active' : 'Archived'} Subjects ({subjects.length})
                </h2>
                {loading ? (
                    <LoadingSpinner message={`Loading ${viewMode} subjects...`} />
                ) : subjects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No {viewMode} subjects found.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                            {paginatedSubjects.map((subject) => (
                                <div
                                    key={subject._id}
                                    // MODIFIED: className - Removed cursor-not-allowed, added cursor-pointer always
                                    className={`border rounded-lg p-4 pb-16 hover:shadow-md transition-shadow duration-200 relative min-h-[140px] cursor-pointer ${viewMode === 'archived' ? 'border-gray-300 bg-gray-50 opacity-70' : 'border-gray-200'}`}
                                    // MODIFIED: onClick - Removed conditional check
                                    onClick={() => handleCardClick(subject._id)}
                                >
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{subject.name}</h3>
                                    <p className="text-xs text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Grade {subject.gradeLevel} - {subject.academicYear || 'N/A'}
                                    </p>

                                    {/* Actions Row */}
                                    <div className="absolute bottom-4 left-4 flex space-x-2">
                                        {/* Edit Button (Only for Active) */}
                                        {viewMode === 'active' && (
                                            <button
                                                title="Edit Subject"
                                                className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded"
                                                onClick={(e) => { e.stopPropagation(); handleEditSubject(subject); }}
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                        )}
                                        {/* Dropdown Button */}
                                        <button
                                            title="More Actions"
                                            className="p-2 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded relative"
                                            onClick={(e) => { e.stopPropagation(); toggleDropdown(subject._id); }}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisV} />
                                            {/* Dropdown Content */}
                                            {selectedSubjectId === subject._id && (
                                                <div
                                                    className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 z-10"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* Archive/Unarchive Action - Use DIV */}
                                                    <div
                                                        role="button" tabIndex={0}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                                                        onClick={(e) => { handleArchiveToggle(subject._id, viewMode === 'active'); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleArchiveToggle(subject._id, viewMode === 'active'); }}
                                                    >
                                                        <FontAwesomeIcon icon={viewMode === 'active' ? faArchive : faBoxOpen} className="mr-1 w-4" />
                                                        {viewMode === 'active' ? 'Archive' : 'Unarchive'}
                                                    </div>
                                                    {/* Delete Action - Use DIV (Only if active and no students) */}
                                                    {viewMode === 'active' && (!subject.students || subject.students.length === 0) && (
                                                        <div
                                                            role="button" tabIndex={0}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                                                            onClick={(e) => { handleDeleteSubject(subject._id); }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeleteSubject(subject._id); }}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} className="mr-1 w-4" />
                                                            Delete
                                                        </div>
                                                    )}
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
                        {/* Modal Error Display */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                            <input
                                type="text"
                                value={newSubject.name}
                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                placeholder="e.g., Advanced Mathematics"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                                required
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level *</label>
                            <select
                                value={newSubject.gradeLevel}
                                onChange={(e) => setNewSubject({ ...newSubject, gradeLevel: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                                required
                            >
                                <option value="">Select Grade</option>
                                {Array.from({ length: 6 }, (_, i) => 7 + i).map(level => (
                                    <option key={level} value={level}>Grade {level}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
                            <input
                                type="text"
                                value={newSubject.academicYear}
                                onChange={(e) => setNewSubject({ ...newSubject, academicYear: e.target.value })}
                                placeholder="YYYY-YYYY (e.g., 2025-2026)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                                pattern="\d{4}-\d{4}"
                                title="Format must be YYYY-YYYY"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                            <button
                                type="button"
                                className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200 border border-gray-300"
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
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