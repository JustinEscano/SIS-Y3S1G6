// src/pages/Teacher/sections/StudentManagement.js
import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Added faFilter icon
import {
    faSearch,
    faTimes,
    faRotate,
    faEye,
    faEdit,
    faTrash,
    faFilter,
    faExclamationTriangle,
    faSave,
    faUsers,
    faUserCheck,
    faUserSlash,
    faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/authContext';
import studentService from '../../../services/studentService';
import LoadingSpinner from "../../../components/loadingSpinner"; // Added LoadingSpinner
import Pagination from "../../../components/Pagination"; // Added Pagination

const StudentManagement = () => {
    const { token } = useAuth();
    const [students, setStudents] = useState([]); // Raw list from API
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: '', email: '', lrn: '', section: '', currentGradeLevel: '' });
    const [editError, setEditError] = useState('');
    const [showAllSections, setShowAllSections] = useState(false);
    const [showAllGrades, setShowAllGrades] = useState(false);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Or your preferred number

    const studentSummary = useMemo(() => {
        if (!students || students.length === 0) {
            return {
                total: 0,
                active: 0,
                inactive: 0,
                sections: [],
                gradeLevels: []
            };
        }

        const active = students.filter((student) => Boolean(student.currentGradeLevel)).length;
        const sections = Array.from(new Set(students.map((student) => student.section).filter(Boolean)));
        const gradeLevels = Array.from(new Set(students.map((student) => student.currentGradeLevel).filter(Boolean))).sort((a, b) => a - b);

        return {
            total: students.length,
            active,
            inactive: students.length - active,
            sections,
            gradeLevels
        };
    }, [students]);

    useEffect(() => {
        setShowAllSections(false);
        setShowAllGrades(false);
    }, [studentSummary.sections, studentSummary.gradeLevels]);

    useEffect(() => {
        fetchStudents();
    }, [token]); // Dependency array includes token

    const fetchStudents = async () => {
        if (!token) {
            setError("Authentication required."); // Set error if no token
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await studentService.getAllStudents(token);
            console.log('📥 Raw student response:', response); // Debug log

            // Expecting { success: true, count: N, students: [...] }
            const apiData = response;
            let fetchedStudents = [];
            // Use the students array directly from the response
            if (apiData && apiData.students && Array.isArray(apiData.students)) {
                fetchedStudents = apiData.students;
            } else if (Array.isArray(apiData)) { // Fallback if structure is different
               console.warn("Unexpected response structure, expected { students: [...] }", apiData);
               fetchedStudents = apiData; // Attempt to use if it's just an array
            } else {
                 console.error("Invalid data structure received for students:", apiData);
                 throw new Error("Received invalid data format for students.");
            }
            console.log('📋 Extracted students (with grade level):', fetchedStudents.length, fetchedStudents[0]); // Debug log
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
        setCurrentPage(1); // Reset page on filter reset
    };

    const openStudentModal = (student) => {
        setSelectedStudent(student);
        setShowModal(true);
    };

    const openEditStudentModal = (student) => {
        setSelectedStudent(student);
        setEditFormData({
            name: student.name || '',
            email: student.email || '',
            lrn: student.lrn || '',
            section: student.section || '',
            currentGradeLevel: student.currentGradeLevel || ''
        });
        setEditError('');
        setShowEditModal(true);
    };

    const handleEditChange = (event) => {
        const { name, value } = event.target;
        setEditFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdateStudent = async () => {
        if (!selectedStudent?._id) return;
        try {
            setLoading(true);
            setError(null);
            setEditError('');
            const payload = {
                ...editFormData,
                currentGradeLevel: editFormData.currentGradeLevel ? Number(editFormData.currentGradeLevel) : null,
            };
            await studentService.updateStudent(selectedStudent._id, payload, token);
            await fetchStudents();
            setShowEditModal(false);
            setSelectedStudent(null);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to update student';
            setError(message);
            setEditError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!studentId) return;
        if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }
        try {
            setLoading(true);
            setError(null);
            await studentService.deleteStudent(studentId, token);
            await fetchStudents();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to delete student');
        } finally {
            setLoading(false);
        }
    };

    // Filter students based on search term
    const filteredStudents = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (!lowerSearchTerm) return students; // No search term, return all

        return students.filter(student =>
            student.name?.toLowerCase().includes(lowerSearchTerm) ||
            student.email?.toLowerCase().includes(lowerSearchTerm) ||
            student._id?.toString().includes(searchTerm) || // Keep ID search if needed
            (student.lrn && student.lrn.toLowerCase().includes(lowerSearchTerm))
        );
    }, [students, searchTerm]);

    // Paginate the filtered students
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    // Reset page if filters result in current page being invalid
     useEffect(() => {
        const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages); // Go to last valid page
        } else if (currentPage < 1 && filteredStudents.length > 0) {
             setCurrentPage(1); // Go to first page if invalid
        } else if (filteredStudents.length === 0) {
             setCurrentPage(1); // Reset to 1 if no results
        }
    }, [filteredStudents, currentPage, itemsPerPage]);

    if (loading) {
        // Use LoadingSpinner component
        return <LoadingSpinner message="Loading students..." size="lg" />;
    }

    if (error) {
        return (
            <div className="m-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
                <div className="flex items-center mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-800">Error Loading Students</h2>
                </div>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={fetchStudents} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                    Retry
                </button>
            </div>
        );
    }

    const summaryCards = [
        {
            label: 'Total students',
            value: studentSummary.total,
            helper: 'Across all filters',
            icon: faUsers,
            accent: 'bg-blue-100 text-blue-600'
        },
        {
            label: 'Active students',
            value: studentSummary.active,
            helper: 'Assigned to a current grade',
            icon: faUserCheck,
            accent: 'bg-emerald-100 text-emerald-600'
        },
        {
            label: 'Inactive students',
            value: studentSummary.inactive,
            helper: 'No grade level recorded',
            icon: faUserSlash,
            accent: 'bg-amber-100 text-amber-600'
        }
    ];

    const gradeBadges = studentSummary.gradeLevels.length
        ? studentSummary.gradeLevels.map((level) => `Grade ${level}`)
        : ['No grade levels recorded'];

    const sectionBadges = studentSummary.sections.length
        ? studentSummary.sections
        : ['No sections recorded'];

    const displayedSections = showAllSections ? sectionBadges : sectionBadges.slice(0, 6);
    const hiddenSectionCount = Math.max(sectionBadges.length - displayedSections.length, 0);

    const displayedGrades = showAllGrades ? gradeBadges : gradeBadges.slice(0, 6);
    const hiddenGradeCount = Math.max(gradeBadges.length - displayedGrades.length, 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 px-4 pb-16 pt-10 sm:px-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81020b] via-[#b6232e] to-[#4b0206] text-white shadow-2xl">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)' }} aria-hidden="true" />
                <div className="relative z-10 space-y-6 p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                                Student management
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-white md:text-4xl">Manage your learners</h1>
                                <p className="text-sm text-white/85">
                                    Search, review, and track every student across your classes. Spot inactive learners quickly and keep records organised.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-3">
                {summaryCards.map((card) => (
                    <div key={card.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${card.accent}`}>
                            <FontAwesomeIcon icon={card.icon} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                            <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-500">{card.helper}</p>
                        </div>
                    </div>
                ))}
            </section>

            <section className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                        <FontAwesomeIcon icon={faLayerGroup} /> Sections represented
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {displayedSections.map((section) => (
                            <span key={section} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                {section}
                            </span>
                        ))}
                    </div>
                    {hiddenSectionCount > 0 && (
                        <button
                            onClick={() => setShowAllSections((prev) => !prev)}
                            className="mt-3 text-xs font-semibold text-[#81020b] transition hover:text-[#600107]"
                        >
                            {showAllSections ? 'Show fewer sections' : `Show ${hiddenSectionCount} more`}
                        </button>
                    )}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                        <FontAwesomeIcon icon={faLayerGroup} /> Grade levels
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {displayedGrades.map((grade) => (
                            <span key={grade} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                {grade}
                            </span>
                        ))}
                    </div>
                    {hiddenGradeCount > 0 && (
                        <button
                            onClick={() => setShowAllGrades((prev) => !prev)}
                            className="mt-3 text-xs font-semibold text-[#81020b] transition hover:text-[#600107]"
                        >
                            {showAllGrades ? 'Show fewer grades' : `Show ${hiddenGradeCount} more`}
                        </button>
                    )}
                </div>
            </section>

            <section className="relative mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 sm:p-8">
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#81020b]/80 via-[#b6232e]/70 to-[#4b0206]/80" aria-hidden="true" />
                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Find students</h2>
                            <p className="text-sm text-gray-500">Search by name, email, or LRN. Reset to view the complete list.</p>
                        </div>
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                            <FontAwesomeIcon icon={faRotate} /> Reset filters
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                        <label className="relative flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-[#81020b] focus-within:ring-2 focus-within:ring-[#81020b]/20">
                            <FontAwesomeIcon icon={faSearch} className="mr-3 text-gray-400" />
                            <input
                                id="student-search"
                                type="text"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                placeholder="Search by name, email, or LRN"
                                className="w-full border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                            />
                        </label>
                        <div className="flex items-center justify-end rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 shadow-sm">
                            <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
                            {filteredStudents.length} matching students
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 sm:p-8">
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#81020b]/80 via-[#b6232e]/70 to-[#4b0206]/80" aria-hidden="true" />
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Student roster</h2>
                            <p className="text-sm text-gray-500">Showing {paginatedStudents.length} of {filteredStudents.length} students filtered.</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500">
                            Keep student details updated for accurate reporting.
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">LRN</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Current grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Section</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {paginatedStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                                                {searchTerm ? 'No students match the current filters.' : 'No students available yet.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStudents.map((student) => (
                                            <tr key={student._id} className="transition hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{student.lrn || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                                    {student.currentGradeLevel ? `Grade ${student.currentGradeLevel}` : <span className="italic text-gray-400">Inactive</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{student.section || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    <div className="flex items-center gap-3 text-lg">
                                                        <button onClick={() => openStudentModal(student)} className="text-blue-600 transition hover:text-blue-800" title="View Details">
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </button>
                                                        <button onClick={() => openEditStudentModal(student)} className="text-amber-500 transition hover:text-amber-600" title="Edit Student">
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button onClick={() => handleDeleteStudent(student._id)} className="text-red-500 transition hover:text-red-600" title="Delete Student">
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredStudents.length > itemsPerPage && (
                        <div className="flex justify-end border-t border-gray-100 pt-4">
                            <Pagination
                                totalItems={filteredStudents.length}
                                itemsPerPage={itemsPerPage}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </section>

            {showModal && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between border-b pb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Student details</h2>
                                <p className="text-xs text-gray-500">Review the latest information for this learner.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 transition hover:text-gray-600">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-700">
                            <div><span className="font-medium text-gray-500">Name</span><p className="text-gray-900">{selectedStudent.name}</p></div>
                            <div><span className="font-medium text-gray-500">Email</span><p className="text-gray-900">{selectedStudent.email}</p></div>
                            <div><span className="font-medium text-gray-500">LRN</span><p className="text-gray-900">{selectedStudent.lrn || 'N/A'}</p></div>
                            <div><span className="font-medium text-gray-500">Current grade</span><p className="text-gray-900">{selectedStudent.currentGradeLevel ? `Grade ${selectedStudent.currentGradeLevel}` : <span className="italic text-gray-500">Inactive</span>}</p></div>
                            <div><span className="font-medium text-gray-500">Section</span><p className="text-gray-900">{selectedStudent.section || 'N/A'}</p></div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-500">Status</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedStudent.currentGradeLevel ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {selectedStudent.currentGradeLevel ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end border-t pt-4">
                            <button onClick={() => setShowModal(false)} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between border-b pb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Edit student</h2>
                                <p className="text-xs text-gray-500">Update learner details below and click save.</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setSelectedStudent(null); }} className="text-gray-400 transition hover:text-gray-600">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        {editError && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                                {editError}
                            </div>
                        )}
                        <div className="space-y-3 text-sm text-gray-700">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editFormData.name}
                                    onChange={handleEditChange}
                                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={editFormData.email}
                                    onChange={handleEditChange}
                                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">LRN</label>
                                <input
                                    type="text"
                                    name="lrn"
                                    value={editFormData.lrn}
                                    onChange={handleEditChange}
                                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Section</label>
                                <input
                                    type="text"
                                    name="section"
                                    value={editFormData.section}
                                    onChange={handleEditChange}
                                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current grade level</label>
                                <select
                                    name="currentGradeLevel"
                                    value={editFormData.currentGradeLevel}
                                    onChange={handleEditChange}
                                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                >
                                    <option value="">Select grade</option>
                                    {[7, 8, 9, 10].map((level) => (
                                        <option key={level} value={level}>{`Grade ${level}`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                            <button
                                onClick={() => { setShowEditModal(false); setSelectedStudent(null); }}
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateStudent}
                                className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0209]"
                            >
                                <FontAwesomeIcon icon={faSave} /> Save changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;