import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faUsers, faGraduationCap, faCalendarCheck, faPlus,
    faSearch, faSpinner, faDownload, faUpload, faSave, faCalendar,
    faExclamationTriangle, faCheckCircle, faTimesCircle
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
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
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

const GradeModal = ({ isOpen, onClose, student, finalGrade, onChange, onSave, saving }) => {
    if (!isOpen || !student) return null;
    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-end border-b border-gray-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                        title="Close"
                    >
                        <FontAwesomeIcon icon={faTimesCircle} />
                    </button>
                </div>
                <div className="px-6 py-6 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Final Grade
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={finalGrade ?? ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                            placeholder="Enter final grade"
                        />
                    </label>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0209] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                        {saving ? "Saving…" : "Save grades"}
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
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
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
    const [gradeModal, setGradeModal] = useState({ isOpen: false, student: null });
    const [gradeInputs, setGradeInputs] = useState({ finalGrade: '' });
    const [savingGrade, setSavingGrade] = useState(false);
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

    const gradeOverview = useMemo(() => {
        const numericGrades = Array.isArray(grades)
            ? grades
                .map((gradeItem) => {
                    const numericValue = Number(gradeItem?.finalGrade);
                    return Number.isNaN(numericValue) ? null : numericValue;
                })
                .filter((value) => value !== null)
            : [];

        if (numericGrades.length === 0) {
            return { average: null, passing: 0, failing: 0 };
        }

        const passing = numericGrades.filter((grade) => grade >= 75).length;
        const failing = numericGrades.length - passing;
        const average = numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length;

        return { average, passing, failing };
    }, [grades]);

    const attendanceOverview = useMemo(() => {
        const records = attendanceData ? Object.values(attendanceData) : [];
        const counts = { Present: 0, Absent: 0, Tardy: 0 };
        let marked = 0;

        records.forEach((entry) => {
            if (entry?.status && Object.prototype.hasOwnProperty.call(counts, entry.status)) {
                counts[entry.status] += 1;
                marked += 1;
            }
        });

        const presentRate = marked > 0 ? Math.round((counts.Present / marked) * 100) : null;

        return { ...counts, marked, presentRate };
    }, [attendanceData]);

    const selectedDateLabel = useMemo(() => {
        if (!selectedDate) return 'No date selected';
        const parsed = new Date(selectedDate);
        if (Number.isNaN(parsed.getTime())) return selectedDate;
        return parsed.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, [selectedDate]);

    const managementCards = useMemo(() => {
        const gradeStat = gradeOverview.average !== null ? `${gradeOverview.average.toFixed(1)} avg` : 'No grades yet';
        const gradeSub = gradeOverview.average !== null
            ? `${gradeOverview.passing} passing • ${gradeOverview.failing} attention`
            : 'Record grades to see insights.';

        const attendanceStat = attendanceOverview.presentRate !== null
            ? `${attendanceOverview.presentRate}% present`
            : 'No records yet';
        const attendanceSub = attendanceOverview.marked > 0
            ? `${attendanceOverview.marked} students recorded`
            : 'Track daily attendance here.';

        return [
            {
                key: 'students',
                title: 'Students',
                stat: `${students.length} enrolled`,
                description: 'Manage your roster, invitations, and guardians.',
                icon: faUsers,
                accentBg: 'bg-rose-100',
                accentText: 'text-rose-600',
            },
            {
                key: 'grades',
                title: 'Grades',
                stat: gradeStat,
                description: gradeSub,
                icon: faGraduationCap,
                accentBg: 'bg-indigo-100',
                accentText: 'text-indigo-600',
            },
            {
                key: 'attendance',
                title: 'Attendance',
                stat: attendanceStat,
                description: attendanceSub,
                icon: faCalendarCheck,
                accentBg: 'bg-emerald-100',
                accentText: 'text-emerald-600',
            },
        ];
    }, [students.length, gradeOverview, attendanceOverview]);

    // --- Helper Functions ---
    const setLoadingState = (key, value) => setLoading(prev => ({ ...prev, [key]: value }));
    const setErrorState = (key, value) => setError(prev => ({ ...prev, [key]: value }));

    const openGradeModal = (student) => {
        if (!student) return;
        const existingGrade = Array.isArray(grades)
            ? grades.find((grade) => {
                const gradeStudentId = grade.student?._id?.toString() || grade.student?.toString();
                return gradeStudentId === student._id;
            })
            : null;

        setGradeInputs({ finalGrade: existingGrade?.finalGrade ?? '' });
        setGradeModal({ isOpen: true, student });
    };

    const closeGradeModal = () => {
        setGradeModal({ isOpen: false, student: null });
        setGradeInputs({ finalGrade: '' });
        setSavingGrade(false);
    };

    const handleGradeInputChange = (value) => {
        if (value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
            setGradeInputs({ finalGrade: value });
        }
    };

    const handleSaveGrades = async () => {
        if (!gradeModal.student) return;
        try {
            setSavingGrade(true);
            const payload = {
                finalGrade: gradeInputs.finalGrade === '' ? null : Number(gradeInputs.finalGrade),
            };

            await gradeService.updateStudentGrade(subjectId, gradeModal.student._id, payload, token);
            await fetchInitialData();
            closeGradeModal();
        } catch (err) {
            console.error('Error saving grade', err);
            setErrorState('page', err.response?.data?.message || err.message || 'Failed to save grade');
        } finally {
            setSavingGrade(false);
        }
    };

    // --- Data Fetching ---
    const loadAttendanceForDate = useCallback(async (date, currentStudents) => {
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

            const storedAttendance = {};
            attendances.forEach(record => {
                const studentKey = record.student?._id || record.student;
                if (!studentKey) return;
                storedAttendance[studentKey] = {
                    status: record.status,
                    notes: record.notes || ''
                };
            });

            const updatedData = {}; // Start fresh for the new date
            currentStudents.forEach(student => {
                const studentId = student._id;
                if (studentId) {
                    updatedData[studentId] = storedAttendance[studentId] || { status: '', notes: '' };
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
                 await loadAttendanceForDate(selectedDate, fetchedStudents);
            }

        } catch (err) {
            console.error('💥 Initial fetch error:', err);
            setErrorState('page', err.response?.data?.message || err.message || 'Failed to load subject data');
        } finally {
            setLoadingState('initial', false);
        }
    }, [subjectId, token, selectedDate, loadAttendanceForDate]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        // Reload attendance only if students exist for the subject
        if (students.length > 0) {
            loadAttendanceForDate(selectedDate, students);
        } else {
             // If students list becomes empty, clear attendance data
             setAttendanceData({});
        }
        // Reset selection when date changes
        setSelectedAttendanceStudents(new Set());
    }, [selectedDate, students, loadAttendanceForDate]);

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
        const sections = Array.from(new Set(students.map((student) => student.section).filter(Boolean)));
        const guardiansWithContact = students.filter((student) => student.parentName).length;
        const recentEnrollments = students
            .slice()
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 3)
            .map((student) => student.name);

        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total enrolled</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{students.length}</p>
                        <p className="mt-3 text-xs text-gray-500">Active learners in this subject.</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sections represented</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{sections.length}</p>
                        <p className="mt-3 text-xs text-gray-500 line-clamp-1">{sections.length > 0 ? sections.join(', ') : 'Not specified'}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Guardians on file</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{guardiansWithContact}</p>
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2">{recentEnrollments.length > 0 ? `Latest enrollments: ${recentEnrollments.join(', ')}` : 'Invite students to join the class.'}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 md:p-5 shadow-inner">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students by name, email, or LRN..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-2 text-sm shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                disabled={loading.action}
                            />
                        </div>
                        <button
                            onClick={() => { setShowAddStudentModal(true); fetchAllStudentsForModal(); }}
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#81020b] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#6a0209] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={loading.action}
                        >
                            <FontAwesomeIcon icon={faPlus} /> Enroll Student
                        </button>
                    </div>
                </div>

                {loading.action && students.length === 0 && <LoadingSpinner message="Processing..." size="sm" />}
                {filteredStudentsTab.length === 0 && !loading.initial ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
                        {studentSearchQuery ? 'No students match the current search.' : 'There are no students enrolled for this subject yet.'}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Section</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">LRN</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedStudents.map((student) => (
                                        <tr key={student._id} className="hover:bg-gray-50/70">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{student.section || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{student.lrn || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <button
                                                    onClick={() => openDeleteConfirmation(student)}
                                                    disabled={loading.action}
                                                    className="rounded-full border border-red-100 px-3 py-1 text-xs font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    title="Remove Student"
                                                >
                                                    Unenroll
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredStudentsTab.length > itemsPerPage && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                                <Pagination
                                    totalItems={filteredStudentsTab.length}
                                    itemsPerPage={itemsPerPage}
                                    currentPage={pagination.students.currentPage}
                                    onPageChange={(page) => handlePageChange('students', page)}
                                />
                            </div>
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
            <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 md:p-5 shadow-inner">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="relative flex-1">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by student name or email..."
                                value={gradeSearchQuery}
                                onChange={(e) => setGradeSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-2 text-sm shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                disabled={loading.action}
                            />
                        </div>
                        <select
                            value={gradeStatusFilter}
                            onChange={(e) => setGradeStatusFilter(e.target.value)}
                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                            disabled={loading.action}
                        >
                            <option value="All">All Grades</option>
                            <option value="Passing">Passing ≥ 75</option>
                            <option value="Failing">Failing &lt; 75</option>
                        </select>
                        <button
                            onClick={handleExportGrades}
                            disabled={loading.action}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading.action && currentTab === 'grades' ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faDownload} />}
                            Export XLSX
                        </button>
                    </div>
                </div>

                {filteredGrades.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
                        {gradeSearchQuery || gradeStatusFilter !== 'All'
                            ? 'No grade records match the current filters.'
                            : 'No grade records have been saved for this subject yet.'}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Final Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Letter</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Remarks</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedGrades.map((gradeItem) => {
                                        const studentId = gradeItem.student?._id || gradeItem.student;
                                        if (!studentId) return null;
                                        const student = students.find((s) => s._id === studentId);
                                        const gradeValue = Number(gradeItem.finalGrade);
                                        const formattedGrade = Number.isNaN(gradeValue) ? 'N/A' : gradeValue.toFixed(1);
                                        const isPassing = !Number.isNaN(gradeValue) && gradeValue >= 75;

                                        return (
                                            <tr key={gradeItem._id} className="hover:bg-gray-50/70">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{student?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{student?.email || 'N/A'}</td>
                                                <td className={`px-6 py-4 text-sm font-semibold ${isPassing ? 'text-green-600' : 'text-red-600'}`}>{formattedGrade}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{gradeItem.letterGrade || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{gradeItem.remarks || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {student ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => navigate(`/teacher/subjects/${subjectId}/grades/${student._id}/analytics`)}
                                                                className="rounded-full border border-emerald-100 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                disabled={loading.action}
                                                            >
                                                                Details
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Student record unavailable</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredGrades.length > itemsPerPage && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                                <Pagination
                                    totalItems={filteredGrades.length}
                                    itemsPerPage={itemsPerPage}
                                    currentPage={pagination.grades.currentPage}
                                    onPageChange={(page) => handlePageChange('grades', page)}
                                />
                            </div>
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
            <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">Attendance for {selectedDateLabel}</span>
                            <span className="text-gray-500">Present: {attendanceOverview.Present} • Absent: {attendanceOverview.Absent} • Tardy: {attendanceOverview.Tardy}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label htmlFor="attendance-date" className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    <FontAwesomeIcon icon={faCalendar} /> Date
                                </label>
                                <input
                                    id="attendance-date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                                    disabled={loading.attendance || loading.action}
                                />
                                {loading.attendance && <FontAwesomeIcon icon={faSpinner} className="ml-2 animate-spin text-[#81020b]" />}
                            </div>
                            <button
                                onClick={handleSaveAttendance}
                                disabled={loading.action || loading.attendance}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading.action ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                                {loading.action ? 'Saving…' : 'Save attendance'}
                            </button>
                        </div>
                    </div>
                    {error.attendance && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error.attendance}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 md:p-5 shadow-inner">
                    <div className="flex flex-col gap-4 md:flex-row">
                        <div className="relative flex-1">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students by name, email, or LRN..."
                                value={attendanceSearchQuery}
                                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white/80 pl-10 pr-4 py-2 text-sm shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20 disabled:cursor-not-allowed"
                                disabled={loading.attendance || loading.action}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
                            disabled={loading.attendance || loading.action}
                        >
                            <option value="All">All statuses</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Tardy">Tardy</option>
                        </select>
                    </div>
                </div>

                {safeStudents.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="select-all-att"
                                checked={allSelectedOnPage}
                                onChange={() => toggleSelectAllAttendance(paginatedAttendanceStudents)}
                                className="h-4 w-4 rounded border-gray-300 text-[#81020b] focus:ring-[#81020b]"
                                title={allSelectedOnPage ? 'Deselect all on page' : 'Select all on page'}
                            />
                            <label htmlFor="select-all-att" className="text-gray-700">
                                {selectedAttendanceStudents.size > 0 ? `${selectedAttendanceStudents.size} selected` : 'Select everyone on this page'}
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${selectedAttendanceStudents.size === 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                                Mark selection as
                            </span>
                            <button
                                onClick={() => bulkUpdateAttStatus('Present')}
                                disabled={selectedAttendanceStudents.size === 0}
                                className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Present
                            </button>
                            <button
                                onClick={() => bulkUpdateAttStatus('Absent')}
                                disabled={selectedAttendanceStudents.size === 0}
                                className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Absent
                            </button>
                            <button
                                onClick={() => bulkUpdateAttStatus('Tardy')}
                                disabled={selectedAttendanceStudents.size === 0}
                                className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Tardy
                            </button>
                        </div>
                    </div>
                )}

                {filteredStudents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
                        {attendanceSearchQuery || statusFilter !== 'All'
                            ? 'No students match the current filters.'
                            : 'Enroll students to begin tracking attendance.'}
                    </div>
                ) : loading.attendance ? (
                    <LoadingSpinner message="Loading attendance data..." size="md" />
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Select</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">History</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedAttendanceStudents.map((student) => {
                                        const att = attendanceData[student._id] || { status: '', notes: '' };
                                        const isSelected = selectedAttendanceStudents.has(student._id);

                                        return (
                                            <tr key={student._id} className={isSelected ? 'bg-green-50/70' : 'hover:bg-gray-50/70'}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleAttStudentSelection(student._id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[#81020b] focus:ring-[#81020b]"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.name}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            title="Present"
                                                            onClick={() => handleAttStatusChange(student._id, 'Present')}
                                                            className={getStatusButtonClass(student._id, 'Present')}
                                                            disabled={loading.action}
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            title="Absent"
                                                            onClick={() => handleAttStatusChange(student._id, 'Absent')}
                                                            className={getStatusButtonClass(student._id, 'Absent')}
                                                            disabled={loading.action}
                                                        >
                                                            Absent
                                                        </button>
                                                        <button
                                                            title="Tardy"
                                                            onClick={() => handleAttStatusChange(student._id, 'Tardy')}
                                                            className={getStatusButtonClass(student._id, 'Tardy')}
                                                            disabled={loading.action}
                                                        >
                                                            Tardy
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={att.notes}
                                                        onChange={(e) => handleAttNotesChange(student._id, e.target.value)}
                                                        placeholder="Notes..."
                                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20 disabled:bg-gray-100"
                                                        disabled={loading.action}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    <button
                                                        onClick={() => navigate(`/teacher/subjects/${subjectId}/attendance/students/${student._id}`)}
                                                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:border-[#81020b] hover:bg-[#81020b]/10 hover:text-[#81020b]"
                                                        title="View attendance history"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredStudents.length > itemsPerPage && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                                <Pagination
                                    totalItems={filteredStudents.length}
                                    itemsPerPage={itemsPerPage}
                                    currentPage={pagination.attendance.currentPage}
                                    onPageChange={(page) => handlePageChange('attendance', page)}
                                />
                            </div>
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
        <div className="space-y-6 bg-gray-50/60 p-4 md:p-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81020b] via-[#b6232e] to-[#4b0206] text-white shadow-2xl">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)' }} aria-hidden="true" />
                <div className="relative z-10 space-y-6 p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                                Subject overview
                            </div>
                            <h1 className="text-3xl font-bold text-white md:text-4xl">{subjectInfo?.name || 'Loading subject…'}</h1>
                            <p className="text-sm md:text-base text-white">
                                Grade {subjectInfo?.gradeLevel || 'N/A'} • {subjectInfo?.academicYear || 'Academic year unavailable'}
                            </p>
                            <p className="text-sm text-white">
                                {subjectInfo?.description || 'No description has been provided for this subject yet.'}
                            </p>
                        </div>
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                            <button
                                onClick={() => navigate('/teacher/subjects')}
                                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} /> Back to subjects
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="group rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white">Enrolled students</p>
                                    <p className="mt-2 text-2xl font-bold">{students.length}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg"><FontAwesomeIcon icon={faUsers} /></span>
                            </div>
                            <p className="mt-3 text-xs text-white">Active learners in this class.</p>
                        </div>
                        <div className="group rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white">Average grade</p>
                                    <p className="mt-2 text-2xl font-bold">{gradeOverview.average !== null ? gradeOverview.average.toFixed(1) : '—'}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg"><FontAwesomeIcon icon={faGraduationCap} /></span>
                            </div>
                            <p className="mt-3 text-xs text-white">
                                {gradeOverview.average !== null
                                    ? `${gradeOverview.passing} passing • ${gradeOverview.failing} needing attention`
                                    : 'No grades recorded yet.'}
                            </p>
                        </div>
                        <div className="group rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white">Attendance today</p>
                                    <p className="mt-2 text-2xl font-bold">{attendanceOverview.presentRate !== null ? `${attendanceOverview.presentRate}%` : '—'}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg"><FontAwesomeIcon icon={faCalendarCheck} /></span>
                            </div>
                            <p className="mt-3 text-xs text-white">
                                {attendanceOverview.marked > 0
                                    ? `${attendanceOverview.marked} marked on ${selectedDateLabel}`
                                    : 'No attendance recorded for the selected date.'}
                            </p>
                        </div>
                        <div className="group rounded-2xl border border-dashed border-white/40 bg-white/10 px-5 py-4 text-white backdrop-blur transition hover:bg-white/20">
                            <p className="text-xs font-semibold uppercase tracking-wider text-white">Quick notes</p>
                            <p className="mt-2 text-xs leading-relaxed text-white">
                                Use the tabs below to manage enrollments, update grades, and finalize attendance—all in one place.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {error.page && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
                    <div className="flex items-start justify-between">
                        <span>{error.page}</span>
                        <button onClick={() => setErrorState('page', null)} className="ml-4 text-lg font-bold leading-none text-red-500 transition hover:text-red-700">×</button>
                    </div>
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-3" aria-label="Subject management tabs">
                {managementCards.map((card) => {
                    const isActive = currentTab === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => setCurrentTab(card.key)}
                            aria-pressed={isActive}
                            className={`relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-offset-2 ${isActive ? 'border-[#81020b]/50 shadow-xl ring-2 ring-[#81020b]/20' : 'border-gray-100 shadow-sm hover:-translate-y-0.5 hover:shadow-lg'}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${card.accentBg} ${card.accentText} text-lg transition ${isActive ? 'scale-105 shadow-inner shadow-white/40' : ''}`}>
                                        <FontAwesomeIcon icon={card.icon} />
                                    </div>
                                </div>
                                <FontAwesomeIcon icon={faArrowLeft} className={`transform text-sm ${isActive ? '-rotate-45 text-[#81020b]' : 'rotate-135 text-gray-300'}`} />
                            </div>
                            <div className="mt-4 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-400">{card.title}</span>
                                    {isActive && <span className="rounded-full bg-[#81020b]/10 px-2 py-0.5 text-xs font-semibold text-[#81020b]">Active</span>}
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">{card.stat}</h2>
                                <p className="text-sm text-gray-500">{card.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-xl ring-1 ring-black/5 md:p-8">
                {currentTab === 'students' && renderStudentsTab()}
                {currentTab === 'grades' && renderGradesTab()}
                {currentTab === 'attendance' && renderAttendanceTab()}
            </div>

            {/* --- Modals --- */}
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

            <GradeModal
                isOpen={gradeModal.isOpen}
                onClose={closeGradeModal}
                student={gradeModal.student}
                finalGrade={gradeInputs.finalGrade === '' ? '' : Number(gradeInputs.finalGrade)}
                onChange={handleGradeInputChange}
                onSave={handleSaveGrades}
                saving={savingGrade}
            />
        </div>
    );
};

export default SubjectOverview;