// src/pages/Teacher/sections/SubjectManagement.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faEllipsisV, faArchive, faBoxOpen, faUsers, faGraduationCap, faSearch } from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination';
import { useAuth } from '../../../context/authContext';

// UPDATED: Match exactly with backend model enum
const SUBJECT_TYPES = [
  'Math',
  'Science',
  'Social Sciences',
  'English',
  'MAPEH',
  'Computer Science',
  'Filipino',
  'Reading',
  'TLE',
  'Values',
  'Other'
];

// UPDATED: Grade levels 7-10 only to match model
const GRADE_LEVELS = [7, 8, 9, 10];

const SubjectManagement = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [newSubject, setNewSubject] = useState({
        name: "",
        description: "",
        gradeLevel: "",
        academicYear: "",
        subjectType: "Other"
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [actionLoading, setActionLoading] = useState(null); // Track loading state for individual actions
    const [searchTerm, setSearchTerm] = useState(""); // NEW: Search term state
    const itemsPerPage = 9;
    const [viewMode, setViewMode] = useState('active');

    const viewMeta = useMemo(() => ({
        active: {
            title: 'Active Subjects',
            blurb: 'Subjects you are currently teaching. Manage rosters, attendance, and grades in one place.',
            accent: 'from-rose-500/90 to-[#81020b]',
            emptyTitle: 'No active subjects yet',
            emptyMessage: 'Create a subject to start building your classes and inviting students.',
            toggleLabel: 'Archive',
            buttonIcon: faArchive,
        },
        archived: {
            title: 'Archived Subjects',
            blurb: 'Past classes and completed terms are stored here for easy reference.',
            accent: 'from-slate-500 to-slate-800',
            emptyTitle: 'No archived subjects',
            emptyMessage: 'When you archive a subject it will appear here for historical viewing.',
            toggleLabel: 'Restore',
            buttonIcon: faBoxOpen,
        }
    }), []);

    const currentViewMeta = viewMeta[viewMode];

    // Fetch subjects based on viewMode
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
                response = await subjectService.getTeacherSubjects(token);
            } else {
                response = await subjectService.getTeacherArchivedSubjects(token);
            }
            
            // Handle different response structures
            const subjectsArray = response.data?.data || response.data || response || [];
            console.log(`🔍 Loaded ${viewMode} subjects:`, subjectsArray);
            setSubjects(Array.isArray(subjectsArray) ? subjectsArray : []);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || `Failed to fetch ${viewMode} subjects`;
            setError(errorMessage);
            console.error(`Error fetching ${viewMode} subjects:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [token, viewMode]);

    // Reset pagination and search when view mode changes
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm(""); // Reset search term when switching views
    }, [viewMode, subjects]);

    // Filter subjects based on search term (only for archived view)
    const filteredSubjects = useMemo(() => {
        if (viewMode === 'active') {
            return subjects; // Return all subjects for active view
        }
        
        // For archived view, apply search filter
        if (!searchTerm.trim()) {
            return subjects;
        }
        
        const searchLower = searchTerm.toLowerCase();
        return subjects.filter(subject =>
            subject.name?.toLowerCase().includes(searchLower) ||
            subject.subjectType?.toLowerCase().includes(searchLower) ||
            (subject.code && subject.code.toLowerCase().includes(searchLower)) ||
            (subject.description && subject.description.toLowerCase().includes(searchLower)) ||
            (subject.gradeLevel && subject.gradeLevel.toString().includes(searchTerm)) ||
            (subject.academicYear && subject.academicYear.includes(searchTerm))
        );
    }, [subjects, searchTerm, viewMode]);

    const paginatedSubjects = filteredSubjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleCardClick = (subjectId) => {
        navigate(`/teacher/subjects/${subjectId}`);
    };

    // UPDATED: Enhanced validation to match model constraints
    const handleSaveSubject = async () => {
        // Basic validation
        if (!newSubject.name?.trim()) {
            setError("Subject name is required.");
            return;
        }
        
        if (!newSubject.gradeLevel) {
            setError("Grade level is required.");
            return;
        }
        
        if (!newSubject.academicYear || !/^\d{4}-\d{4}$/.test(newSubject.academicYear)) {
            setError("Academic Year must be in YYYY-YYYY format (e.g., 2025-2026).");
            return;
        }
        
        if (!newSubject.subjectType) {
            setError("Subject type is required.");
            return;
        }

        // UPDATED: Grade level validation to match model (7-10 only)
        const gradeLevelNum = parseInt(newSubject.gradeLevel);
        if (isNaN(gradeLevelNum) || gradeLevelNum < 7 || gradeLevelNum > 10) {
            setError("Grade Level must be between 7 and 10.");
            return;
        }

        try {
            setError(null);
            const payload = {
                name: newSubject.name.trim(),
                description: newSubject.description?.trim() || '',
                gradeLevel: gradeLevelNum,
                academicYear: newSubject.academicYear.trim(),
                subjectType: newSubject.subjectType,
            };

            console.log('📦 Sending subject payload:', payload);

            if (isEditing && editingSubjectId) {
                await subjectService.updateSubject(editingSubjectId, payload, token);
            } else {
                await subjectService.createSubject(payload, token);
            }
            
            setShowModal(false);
            setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "", subjectType: "Other" });
            setIsEditing(false);
            setEditingSubjectId(null);

            // Refetch subjects
            await fetchSubjects();
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'create'} subject`;
            setError(errorMessage);
            console.error(`Error ${isEditing ? 'updating' : 'creating'} subject:`, err);
        }
    };

    const handleCloseModal = () => {
        setNewSubject({ name: "", description: "", gradeLevel: "", academicYear: "", subjectType: "Other" });
        setShowModal(false);
        setIsEditing(false);
        setEditingSubjectId(null);
        setError(null);
    };

    // UPDATED: Implement proper delete functionality
    const handleDeleteSubject = async (subjectId) => {
        const subject = subjects.find(s => s._id === subjectId);
        if (!subject) return;

        // Check if subject has students
        if (subject.students && subject.students.length > 0) {
            alert('Cannot delete subject with enrolled students. Please remove students first or archive the subject.');
            setSelectedSubjectId(null);
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently delete the subject "${subject.name}"? This action cannot be undone.`)) {
            setSelectedSubjectId(null);
            return;
        }

        try {
            setError(null);
            setActionLoading(subjectId);
            await subjectService.deleteSubject(subjectId, token);
            
            // Refetch subjects
            await fetchSubjects();
            
            // Show success message
            alert(`Subject "${subject.name}" has been deleted successfully.`);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete subject';
            setError(errorMessage);
            console.error('Error deleting subject:', err);
        } finally {
            setSelectedSubjectId(null);
            setActionLoading(null);
        }
    };

    // FIXED: Archive/Unarchive functionality
    const handleArchiveToggle = async (subjectId, shouldArchive) => {
        const subject = subjects.find(s => s._id === subjectId);
        if (!subject) {
            setError("Subject not found.");
            return;
        }

        const action = shouldArchive ? 'archive' : 'unarchive';
        const subjectName = subject.name;
        
        if (!window.confirm(`Are you sure you want to ${action} "${subjectName}"?`)) {
            setSelectedSubjectId(null);
            return;
        }

        try {
            setError(null);
            setActionLoading(subjectId);
            
            console.log(`🔄 ${shouldArchive ? 'Archiving' : 'Unarchiving'} subject:`, subjectId);
            
            // Use the updateSubject service with archived flag
            const updatePayload = { 
                archived: shouldArchive,
                // Include existing subject data to avoid validation errors
                name: subject.name,
                gradeLevel: subject.gradeLevel,
                academicYear: subject.academicYear,
                subjectType: subject.subjectType
            };
            
            await subjectService.updateSubject(subjectId, updatePayload, token);
            
            console.log(`✅ Successfully ${action}d subject`);
            
            // Refetch subjects to update the list
            await fetchSubjects();
            
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || `Failed to ${action} subject`;
            setError(errorMessage);
            console.error(`Error ${action}ing subject:`, err);
            
            // More detailed error logging
            if (err.response) {
                console.error('Response data:', err.response.data);
                console.error('Response status:', err.response.status);
            }
        } finally {
            setSelectedSubjectId(null);
            setActionLoading(null);
        }
    };

    const toggleDropdown = (subjectId, e) => {
        if (e) e.stopPropagation();
        setSelectedSubjectId(selectedSubjectId === subjectId ? null : subjectId);
    };

    const handleEditSubject = (subject, e) => {
        if (e) e.stopPropagation();
        setNewSubject({
            name: subject.name,
            description: subject.description || '',
            gradeLevel: subject.gradeLevel.toString(),
            academicYear: subject.academicYear || '',
            subjectType: subject.subjectType || 'Other'
        });
        setEditingSubjectId(subject._id);
        setIsEditing(true);
        setShowModal(true);
        setSelectedSubjectId(null);
    };

    // Helper to get current academic year in YYYY-YYYY format
    const getDefaultAcademicYear = () => {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${currentYear + 1}`;
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setSelectedSubjectId(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // NEW: Render search bar only for archived subjects
    const renderSearchBar = () => {
        if (viewMode !== 'archived') return null;

        return (
            <div className="relative z-10 mb-6">
                <div className="relative max-w-md">
                    <FontAwesomeIcon 
                        icon={faSearch} 
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                    />
                    <input
                        type="text"
                        placeholder="Search archived subjects..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page when searching
                        }}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 transition focus:border-[#81020b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#81020b]/30"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <p className="mt-2 text-xs text-gray-500">
                        Found {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''} matching "{searchTerm}"
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 px-4 pb-16 pt-10 sm:px-8">
            {error && !showModal && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <span>{error}</span>
                        <button 
                            onClick={() => setError(null)} 
                            className="text-lg font-bold leading-none text-red-500 transition hover:text-red-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81020b] via-[#b6232e] to-[#4b0206] text-white shadow-2xl">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)' }} aria-hidden="true" />
                <div className="relative z-10 space-y-6 p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                                Subject management
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-white md:text-4xl">Organize your classes</h1>
                                <p className="text-sm text-white/85">
                                    Switch between active and archived subjects, edit class details, and keep your teaching history tidy. Create new subjects anytime to kick off a fresh term.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                    <FontAwesomeIcon icon={faUsers} className="text-white" /> {subjects.length} {viewMode === 'active' ? 'current subjects' : 'archived records'}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                    <FontAwesomeIcon icon={faArchive} className="text-white/70" /> Toggle between class states easily
                                </span>
                                {viewMode === 'archived' && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                            <FontAwesomeIcon icon={faSearch} className="text-white/70" /> Search archived subjects
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20"
                                onClick={() => { 
                                    setIsEditing(false); 
                                    setEditingSubjectId(null); 
                                    setNewSubject({ 
                                        name: "", 
                                        description: "", 
                                        gradeLevel: "", 
                                        academicYear: getDefaultAcademicYear(), 
                                        subjectType: "Other" 
                                    });
                                    setShowModal(true); 
                                }}
                            >
                                <FontAwesomeIcon icon={faPlus} /> New Subject
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex overflow-hidden rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white shadow-sm backdrop-blur">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-4 py-2 transition ${viewMode === 'active' ? 'bg-white/30 text-white shadow-inner' : 'text-white/70 hover:bg-white/15'}`}
                            >
                                Active Subjects
                            </button>
                            <button
                                onClick={() => setViewMode('archived')}
                                className={`px-4 py-2 transition ${viewMode === 'archived' ? 'bg-white/30 text-white shadow-inner' : 'text-white/70 hover:bg-white/15'}`}
                            >
                                Archived Subjects
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                                {viewMode === 'active' ? 'Manage rosters, attendance, and grading' : 'Keep historical subjects ready for reference'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <br></br>

            <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 sm:p-8">
                <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${currentViewMeta.accent}`} aria-hidden="true" />
                <div className="relative z-10 flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900">{currentViewMeta.title}</h2>
                        <p className="text-sm text-gray-500">{currentViewMeta.blurb}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        {loading ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                                <span className="h-2 w-2 animate-ping rounded-full bg-[#81020b]/80" /> Loading…
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3py-1 text-gray-600">
                                <span className="h-2 w-2 rounded-full bg-[#81020b]" /> 
                                {viewMode === 'active' 
                                    ? `${subjects.length} active classes` 
                                    : `${filteredSubjects.length} of ${subjects.length} archived classes${searchTerm ? ' found' : ''}`
                                }
                            </span>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                            {viewMode === 'active' ? 'Archive' : 'Restore'} subjects from the menu on each card.
                        </span>
                    </div>
                </div>

                {/* Search Bar - Only for Archived Subjects */}
                {renderSearchBar()}

                <div className="relative z-10">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner message={`Loading ${viewMode} subjects...`} />
                        </div>
                    ) : (viewMode === 'active' ? subjects.length : filteredSubjects.length) === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 py-16 text-center">
                            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#81020b]/10 text-[#81020b]">
                                <FontAwesomeIcon icon={currentViewMeta.buttonIcon} className="text-2xl" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {viewMode === 'archived' && searchTerm 
                                    ? `No archived subjects found for "${searchTerm}"`
                                    : currentViewMeta.emptyTitle
                                }
                            </h3>
                            <p className="mt-2 max-w-md text-sm text-gray-500">
                                {viewMode === 'archived' && searchTerm 
                                    ? 'Try adjusting your search terms or clear the search to see all archived subjects.'
                                    : currentViewMeta.emptyMessage
                                }
                            </p>
                            {viewMode === 'active' && (
                                <button
                                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#6c0209]"
                                    onClick={() => { 
                                        setIsEditing(false); 
                                        setEditingSubjectId(null); 
                                        setNewSubject({ 
                                            name: "", 
                                            description: "", 
                                            gradeLevel: "", 
                                            academicYear: getDefaultAcademicYear(), 
                                            subjectType: "Other" 
                                        });
                                        setShowModal(true); 
                                    }}
                                >
                                    <FontAwesomeIcon icon={faPlus} /> Create your first subject
                                </button>
                            )}
                            {viewMode === 'archived' && searchTerm && (
                                <button
                                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-700"
                                    onClick={() => setSearchTerm("")}
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {paginatedSubjects.map((subject) => {
                                    const isSelected = selectedSubjectId === subject._id;
                                    const isLoading = actionLoading === subject._id;
                                    
                                    return (
                                        <article
                                            key={subject._id}
                                            onClick={() => !isLoading && handleCardClick(subject._id)}
                                            className={`group relative flex h-full cursor-pointer flex-col rounded-2xl border bg-white/95 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${viewMode === 'archived' ? 'border-gray-200 bg-gray-50/95' : 'border-gray-100'} ${isSelected ? 'z-50 ring-2 ring-[#81020b]/20 shadow-2xl' : 'hover:z-40 focus-within:z-40'} ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                                        >
                                            {isLoading && (
                                                <div className="absolute inset-0 bg-white/70 z-50 rounded-2xl flex items-center justify-center">
                                                    <LoadingSpinner size="small" />
                                                </div>
                                            )}
                                            <span
                                                className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 ease-out group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} ${viewMode === 'active' ? 'bg-gradient-to-br from-[#81020b]/12 via-[#b6232e]/8 to-transparent' : 'bg-gradient-to-br from-slate-500/15 via-slate-600/10 to-transparent'}`}
                                            />
                                            <div className="relative z-10 flex h-full flex-col gap-6">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg shadow-sm ${viewMode === 'active' ? 'bg-[#81020b]/10 text-[#81020b]' : 'bg-slate-500/10 text-slate-600'}`}>
                                                            <FontAwesomeIcon icon={faGraduationCap} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="text-lg font-semibold text-gray-900 transition group-hover:text-[#81020b]">{subject.name}</h3>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                                Grade {subject.gradeLevel} • {subject.academicYear || 'N/A'} • {subject.subjectType || 'Other'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-[#81020b]/10 px-3 py-1 text-xs font-semibold text-[#81020b]">
                                                            {subject.students?.length || 0} learners
                                                        </span>
                                                        {viewMode === 'active' && (
                                                            <button
                                                                title="Edit Subject"
                                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#81020b]/80 shadow-sm transition hover:border-[#81020b]/40 hover:bg-white hover:text-[#81020b]"
                                                                onClick={(e) => handleEditSubject(subject, e)}
                                                                disabled={isLoading}
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                        )}
                                                        <div className="relative">
                                                            <button
                                                                title="More actions"
                                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#81020b]/70 shadow-sm transition hover:border-[#81020b]/40 hover:bg-white hover:text-[#81020b]"
                                                                onClick={(e) => toggleDropdown(subject._id, e)}
                                                                disabled={isLoading}
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisV} />
                                                            </button>
                                                            {isSelected && (
                                                                <div
                                                                    className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <button
                                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                                                                        onClick={() => handleArchiveToggle(subject._id, viewMode === 'active')}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <FontAwesomeIcon icon={viewMode === 'active' ? faArchive : faBoxOpen} className="w-4" />
                                                                        {viewMode === 'active' ? 'Archive subject' : 'Restore subject'}
                                                                    </button>
                                                                    {viewMode === 'active' && (!subject.students || subject.students.length === 0) && (
                                                                        <button
                                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                                            onClick={() => handleDeleteSubject(subject._id)}
                                                                            disabled={isLoading}
                                                                        >
                                                                            <FontAwesomeIcon icon={faTrash} className="w-4" />
                                                                            Delete permanently
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="line-clamp-3 text-sm text-gray-600">{subject.description || 'No description provided yet.'}</p>

                                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${viewMode === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                                            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                                            {viewMode === 'active' ? 'In progress' : 'Archived record'}
                                                        </span>
                                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                                                            Created {subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : '—'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCardClick(subject._id); }}
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#81020b]/20 bg-white px-3 py-1 text-xs font-semibold text-[#81020b] transition hover:border-[#81020b]/40 hover:bg-[#81020b]/10"
                                                        disabled={isLoading}
                                                    >
                                                        Open subject
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            {filteredSubjects.length > itemsPerPage && (
                                <div className="mt-6 border-t border-gray-100 pt-4">
                                    <Pagination
                                        totalItems={filteredSubjects.length}
                                        itemsPerPage={itemsPerPage}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

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
                        
                        {/* Subject Type Dropdown */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Type *</label>
                            <select
                                value={newSubject.subjectType}
                                onChange={(e) => setNewSubject({ ...newSubject, subjectType: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent bg-white"
                                required
                            >
                                {SUBJECT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
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
                                {GRADE_LEVELS.map(level => (
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
                            <p className="mt-1 text-xs text-gray-500">Format: YYYY-YYYY (e.g., 2025-2026)</p>
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