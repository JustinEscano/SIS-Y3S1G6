// src/pages/Teacher/sections/SubjectOverview.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faUsers, faGraduationCap, faCalendarCheck, faPlus,
    faSearch, faTimes, faTrash, faExclamationCircle, faSpinner,
    faDownload, faUpload, faEye, faSave, faCalendar, faExclamationTriangle,
    faCheckCircle, faTimesCircle, faClock // Attendance Icons
} from '@fortawesome/free-solid-svg-icons';
import subjectService from '../../../services/subjectService';
import studentService from '../../../services/studentService';
import gradeService from '../../../services/gradeService';
import attendanceService from '../../../services/attendanceService';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination';
import { useAuth } from '../../../context/authContext';

// --- Reusable Confirmation Modal ---
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onClose, confirmText = "Confirm", cancelText = "Cancel", isLoading = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-start mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl text-yellow-500 mr-3 mt-1 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                        type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm} disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center"
                    >
                        {isLoading ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> Processing...</> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Success Modal for Saved Attendance ---
const SuccessModal = ({ isOpen, onClose, summary, date }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <div className="flex items-center mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-2xl text-green-500 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-800">Attendance Saved Successfully</h3>
                </div>
                <p className="text-gray-600 mb-4">Attendance for <strong>{date}</strong> has been updated.</p>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                    <p className="text-sm text-green-600">
                        <strong>{summary.created}</strong> new records created
                    </p>
                    <p className="text-sm text-green-600">
                        <strong>{summary.updated}</strong> records updated
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---
const SubjectOverview = () => {
    const { id: subjectId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const fileInputRef = useRef(null);

    // --- State Declarations ---
    const [subjectInfo, setSubjectInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: { status, notes } }
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentTab, setCurrentTab] = useState('students');
    const [loading, setLoading] = useState({ initial: true, attendance: false, action: false });
    const [error, setError] = useState({ page: null, modal: null, attendance: null });
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
    const [selectedAttendanceStudents, setSelectedAttendanceStudents] = useState(new Set());
    const [pagination, setPagination] = useState({
        students: { currentPage: 1, itemsPerPage: 10 },
        grades: { currentPage: 1, itemsPerPage: 10 },
        attendance: { currentPage: 1, itemsPerPage: 10 },
    });

    // --- Attendance-Specific Filters ---
    const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saveSummary, setSaveSummary] = useState({ created: 0, updated: 0 });

    // --- Students Tab Filter ---
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

    // --- Grades Tab Filter ---
    const [gradeSearchQuery, setGradeSearchQuery] = useState('');
    const [gradeStatusFilter, setGradeStatusFilter] = useState('All'); // e.g., 'All', 'Passing', 'Failing'

    // --- Helper Functions ---
    const setLoadingState = (key, value) => setLoading(prev => ({ ...prev, [key]: value }));
    const setErrorState = (key, value) => setError(prev => ({ ...prev, [key]: value }));

    // --- Data Fetching ---
    const fetchInitialData = useCallback(async () => {
        if (!subjectId || !token) {
            setErrorState('page', 'Invalid subject ID or authentication missing.');
            setLoadingState('initial', false);
            return;
        }
        try {
            setLoadingState('initial', true);
            setErrorState('page', null);

            const [subjectRes, studentsRes, gradesRes] = await Promise.all([
                subjectService.getSubject(subjectId, token),
                subjectService.getSubjectStudents(subjectId, token),
                gradeService.getSubjectGrades(subjectId, token)
            ]);

            const subjectApiData = subjectRes.data || subjectRes;
            const subjectInnerData = subjectApiData.data || subjectApiData;
            setSubjectInfo(subjectInnerData.subject || subjectInnerData || null);

            const studentsApiData = studentsRes.data || studentsRes;
            const studentsInnerData = studentsApiData.data || studentsApiData;
            const fetchedStudents = studentsInnerData.students || [];
            setStudents(fetchedStudents);

            const gradesApiData = gradesRes.data || gradesRes;
            const fetchedGrades = gradesApiData.data || gradesApiData || [];
            setGrades(Array.isArray(fetchedGrades) ? fetchedGrades : []);

            const initialAttData = {};
            fetchedStudents.forEach(student => {
                initialAttData[student._id] = { status: '', notes: '' };
            });
            setAttendanceData(initialAttData);

            // Load attendance only if students were fetched
            if (fetchedStudents.length > 0) {
                 await loadAttendanceForDate(selectedDate, fetchedStudents, initialAttData);
            }

        } catch (err) {
            console.error('💥 Initial fetch error:', err);
            setErrorState('page', err.response?.data?.message || err.message || 'Failed to load subject data');
        } finally {
            setLoadingState('initial', false);
        }
    }, [subjectId, token, selectedDate]); // Added selectedDate dependency indirectly via loadAttendanceForDate

    const loadAttendanceForDate = useCallback(async (date, currentStudents, currentAttData) => {
        if (!subjectId || !token || !currentStudents || currentStudents.length === 0) {
             console.log("Skipping attendance load: missing ID, token, or students.");
             // Ensure attendance data is reset if students list is empty
             if (!currentStudents || currentStudents.length === 0) {
                  setAttendanceData({});
             }
             setLoadingState('attendance', false); // Ensure loading stops
             return; // Stop if no students
        }

        try {
            setLoadingState('attendance', true);
            setErrorState('attendance', null);
            console.log('🔍 Loading attendance for date:', date);
            const response = await attendanceService.getSubjectAttendance(subjectId, { dateFrom: date, dateTo: date }, token);

            // Ensure response.data.data exists and is an array (based on backend structure)
             const attendances = (response?.data?.data && Array.isArray(response.data.data)) ? response.data.data : [];
             console.log(`Received ${attendances.length} attendance records for ${date}`);


            const updatedData = {}; // Start fresh for the new date
            currentStudents.forEach(student => {
                 updatedData[student._id] = { status: '', notes: '' }; // Initialize all
            });

            attendances.forEach(att => {
                const studentId = att.student?._id; // Use optional chaining
                if (studentId && updatedData[studentId] !== undefined) { // Check if key exists
                    updatedData[studentId] = {
                        status: att.status,
                        notes: att.notes || ''
                    };
                } else if (studentId) {
                     console.warn(`Attendance record found for student ID ${studentId} not in current student list.`);
                 } else {
                     console.warn("Attendance record found without a valid student ID:", att);
                 }
            });
            setAttendanceData(updatedData); // Update state with fresh data for the date

        } catch (err) {
            console.error('💥 Load attendance error:', err);
            if (err.response?.status !== 404) {
                setErrorState('attendance', err.response?.data?.message || err.message || 'Failed to load attendance');
            } else {
                 // Reset attendance data if 404 (no records found for this date)
                 const resetData = {};
                 currentStudents.forEach(student => {
                    resetData[student._id] = { status: '', notes: '' };
                 });
                 setAttendanceData(resetData);
                 setErrorState('attendance', null); // Clear error on 404
                 console.log(`No attendance records found for ${date} (404), reset state.`);
            }
        } finally {
            setLoadingState('attendance', false);
        }
    }, [subjectId, token]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]); // Use fetchInitialData as dependency

    useEffect(() => {
        // Reload attendance only if students exist for the subject
        if (students.length > 0) {
            loadAttendanceForDate(selectedDate, students, attendanceData);
        } else {
             // If students list becomes empty, clear attendance data
             setAttendanceData({});
        }
        // Reset selection when date changes
        setSelectedAttendanceStudents(new Set());
    }, [selectedDate, students]); // Reload attendance if date or student list changes

    useEffect(() => {
        // Reset pagination and selections when the main student list changes
        setPagination(prev => ({
            ...prev,
            students: { ...prev.students, currentPage: 1 },
            grades: { ...prev.grades, currentPage: 1 },
            attendance: { ...prev.attendance, currentPage: 1 },
        }));
        setSelectedAttendanceStudents(new Set());
    }, [students]); // Only depend on students list

    // Reset attendance pagination on filter changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, attendance: { ...prev.attendance, currentPage: 1 } }));
    }, [attendanceSearchQuery, statusFilter]);

    // Reset students pagination on filter changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, students: { ...prev.students, currentPage: 1 } }));
    }, [studentSearchQuery]);

    // Reset grades pagination on filter changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, grades: { ...prev.grades, currentPage: 1 } }));
    }, [gradeSearchQuery, gradeStatusFilter]);

    // --- Event Handlers ---
    const fetchAllStudentsForModal = async () => {/* ... */
        try {
            setLoadingState('action', true); setErrorState('modal', null);
            const response = await studentService.getAllStudents(token);
            const apiData = response.data || response;
            let fetchedAllStudents = apiData.students || (Array.isArray(apiData) ? apiData : []);
            setAllStudents(fetchedAllStudents);
            // Show only students NOT already enrolled
            const enrolledIds = new Set(students.map(s => s._id));
            setFilteredStudents(fetchedAllStudents.filter(s => !enrolledIds.has(s._id)));
        } catch (err) {
            setErrorState('modal', err.response?.data?.message || err.message || 'Failed to load student list.');
        } finally { setLoadingState('action', false); }
    };
    const handleSearchChange = (e) => {/* ... */
        const query = e.target.value.toLowerCase(); setSearchQuery(query);
        const enrolledIds = new Set(students.map(s => s._id));
        setFilteredStudents(
            allStudents.filter(student =>
                !enrolledIds.has(student._id) &&
                (student.name.toLowerCase().includes(query) ||
                 student.email.toLowerCase().includes(query) ||
                 (student.lrn && student.lrn.toLowerCase().includes(query)))
            )
        );
    };
    const handleEnrollStudent = async (studentId) => {/* ... */
        if (!subjectId || !studentId) return;
        try {
            setLoadingState('action', true); setErrorState('modal', null);
            await subjectService.addStudent(subjectId, { studentId }, token);
            await fetchInitialData(); // Refetch all subject data
            setShowAddStudentModal(false); setSearchQuery('');
        } catch (err) {
            setErrorState('modal', err.response?.data?.message || err.message || 'Failed to enroll student');
        } finally { setLoadingState('action', false); }
    };
    const openDeleteConfirmation = (student) => {/* ... */
        setStudentToDelete(student);
        setConfirmModal({
            show: true, title: "Confirm Removal",
            message: `Remove ${student.name} from ${subjectInfo?.name}? This also deletes their grades and attendance.`,
            onConfirm: () => handleConfirmDelete(student._id)
        });
    };
    const handleConfirmDelete = async (studentId) => {/* ... */
         if (!studentToDelete || !subjectId || studentId !== studentToDelete._id) return;
        try {
            setLoadingState('action', true); setErrorState('page', null);
            await subjectService.removeStudentFromSubject(subjectId, studentId, token);
            await fetchInitialData(); // Refetch all subject data
            setConfirmModal({ show: false, title: '', message: '', onConfirm: null }); setStudentToDelete(null);
        } catch (err) {
            setErrorState('page', err.response?.data?.message || err.message || 'Failed to remove student');
            setConfirmModal({ show: false, title: '', message: '', onConfirm: null }); setStudentToDelete(null);
        } finally { setLoadingState('action', false); }
    };
    const handleExportGrades = async () => {/* ... */
         try {
            setLoadingState('action', true); setErrorState('page', null);
            const blob = await gradeService.exportGrades(subjectId, null, token);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `grades-${subjectInfo?.name?.replace(/\s+/g, '_') || subjectId}-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
        } catch (err) { setErrorState('page', err.message || 'Failed to export grades'); }
        finally { setLoadingState('action', false); }
    };
    const handleImportGrades = async (e) => {/* ... */
        const file = e.target.files[0];
        if (!file || !file.name.endsWith('.xlsx')) { setErrorState('page', 'Please select a valid XLSX file.'); return; }
        try {
            setLoadingState('action', true); setErrorState('page', null);
            const importResult = await gradeService.importGrades(subjectId, file, token);
            await fetchInitialData(); // Refetch all data
            if(fileInputRef.current) fileInputRef.current.value = '';
            alert(`${importResult.imported || 0} grade records updated/created successfully.`);
        } catch (err) {
            setErrorState('page', err.response?.data?.error || err.message || 'Failed to import grades');
            if(fileInputRef.current) fileInputRef.current.value = '';
        } finally { setLoadingState('action', false); }
    };
    const handleAttStatusChange = (studentId, status) => { /* ... (same as before) ... */
        setAttendanceData(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || { notes: '' }), status } }));
    };
    const handleAttNotesChange = (studentId, notes) => { /* ... (same as before) ... */
        setAttendanceData(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || { status: '' }), notes } }));
    };
    const toggleAttStudentSelection = (studentId) => { /* ... (same as before) ... */
        setSelectedAttendanceStudents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) newSet.delete(studentId); else newSet.add(studentId);
            return newSet;
        });
    };
    const toggleSelectAllAttendance = (currentPageStudents) => { /* ... (same as before) ... */
         const allSelectedOnPage = currentPageStudents.every(s => selectedAttendanceStudents.has(s._id));
         if (allSelectedOnPage) {
             setSelectedAttendanceStudents(prev => {
                 const newSet = new Set(prev); currentPageStudents.forEach(s => newSet.delete(s._id)); return newSet;
             });
         } else {
             setSelectedAttendanceStudents(prev => {
                 const newSet = new Set(prev); currentPageStudents.forEach(s => newSet.add(s._id)); return newSet;
             });
         }
     };
    const bulkUpdateAttStatus = (status) => { /* ... (same as before) ... */
        if (selectedAttendanceStudents.size === 0) { alert('Please select students first.'); return; }
        setAttendanceData(prev => {
            const updated = { ...prev };
            selectedAttendanceStudents.forEach(studentId => {
                if (students.some(s => s._id === studentId)) { updated[studentId] = { ...(updated[studentId] || { notes: '' }), status }; }
            });
            return updated;
        });
    };
    const handleSaveAttendance = async () => { /* ... (updated to use modal) ... */
        if (!subjectId || !token) return;
        try {
            setLoadingState('action', true); setErrorState('attendance', null);
            const studentsToSave = students.map(student => ({
                studentId: student._id, status: attendanceData[student._id]?.status, notes: attendanceData[student._id]?.notes || ''
            })).filter(item => item.status);
            if (studentsToSave.length === 0) {
                setErrorState('attendance', 'No attendance statuses selected to save.'); setLoadingState('action', false); return;
            }
            const payload = { date: selectedDate, attendances: studentsToSave };
            const response = await attendanceService.markAttendance(subjectId, payload, token);
            // Optionally: You could update local state from response if needed, but usually not required for simple save
            setSaveSummary({ created: response.created || 0, updated: response.updated || 0 });
            setShowSaveConfirm(true);
            setSelectedAttendanceStudents(new Set()); // Clear selection
        } catch (err) {
            setErrorState('attendance', err.response?.data?.message || err.message || 'Failed to save attendance');
        } finally { setLoadingState('action', false); }
    };
    const handlePageChange = (tab, newPage) => {/* ... (same as before) ... */
         setPagination(prev => ({ ...prev, [tab]: { ...prev[tab], currentPage: newPage } }));
         if (tab === 'attendance') { setSelectedAttendanceStudents(new Set()); }
    };

    // --- Render Functions for Tabs ---
    const renderStudentsTab = () => {
        const { currentPage, itemsPerPage } = pagination.students;

        // Filter students for students tab
        const filteredStudentsTab = students.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                (student.lrn && student.lrn.toLowerCase().includes(studentSearchQuery.toLowerCase()));
            return matchesSearch;
        });

        const paginatedStudents = filteredStudentsTab.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        return (
             <div>
                {/* Students Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students by name, email, or LRN..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            disabled={loading.action}
                        />
                    </div>
                    <button onClick={() => { setShowAddStudentModal(true); fetchAllStudentsForModal(); }}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md disabled:opacity-50"
                        disabled={loading.action} >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Existing Student
                    </button>
                </div>

                <div className="flex justify-end mb-4">
                </div>
                 {loading.action && students.length === 0 && <LoadingSpinner message="Processing..." size="sm" />}
                {filteredStudentsTab.length === 0 && !loading.initial ? (
                     <p className="text-gray-500 text-center py-8">
                        {studentSearchQuery ? 'No students match the search.' : 'No students enrolled yet.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                             <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200">
                                {paginatedStudents.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{student.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{student.section || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{student.lrn || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <button onClick={() => openDeleteConfirmation(student)} disabled={loading.action}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center" title="Remove Student" >
                                                Unenroll
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudentsTab.length > itemsPerPage && (
                            <Pagination totalItems={filteredStudentsTab.length} itemsPerPage={itemsPerPage}
                                currentPage={pagination.students.currentPage}
                                onPageChange={(page) => handlePageChange('students', page)} />
                        )}
                    </div>
                )}
            </div>
        );
     };
    const renderGradesTab = () => {
         const { currentPage, itemsPerPage } = pagination.grades;
         const safeGrades = Array.isArray(grades) ? grades : [];

        // Filter grades for grades tab
        const filteredGrades = safeGrades.filter(gradeItem => {
            const student = gradeItem.student || {};
            const matchesSearch = student.name.toLowerCase().includes(gradeSearchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(gradeSearchQuery.toLowerCase());
            const finalGrade = parseFloat(gradeItem.finalGrade);
            const matchesStatus = gradeStatusFilter === 'All' ||
                (gradeStatusFilter === 'Passing' && finalGrade >= 75) ||
                (gradeStatusFilter === 'Failing' && finalGrade < 75);
            return matchesSearch && matchesStatus;
        });

         const paginatedGrades = filteredGrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        return (
             <div>
                {/* Grades Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student name or email..."
                            value={gradeSearchQuery}
                            onChange={(e) => setGradeSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            disabled={loading.action}
                        />
                    </div>
                    <button onClick={handleExportGrades} disabled={loading.action} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50" >
                        {loading.action && currentTab === 'grades' && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                        <FontAwesomeIcon icon={faDownload} className="mr-2" /> Export XLSX
                    </button>
                    <label className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md cursor-pointer ${loading.action ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         {loading.action && currentTab === 'grades' && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                        <FontAwesomeIcon icon={faUpload} className="mr-2" /> Import XLSX
                        <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleImportGrades} className="hidden" disabled={loading.action} />
                    </label>
                </div>

                 <div className="flex justify-end items-center space-x-4 mb-4">

                </div>
                {filteredGrades.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        {gradeSearchQuery || gradeStatusFilter !== 'All' 
                            ? 'No grades match the current filters.' 
                            : 'No grade records found for this subject yet.'
                        }
                    </p>
                ) : (
                 <div className="overflow-x-auto">
                        <table className="min-w-full">
                             <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Grade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Letter</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200">
                                {paginatedGrades.map((gradeItem) => {
                                    const student = gradeItem.student || {};
                                    return (
                                        <tr key={gradeItem._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{student.email || 'N/A'}</td>
                                            <td className={`px-6 py-4 text-sm font-medium ${parseFloat(gradeItem.finalGrade) >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                                                {gradeItem.finalGrade?.toFixed(1) ?? 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{gradeItem.letterGrade || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{gradeItem.remarks || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <button onClick={() => navigate(`/teacher/subjects/${subjectId}/grades/${student._id}/analytics`)} className="text-blue-600 hover:text-blue-900" title="View Student Analytics" >
                                                    Grade
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredGrades.length > itemsPerPage && (
                            <Pagination totalItems={filteredGrades.length} itemsPerPage={itemsPerPage}
                                currentPage={pagination.grades.currentPage}
                                onPageChange={(page) => handlePageChange('grades', page)} />
                        )}
                    </div>
                )}
            </div>
        );
     };

    // REFACTORED: renderAttendanceTab with filters and confirmation modal integration
    const renderAttendanceTab = () => {
        const { currentPage, itemsPerPage } = pagination.attendance;
        // Ensure students is an array before slicing
        const safeStudents = Array.isArray(students) ? students : [];

        // Filter students for attendance tab
        const filteredStudents = safeStudents.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                (student.lrn && student.lrn.toLowerCase().includes(attendanceSearchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'All' || (attendanceData[student._id]?.status === statusFilter);
            return matchesSearch && matchesStatus;
        });

        const paginatedAttendanceStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        const allSelectedOnPage = paginatedAttendanceStudents.length > 0 && paginatedAttendanceStudents.every(s => selectedAttendanceStudents.has(s._id));

        // Define button styles
        const getStatusButtonClass = (studentId, status) => {
            const currentStatus = attendanceData[studentId]?.status;
            let baseClasses = "px-3 py-1 text-xs rounded border transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed mx-0.5 whitespace-nowrap"; // Adjusted px-3 for words
            let activeClasses = "";
            let inactiveClasses = "";

            switch (status) {
                case 'Present':
                    activeClasses = "bg-green-600 border-green-700 text-white font-semibold shadow-sm";
                    inactiveClasses = "bg-white border-green-300 text-green-700 hover:bg-green-50";
                    break;
                case 'Absent':
                    activeClasses = "bg-red-600 border-red-700 text-white font-semibold shadow-sm";
                    inactiveClasses = "bg-white border-red-300 text-red-700 hover:bg-red-50";
                    break;
                case 'Tardy':
                    activeClasses = "bg-yellow-400 border-yellow-500 text-black font-semibold shadow-sm";
                    inactiveClasses = "bg-white border-yellow-400 text-yellow-700 hover:bg-yellow-50";
                    break;
                default:
                    inactiveClasses = "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"; // Fallback for safety
            }

            return `${baseClasses} ${currentStatus === status ? activeClasses : inactiveClasses}`;
        };


        return (
            <div>
                {/* Date Selector & Save Button */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-gray-50 p-3 md:p-4 rounded-lg border gap-3 md:gap-4">
                    {/* ... (Date selector remains same) ... */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label htmlFor="attendance-date" className="flex items-center gap-1 text-sm font-medium text-gray-700 whitespace-nowrap">
                            <FontAwesomeIcon icon={faCalendar} /> Date:
                        </label>
                        <input
                            id="attendance-date" type="date" value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
                            disabled={loading.attendance || loading.action}
                        />
                        {loading.attendance && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-green-500 ml-2" />}
                    </div>
                     {error.attendance && <p className="text-red-600 text-xs text-center md:text-left w-full md:w-auto flex-grow">{error.attendance}</p>}
                    <button
                        onClick={handleSaveAttendance}
                        disabled={loading.action || loading.attendance}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 w-full md:w-auto whitespace-nowrap"
                    >
                         {loading.action ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                        {loading.action ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>

                {/* Attendance Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students by name, email, or LRN..."
                            value={attendanceSearchQuery}
                            onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                            disabled={loading.attendance || loading.action}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 min-w-[140px]"
                        disabled={loading.attendance || loading.action}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Tardy">Tardy</option>
                    </select>
                </div>

                 {/* Bulk Actions Bar */}
                 {safeStudents.length > 0 && (
                    <div className="mb-4 p-2 bg-gray-100 rounded border flex flex-col sm:flex-row items-center gap-2 text-sm">
                        {/* ... (Bulk actions bar remains same) ... */}
                         <div className="flex items-center flex-shrink-0">
                           <input
                                type="checkbox" id="select-all-att"
                                checked={allSelectedOnPage}
                                onChange={() => toggleSelectAllAttendance(paginatedAttendanceStudents)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-2 h-4 w-4"
                                title={allSelectedOnPage ? "Deselect All on Page" : "Select All on Page"}
                            />
                            <label htmlFor="select-all-att" className="text-gray-600 mr-3 whitespace-nowrap">
                                 {selectedAttendanceStudents.size > 0 ? `${selectedAttendanceStudents.size} Selected` : 'Select All'}
                            </label>
                        </div>
                         <div className="flex items-center gap-2 flex-wrap">
                             <span className={`mr-1 ${selectedAttendanceStudents.size === 0 ? 'text-gray-400' : 'text-gray-700'}`}>Mark Selected As:</span>
                            <button onClick={() => bulkUpdateAttStatus('Present')} disabled={selectedAttendanceStudents.size === 0} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs">Present</button>
                            <button onClick={() => bulkUpdateAttStatus('Absent')} disabled={selectedAttendanceStudents.size === 0} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs">Absent</button>
                            <button onClick={() => bulkUpdateAttStatus('Tardy')} disabled={selectedAttendanceStudents.size === 0} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs">Tardy</button>
                        </div>
                    </div>
                )}

                 {/* Attendance Table */}
                {filteredStudents.length === 0 ? (
                     <p className="text-gray-500 text-center py-8">
                        {attendanceSearchQuery || statusFilter !== 'All' 
                            ? 'No students match the current filters.' 
                            : 'Enroll students first to mark attendance.'
                        }
                    </p>
                ) : loading.attendance ? (
                    <LoadingSpinner message="Loading attendance data..." size="md" />
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            {/* ... (thead remains same) ... */}
                             <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                     <th className="px-4 py-3 text-left w-10"> {/* Checkbox column */} </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">History</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200">
                                {paginatedAttendanceStudents.map((student) => {
                                    const att = attendanceData[student._id] || { status: '', notes: '' };
                                    return (
                                        <tr key={student._id} className={`${selectedAttendanceStudents.has(student._id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                             {/* ... (Checkbox and Name columns remain same) ... */}
                                             <td className="px-4 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAttendanceStudents.has(student._id)}
                                                    onChange={() => toggleAttStudentSelection(student._id)}
                                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{student.name}</td>
                                            {/* REFACTORED: Status Buttons */}
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        title="Present"
                                                        onClick={() => handleAttStatusChange(student._id, 'Present')}
                                                        className={getStatusButtonClass(student._id, 'Present')}
                                                        disabled={loading.action}
                                                    >Present</button>
                                                    <button
                                                         title="Absent"
                                                        onClick={() => handleAttStatusChange(student._id, 'Absent')}
                                                        className={getStatusButtonClass(student._id, 'Absent')}
                                                         disabled={loading.action}
                                                   >Absent</button>
                                                    <button
                                                         title="Tardy"
                                                        onClick={() => handleAttStatusChange(student._id, 'Tardy')}
                                                        className={getStatusButtonClass(student._id, 'Tardy')}
                                                         disabled={loading.action}
                                                   >Tardy</button>
                                                </div>
                                            </td>
                                            {/* ... (Notes and History columns remain same) ... */}
                                             <td className="px-4 py-2">
                                                <input
                                                    type="text" value={att.notes}
                                                    onChange={(e) => handleAttNotesChange(student._id, e.target.value)}
                                                    placeholder="Notes..."
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-sm disabled:bg-gray-100"
                                                    disabled={loading.action}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-sm text-center">
                                                <button
                                                    onClick={() => navigate(`/teacher/subjects/${subjectId}/attendance/students/${student._id}`)}
                                                    className="text-gray-400 hover:text-green-600"
                                                    title="View Attendance History"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                         {filteredStudents.length > itemsPerPage && (
                            <Pagination
                                totalItems={filteredStudents.length}
                                itemsPerPage={itemsPerPage}
                                currentPage={pagination.attendance.currentPage}
                                onPageChange={(page) => handlePageChange('attendance', page)}
                            />
                        )}
                    </div>
                )}
            </div>
        );
     };

    // --- Main Return ---
    // ... (Main loading/error checks remain the same) ...
     if (loading.initial) { return <LoadingSpinner message="Loading subject details..." size="lg" />; }
     if (error.page && !subjectInfo) { return ( /* ... Error display ... */
         <div className="p-6">
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
                 <span>{error.page}</span>
                  <button onClick={() => navigate('/teacher/subjects')} className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Back to Subjects</button>
              </div>
         </div>
     ); }

    return (
        <div className="p-6">
            {/* Subject Header */}
            {/* ... (Header remains the same) ... */}
             <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start">
                 <div>
                     <h1 className="text-3xl font-bold text-gray-800 mb-1">{subjectInfo?.name || 'Loading...'}</h1>
                     <p className="text-lg text-gray-600 mb-2">Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.academicYear || 'N/A'}</p>
                     <p className="text-sm text-gray-500 max-w-xl">{subjectInfo?.description || 'No description.'}</p>
                 </div>
                 <button onClick={() => navigate('/teacher/subjects')} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition self-start" >
                     <FontAwesomeIcon icon={faArrowLeft} /> Back to Subjects
                 </button>
             </div>

            {/* Page Level Error (Non-critical) */}
            {/* ... (Error display remains the same) ... */}
             {error.page && (
                 <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
                    <span>{error.page}</span>
                    <button onClick={() => setErrorState('page', null)} className="font-bold text-red-700 hover:text-red-900">×</button>
                </div>
             )}

            {/* Tabs */}
            {/* ... (Tabs remain the same) ... */}
             <div className="mb-6 border-b border-gray-200">
                 <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                     <button onClick={() => setCurrentTab('students')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${currentTab === 'students' ? 'border-[#81020b] text-[#81020b]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} >
                         <FontAwesomeIcon icon={faUsers} className="mr-2" /> Students ({students.length})
                     </button>
                     <button onClick={() => setCurrentTab('grades')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${currentTab === 'grades' ? 'border-[#81020b] text-[#81020b]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} >
                         <FontAwesomeIcon icon={faGraduationCap} className="mr-2" /> Grades
                     </button>
                      <button onClick={() => setCurrentTab('attendance')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${currentTab === 'attendance' ? 'border-[#81020b] text-[#81020b]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} >
                         <FontAwesomeIcon icon={faCalendarCheck} className="mr-2" /> Attendance
                     </button>
                 </nav>
             </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 min-h-[400px]">
                {currentTab === 'students' && renderStudentsTab()}
                {currentTab === 'grades' && renderGradesTab()}
                {currentTab === 'attendance' && renderAttendanceTab()}
            </div>

            {/* --- Modals --- */}
            {/* ... (Add Student Modal remains the same) ... */}
             {showAddStudentModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                     {/* ... Add Student Modal JSX ... */}
                      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col shadow-xl">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Enroll Existing Student</h3>
                          {error.modal && ( <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">{error.modal}</div> )}
                         <div className="relative mb-4">
                             <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                             <input type="text" placeholder="Search available students..." value={searchQuery} onChange={handleSearchChange} disabled={loading.action} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50" />
                         </div>
                         <div className="flex-grow max-h-64 overflow-y-auto mb-4 border rounded p-2 bg-gray-50">
                              {loading.action && !allStudents.length ? ( <LoadingSpinner message="Loading students..." size="sm" /> )
                               : filteredStudents.length === 0 ? ( <p className="text-gray-500 text-center py-4 text-sm">{searchQuery ? 'No matching students found.' : 'All students already enrolled or list empty.'}</p> )
                               : ( <ul className="space-y-2"> {filteredStudents.map((student) => ( <li key={student._id} className="flex justify-between items-center p-3 rounded-md bg-white border hover:bg-gray-50"> <div> <p className="font-medium text-gray-900 text-sm">{student.name}</p> <p className="text-xs text-gray-500">{student.email} {student.lrn ? `• ${student.lrn}` : ''}</p> </div> <button onClick={() => handleEnrollStudent(student._id)} disabled={loading.action} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center" > {loading.action ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Enroll'} </button> </li> ))} </ul> )}
                         </div>
                         <div className="flex justify-end pt-4 border-t border-gray-200">
                              <button type="button" onClick={() => { setShowAddStudentModal(false); setSearchQuery(''); setErrorState('modal', null); }} disabled={loading.action} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50" > Cancel </button>
                         </div>
                     </div>
                 </div>
            )}
            {/* ... (Delete Confirmation Modal remains the same) ... */}
             <ConfirmationModal
                isOpen={confirmModal.show} title={confirmModal.title} message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                isLoading={loading.action} confirmText="Remove Student"
            />

            {/* Success Modal for Saved Attendance */}
            <SuccessModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                summary={saveSummary}
                date={selectedDate}
            />

        </div>
    );
};

export default SubjectOverview;