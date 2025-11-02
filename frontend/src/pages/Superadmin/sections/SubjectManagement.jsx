// src/pages/Superadmin/sections/SubjectManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBook, 
  faSearch, 
  faEye, 
  faPlus, 
  faSave, 
  faTimes, 
  faArchive, 
  faBoxOpen, 
  faUsers, 
  faGraduationCap,
  faEdit,
  faTrash,
  faEllipsisV,
  faInfoCircle // ADDED: Import info icon
} from "@fortawesome/free-solid-svg-icons";
import subjectService from "../../../services/subjectService";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/loadingSpinner";

// Constants
const SUBJECT_TYPES = [
  'Math', 'Science', 'Social Sciences', 'English', 'MAPEH',
  'Computer Science', 'Filipino', 'Reading', 'TLE', 'Values', 'Other'
];

const GRADE_LEVELS = [7, 8, 9, 10];

const SUBJECT_TILES = [
  { key: "total", label: "Total subjects", helper: "Across all grade levels" },
  { key: "active", label: "Active subjects", helper: "Currently offered" },
  { key: "archived", label: "Archived", helper: "Hidden from enrollment" },
  { key: "students", label: "Enrolled students", helper: "Across all subjects" },
];

const VIEW_META = {
  active: {
    title: 'Active Subjects',
    blurb: 'Subjects currently being offered across the school. Manage rosters and academic details.',
    accent: 'from-rose-500/90 to-[#81020b]',
    emptyTitle: 'No active subjects yet',
    emptyMessage: 'Create a subject to start building academic offerings.',
    toggleLabel: 'Archive',
    buttonIcon: faArchive,
  },
  archived: {
    title: 'Archived Subjects',
    blurb: 'Past classes and completed terms are stored here for historical reference.',
    accent: 'from-slate-500 to-slate-800',
    emptyTitle: 'No archived subjects',
    emptyMessage: 'When you archive a subject it will appear here for historical viewing.',
    toggleLabel: 'Restore',
    buttonIcon: faBoxOpen,
  }
};

const INITIAL_CREATE_FORM = {
  name: "",
  subjectType: "Other",
  gradeLevel: "",
  academicYear: "",
  description: ""
};

function SubjectManagement() {
  // State Management
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [hoveredInfo, setHoveredInfo] = useState(null); // ADDED: For tooltip
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Constants
  const itemsPerPage = 9;
  const currentViewMeta = VIEW_META[viewMode];

  // Data Fetching - Fetch all subjects regardless of view mode
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both active and archived subjects
      const [activeResponse, archivedResponse] = await Promise.all([
        subjectService.getTeacherSubjects(),
        subjectService.getTeacherArchivedSubjects()
      ]);
      
      // Extract subjects from responses
      const extractSubjects = (response) => {
        return Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.subjects)
          ? response.subjects
          : [];
      };
      
      const activeSubjects = extractSubjects(activeResponse);
      const archivedSubjects = extractSubjects(archivedResponse);
      
      // Combine all subjects
      const allSubjectsCombined = [...activeSubjects, ...archivedSubjects];
      setAllSubjects(allSubjectsCombined);
      
      if (!allSubjectsCombined.length) {
        setAlert(prev => prev?.type === 'success' ? prev : { 
          type: 'info', 
          message: 'No subjects found.' 
        });
      } else {
        setAlert(prev => prev?.type === 'success' ? prev : null);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setAllSubjects([]);
      setAlert({ 
        type: 'error', 
        message: 'Failed to load subjects. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  // Computed Values
  const currentViewSubjects = useMemo(() => {
    return allSubjects.filter(subject => 
      viewMode === 'active' ? !subject.archived : subject.archived
    );
  }, [allSubjects, viewMode]);

  const filteredSubjects = useMemo(() => {
    return currentViewSubjects.filter(subject =>
      subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [currentViewSubjects, searchTerm]);

  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubjects, currentPage, itemsPerPage]);

  const subjectSummary = useMemo(() => {
    const activeSubjects = allSubjects.filter(s => !s.archived);
    const archivedSubjects = allSubjects.filter(s => s.archived);
    
    return {
      total: allSubjects.length,
      active: activeSubjects.length,
      archived: archivedSubjects.length,
      students: allSubjects.reduce((sum, subject) => sum + (subject.students?.length || 0), 0),
    };
  }, [allSubjects]);

  // Helper Functions
  const getDefaultAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
  };

  const validateSubjectForm = (form, isCreate = false) => {
    const errors = [];
    
    if (!form.name?.trim()) errors.push('Subject name is required.');
    if (!form.gradeLevel) errors.push('Grade level is required.');
    if (!form.academicYear?.trim()) errors.push('Academic year is required.');
    if (isCreate && !form.subjectType) errors.push('Subject type is required.');

    if (form.academicYear && !/^\d{4}-\d{4}$/.test(form.academicYear.trim())) {
      errors.push('Academic year must follow YYYY-YYYY format (e.g., 2024-2025).');
    }

    const gradeLevelNumber = Number(form.gradeLevel);
    if (gradeLevelNumber && (Number.isNaN(gradeLevelNumber) || gradeLevelNumber < 7 || gradeLevelNumber > 10)) {
      errors.push('Grade level must be between 7 and 10.');
    }

    return errors;
  };

  // NEW: Tooltip component for grade level info
  const GradeLevelTooltip = () => {
    const tooltipContent = "Student's current grade level is automatically calculated based on their enrolled subjects.";
    
    if (hoveredInfo !== 'student-grade') return null;

    return (
      <div className="absolute z-50 w-64 p-3 text-xs bg-gray-900 text-white rounded-lg shadow-lg bottom-full left-0 mb-2">
        <div className="relative">
          {tooltipContent}
          {/* Tooltip arrow */}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 bottom-0 left-3 translate-y-1"></div>
        </div>
      </div>
    );
  };

  // Modal Handlers
  const openCreateModal = () => {
    setCreateForm({
      ...INITIAL_CREATE_FORM,
      academicYear: getDefaultAcademicYear()
    });
    setCreateError("");
    setIsEditing(false);
    setEditingSubjectId(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreating(false);
  };

  const openSubjectDetails = async (subjectId) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      
      const response = await subjectService.getSubject(subjectId);
      const subjectData = response?.data || response;
      
      setSelectedSubject(subjectData);
      setEditingSubject({
        name: subjectData.name || "",
        subjectType: subjectData.subjectType || "Other",
        gradeLevel: subjectData.gradeLevel || "",
        academicYear: subjectData.academicYear || "",
        description: subjectData.description || ""
      });
    } catch (error) {
      console.error("Error fetching subject details:", error);
      setDetailError('Failed to load subject details.');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSubject(null);
    setEditingSubject(null);
    setSavingSubject(false);
    setDetailError(null);
  };

  // Form Handlers
  const handleCreateFormChange = (e) => {
    if (createError) setCreateError("");
    setCreateForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDetailFieldChange = (e) => {
    if (!editingSubject) return;
    setEditingSubject(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Action Handlers
  const handleCreateSubject = async () => {
    const errors = validateSubjectForm(createForm, true);
    if (errors.length > 0) {
      setCreateError(errors.join(' '));
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        gradeLevel: Number(createForm.gradeLevel),
        academicYear: createForm.academicYear.trim(),
        subjectType: createForm.subjectType,
      };
      
      await subjectService.createSubject(payload);
      
      closeCreateModal();
      setAlert({ type: 'success', message: 'Subject created successfully.' });
      fetchSubjects();
    } catch (error) {
      console.error("Error creating subject:", error);
      setCreateError(error.response?.data?.error || 'Failed to create subject.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSubject = async () => {
    if (!selectedSubject || !editingSubject) return;
    
    const errors = validateSubjectForm(editingSubject);
    if (errors.length > 0) {
      setDetailError(errors.join(' '));
      return;
    }

    try {
      setSavingSubject(true);
      setDetailError(null);
      
      const payload = {
        name: editingSubject.name.trim(),
        subjectType: editingSubject.subjectType,
        gradeLevel: editingSubject.gradeLevel ? Number(editingSubject.gradeLevel) : undefined,
        academicYear: editingSubject.academicYear.trim(),
        description: editingSubject.description?.trim() || ""
      };

      await subjectService.updateSubject(selectedSubject._id, payload);
      await fetchSubjects();
      await openSubjectDetails(selectedSubject._id);
      
      setDetailError('Subject updated successfully.');
    } catch (error) {
      console.error('Error updating subject:', error);
      const errMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update subject.';
      setDetailError(errMessage);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleArchiveToggle = async (subjectId, shouldArchive) => {
    const subject = allSubjects.find(s => s._id === subjectId);
    if (!subject) return;

    const action = shouldArchive ? 'archive' : 'restore';
    if (!window.confirm(`Are you sure you want to ${action} "${subject.name}"?`)) {
      setSelectedSubjectId(null);
      return;
    }

    try {
      await subjectService.updateSubject(subjectId, { archived: shouldArchive });
      setAlert({ type: 'success', message: `Subject ${action}d successfully.` });
      fetchSubjects();
    } catch (error) {
      console.error(`Error ${action}ing subject:`, error);
      setAlert({ type: 'error', message: `Failed to ${action} subject.` });
    } finally {
      setSelectedSubjectId(null);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    const subject = allSubjects.find(s => s._id === subjectId);
    if (!subject) return;

    if (subject.students && subject.students.length > 0) {
      alert('Cannot delete subject with enrolled students. Please remove students first or archive the subject.');
      setSelectedSubjectId(null);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${subject.name}"? This action cannot be undone.`)) {
      setSelectedSubjectId(null);
      return;
    }

    try {
      await subjectService.deleteSubject(subjectId);
      setAlert({ type: 'success', message: 'Subject deleted successfully.' });
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      setAlert({ type: 'error', message: 'Failed to delete subject.' });
    } finally {
      setSelectedSubjectId(null);
    }
  };

  const handleEditSubject = (subject) => {
    setCreateForm({
      name: subject.name,
      description: subject.description || '',
      gradeLevel: subject.gradeLevel?.toString() || '',
      academicYear: subject.academicYear || '',
      subjectType: subject.subjectType || 'Other'
    });
    setEditingSubjectId(subject._id);
    setIsEditing(true);
    setShowCreateModal(true);
    setSelectedSubjectId(null);
  };

  const toggleDropdown = (subjectId) => {
    setSelectedSubjectId(prev => prev === subjectId ? null : subjectId);
  };

  // Render Components
  const renderHeaderSection = () => (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81020b] via-[#b6232e] to-[#4b0206] text-white shadow-2xl">
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
        aria-hidden="true"
      />
      <div className="relative z-10 space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              Subject catalog
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white md:text-4xl">All subjects across your SIS</h1>
              <p className="text-sm text-white/85">
                Track academic offerings, manage archived classes, and ensure every grade level has the coverage it needs for the school year.
              </p>
            </div>
            {alert && (
              <div
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                  alert.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : alert.type === "error"
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-blue-200 bg-blue-50 text-blue-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span>{alert.message}</span>
                  <button onClick={() => setAlert(null)} className="text-[10px] uppercase tracking-wide text-current/70">
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 text-sm md:items-end">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-white/25"
            >
              <FontAwesomeIcon icon={faPlus} /> Create subject
            </button>
            <p className="text-xs text-white/75">Add new offerings or keep archives up to date.</p>
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
              {viewMode === 'active' ? 'Manage all active academic offerings' : 'Keep historical subjects ready for reference'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSummaryCards = () => (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {SUBJECT_TILES.map((tile) => (
        <div key={tile.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#81020b]/10 text-lg font-semibold text-[#81020b]">
            <FontAwesomeIcon icon={faBook} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {tile.key === "students" ? subjectSummary.students : subjectSummary[tile.key] || 0}
            </p>
            <p className="text-xs text-gray-500">{tile.helper}</p>
          </div>
        </div>
      ))}
    </section>
  );

  const renderSubjectCard = (subject) => {
    const isSelected = selectedSubjectId === subject._id;
    
    return (
      <article
        key={subject._id}
        className={`group relative flex h-full cursor-pointer flex-col rounded-2xl border bg-white/95 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
          viewMode === 'archived' ? 'border-gray-200 bg-gray-50/95' : 'border-gray-100'
        } ${isSelected ? 'z-50 ring-2 ring-[#81020b]/20 shadow-2xl' : 'hover:z-40 focus-within:z-40'}`}
      >
        <span
          className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 ease-out group-hover:opacity-100 ${
            isSelected ? 'opacity-100' : ''
          } ${
            viewMode === 'active' 
              ? 'bg-gradient-to-br from-[#81020b]/12 via-[#b6232e]/8 to-transparent' 
              : 'bg-gradient-to-br from-slate-500/15 via-slate-600/10 to-transparent'
          }`}
        />
        <div className="relative z-10 flex h-full flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg shadow-sm ${
                viewMode === 'active' ? 'bg-[#81020b]/10 text-[#81020b]' : 'bg-slate-500/10 text-slate-600'
              }`}>
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
              <div className="relative">
                <button
                  title="More actions"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#81020b]/70 shadow-sm transition hover:border-[#81020b]/40 hover:bg-white hover:text-[#81020b]"
                  onClick={(e) => { e.stopPropagation(); toggleDropdown(subject._id); }}
                >
                  <FontAwesomeIcon icon={faEllipsisV} />
                </button>
                {isSelected && (
                  <div
                    className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                      onClick={() => openSubjectDetails(subject._id)}
                    >
                      <FontAwesomeIcon icon={faEye} className="w-4" />
                      View details
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                      onClick={() => handleEditSubject(subject)}
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-4" />
                      Edit subject
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                      onClick={() => handleArchiveToggle(subject._id, viewMode === 'active')}
                    >
                      <FontAwesomeIcon icon={viewMode === 'active' ? faArchive : faBoxOpen} className="w-4" />
                      {viewMode === 'active' ? 'Archive subject' : 'Restore subject'}
                    </button>
                    {(!subject.students || subject.students.length === 0) && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                        onClick={() => handleDeleteSubject(subject._id)}
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
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                viewMode === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                {viewMode === 'active' ? 'Active' : 'Archived'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                Created {subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderSubjectsList = () => (
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
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-[#81020b]" /> {currentViewSubjects.length} {viewMode === 'active' ? 'active classes' : 'archived classes'}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 mb-6">
        <div className="relative">
          <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject name or type"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 transition focus:border-[#81020b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#81020b]/30"
          />
        </div>
      </div>

      <div className="relative z-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message={`Loading ${viewMode} subjects...`} />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 py-16 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#81020b]/10 text-[#81020b]">
              <FontAwesomeIcon icon={currentViewMeta.buttonIcon} className="text-2xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{currentViewMeta.emptyTitle}</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">{currentViewMeta.emptyMessage}</p>
            {viewMode === 'active' && (
              <button
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#6c0209]"
                onClick={openCreateModal}
              >
                <FontAwesomeIcon icon={faPlus} /> Create your first subject
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSubjects.map(renderSubjectCard)}
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
  );

  const renderDetailModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Subject Details</h3>
          <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {detailLoading ? (
            <div className="text-center text-gray-500">Loading subject details...</div>
          ) : !selectedSubject ? (
            <div className="text-center text-gray-500">Subject not found.</div>
          ) : (
            <>
              {detailError && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  detailError.includes('successfully')
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {detailError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-500 uppercase tracking-wide">Subject Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editingSubject?.name || ''}
                    onChange={handleDetailFieldChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500 uppercase tracking-wide">Subject Type</label>
                  <select
                    name="subjectType"
                    value={editingSubject?.subjectType || 'Other'}
                    onChange={handleDetailFieldChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent bg-white"
                  >
                    {SUBJECT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500 uppercase tracking-wide">Grade Level</label>
                  <select
                    name="gradeLevel"
                    value={editingSubject?.gradeLevel ?? ''}
                    onChange={handleDetailFieldChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {GRADE_LEVELS.map((grade) => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500 uppercase tracking-wide">Academic Year</label>
                  <input
                    type="text"
                    name="academicYear"
                    value={editingSubject?.academicYear || ''}
                    onChange={handleDetailFieldChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                    placeholder="YYYY-YYYY"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-500 uppercase tracking-wide">Description</label>
                <textarea
                  name="description"
                  value={editingSubject?.description || ''}
                  onChange={handleDetailFieldChange}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Created</p>
                  <p className="text-lg text-gray-800">
                    {selectedSubject.createdAt ? new Date(selectedSubject.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Updated</p>
                  <p className="text-lg text-gray-800">
                    {selectedSubject.updatedAt ? new Date(selectedSubject.updatedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* UPDATED: Students section with current grade level */}
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Enrolled Students ({selectedSubject.students?.length || 0})</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedSubject.students && selectedSubject.students.length > 0 ? (
                    <ul className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedSubject.students.map((student) => (
                        <li key={student._id || student.id} className="flex justify-between items-center text-sm text-gray-700 p-2 bg-white rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{student.name || 'Unnamed Student'}</div>
                            <div className="text-xs text-gray-500">
                              {student.lrn || student.email || 'N/A'}
                              {student.section && ` • ${student.section}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              student.currentGradeLevel 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {student.currentGradeLevel ? `Grade ${student.currentGradeLevel}` : 'No Grade'}
                            </span>
                            <div 
                              className="relative"
                              onMouseEnter={() => setHoveredInfo('student-grade')}
                              onMouseLeave={() => setHoveredInfo(null)}
                            >
                              <FontAwesomeIcon 
                                icon={faInfoCircle} 
                                className="text-blue-500 text-xs cursor-help" 
                              />
                              <GradeLevelTooltip />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No students enrolled.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={handleSaveSubject}
            disabled={savingSubject}
            className="px-4 py-2 bg-[#81020b] text-white rounded-lg hover:bg-[#6a0109] disabled:bg-gray-400 transition-colors"
          >
            {savingSubject ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={closeDetailModal} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">
            {isEditing ? 'Edit Subject' : 'Create New Subject'}
          </h3>
          <button
            onClick={closeCreateModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {createError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name *
            </label>
            <input
              type="text"
              name="name"
              value={createForm.name}
              onChange={handleCreateFormChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !createForm.name.trim() ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
              placeholder="e.g., Mathematics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Type *
            </label>
            <select
              name="subjectType"
              value={createForm.subjectType}
              onChange={handleCreateFormChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent bg-white ${createError && !createForm.subjectType ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
            >
              {SUBJECT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Level *
            </label>
            <select
              name="gradeLevel"
              value={createForm.gradeLevel}
              onChange={handleCreateFormChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !createForm.gradeLevel ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
            >
              <option value="">Select Grade Level</option>
              {GRADE_LEVELS.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year *
            </label>
            <input
              type="text"
              name="academicYear"
              value={createForm.academicYear}
              onChange={handleCreateFormChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !/^\d{4}-\d{4}$/.test(createForm.academicYear.trim()) ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
              placeholder="e.g., 2024-2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={createForm.description}
              onChange={handleCreateFormChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
              placeholder="Optional description..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={closeCreateModal}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateSubject}
            disabled={creating}
            className="bg-[#81020b] text-white px-6 py-2 rounded-lg hover:bg-[#6a0109] disabled:bg-gray-400 transition-colors flex items-center gap-2"
          >
            {creating ? "Creating..." : (
              <>
                <FontAwesomeIcon icon={faSave} />
                {isEditing ? "Update Subject" : "Create Subject"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      {renderHeaderSection()}
      {renderSummaryCards()}
      {renderSubjectsList()}
      {showDetailModal && renderDetailModal()}
      {showCreateModal && renderCreateModal()}
    </div>
  );
}

export default SubjectManagement;