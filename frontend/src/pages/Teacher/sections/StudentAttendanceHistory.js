// src/pages/Teacher/sections/StudentAttendanceHistory.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle, faCalendarDay, faChevronDown, faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons'; // Added faTimes
import { useAuth } from '../../../context/authContext';
// Assuming studentService is correctly imported if needed, otherwise use attendanceService.getStudent
import studentService from '../../../services/studentService';
import subjectService from "../../../services/subjectService";
import attendanceService from '../../../services/attendanceService';
import LoadingSpinner from '../../../components/loadingSpinner';

// Helper to get the start of the week (Monday)
const getWeekStart = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0=Sun, 1=Mon, ...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
};

// Helper to get the week number of the month
const getWeekOfMonth = (date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const adjustedDate = date.getDate() + (firstDayWeekday === 0 ? 6 : firstDayWeekday - 1);
    return Math.ceil(adjustedDate / 7);
};

const StudentAttendanceHistory = () => {
    const { id: subjectId, studentId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [studentInfo, setStudentInfo] = useState(null);
    const [subjectInfo, setSubjectInfo] = useState(null); // Added state for subject info
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [error, setError] = useState(null);
    const [expandedMonths, setExpandedMonths] = useState(new Set());
    const [expandedWeeks, setExpandedWeeks] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            if (!subjectId || !studentId || !token) {
                setError('Missing required IDs or token.'); setLoading(false); return;
            }
            try {
                setLoading(true); setError(null);
                const [studentRes, attRes, subjectRes] = await Promise.all([ // Fetch subject info too
                    studentService.getStudentById(studentId, token), // Use studentService
                    attendanceService.getStudentSubjectAttendance(subjectId, studentId, {}, token),
                    subjectService.getSubject(subjectId, token) // Fetch subject details
                ]);

                 const studentData = studentRes.data?.student || studentRes.data || studentRes || null;
                 setStudentInfo(studentData);

                 // Extract subject data
                 const subjectApiData = subjectRes.data || subjectRes;
                 const subjectInnerData = subjectApiData.data || subjectApiData;
                 setSubjectInfo(subjectInnerData.subject || subjectInnerData || null);

                // Safely extract attendance records
                let records = (attRes.data && Array.isArray(attRes.data.data)) ? attRes.data.data : (Array.isArray(attRes.data) ? attRes.data : []);
                setAttendanceRecords(records);

            } catch (err) {
                console.error('Error fetching history:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load history');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [subjectId, studentId, token]);

    const toggleMonth = (monthKey) => {
        setExpandedMonths((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(monthKey)) {
                newSet.delete(monthKey);
                setExpandedWeeks((prevWeeks) => { const n = { ...prevWeeks }; delete n[monthKey]; return n; });
            } else { newSet.add(monthKey); }
            return newSet;
        });
    };
    const toggleWeek = (monthKey, weekKey) => {
        setExpandedWeeks((prev) => {
            const monthWeeks = prev[monthKey] || new Set(); const n = new Set(monthWeeks);
            if (n.has(weekKey)) { n.delete(weekKey); } else { n.add(weekKey); }
            return { ...prev, [monthKey]: n };
        });
    };

    const groupedRecords = useMemo(() => {
        const groups = {};
        attendanceRecords.forEach((record) => {
            const date = new Date(record.date);
            const year = date.getFullYear(); const month = date.getMonth() + 1;
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            const weekNum = getWeekOfMonth(date);
            if (!groups[monthKey]) groups[monthKey] = {};
            if (!groups[monthKey][weekNum]) groups[monthKey][weekNum] = [];
            groups[monthKey][weekNum].push(record);
        });

        const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

        return sortedMonthKeys.map((monthKey) => {
            const monthData = groups[monthKey]; let monthTotal = 0; let monthPresent = 0;
            const sortedWeekKeys = Object.keys(monthData).map(Number).sort((a, b) => a - b);
            const weeksData = sortedWeekKeys.map((weekNum) => {
                const records = monthData[weekNum];
                records.sort((a, b) => new Date(a.date) - new Date(b.date));
                const weekTotal = records.length; const weekPresent = records.filter(r => r.status === 'Present').length;
                monthTotal += weekTotal; monthPresent += weekPresent;
                return { weekNum, weekKey: `${monthKey}-W${weekNum}`, totalCount: weekTotal, presentCount: weekPresent, records };
            });
            return { month: monthKey, monthName: new Date(monthKey + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), totalCount: monthTotal, presentCount: monthPresent, weeks: weeksData };
        });
    }, [attendanceRecords]);

    const getTotals = () => {
        const r = attendanceRecords; const t = r.length; const p = r.filter(a => a.status === 'Present').length; const a = r.filter(a => a.status === 'Absent').length; const ta = r.filter(a => a.status === 'Tardy').length; const o = t > 0 ? ((p / t) * 100).toFixed(1) : 0; return { present:p, absent:a, tardy:ta, total:t, overall:o };
    };
    const { present, absent, tardy, total, overall } = getTotals();
    const clearSelectedDate = () => setSelectedDate(null);

    if (loading) { return <LoadingSpinner message="Loading attendance history..." size="lg" color="green" />; }
    if (error) { return ( <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200"> <div className="flex items-center mb-4"> <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2"/> <h2 className="text-xl font-semibold text-gray-800">Error</h2> </div> <p className="text-gray-600 mb-6">{error}</p> <button onClick={() => navigate(`/teacher/subjects/${subjectId}`)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"> Back </button> </div> ); }

    return (
        <div className="p-4 md:p-6 w-full max-w-none min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {studentInfo?.name || 'Student'} - Attendance History
                </h1>
                <button onClick={() => navigate(`/teacher/subjects/${subjectId}`)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition self-start text-sm" > <FontAwesomeIcon icon={faArrowLeft} /> Back </button>
            </div>

            {/* Student/Subject Info */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm text-sm">
                 <p className="text-gray-700"><span className="font-medium">Student Email:</span> {studentInfo?.email || 'N/A'}</p>
                 <p className="text-gray-500"><span className="font-medium">Subject:</span> {subjectInfo?.name || 'Loading...'} (Grade {subjectInfo?.gradeLevel || 'N/A'})</p>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                 <div className="p-4 rounded-lg border text-center bg-green-50 border-green-200"> <h3 className="text-2xl font-bold text-green-600">{present}</h3> <p className="text-sm font-medium text-green-700">Present</p> </div>
                 <div className="p-4 rounded-lg border text-center bg-red-50 border-red-200"> <h3 className="text-2xl font-bold text-red-600">{absent}</h3> <p className="text-sm font-medium text-red-700">Absent</p> </div>
                 <div className="p-4 rounded-lg border text-center bg-yellow-50 border-yellow-200"> <h3 className="text-2xl font-bold text-yellow-600">{tardy}</h3> <p className="text-sm font-medium text-yellow-700">Tardy</p> </div>
                 <div className="p-4 rounded-lg border text-center bg-blue-50 border-blue-200"> <h3 className="text-2xl font-bold text-blue-600">{overall}%</h3> <p className="text-sm font-medium text-blue-700">Overall Rate</p> <p className="text-xs text-blue-500">({total} sessions)</p> </div>
            </div>

            {/* No Records Message */}
            {total === 0 && ( <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 mb-6"> <p className="text-lg">No attendance records found.</p> </div> )}

            {/* Monthly Accordions */}
            {total > 0 && (
                <div className="space-y-4">
                    {groupedRecords.map((group) => (
                        <div key={group.month} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            {/* Month Header */}
                            <div className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition flex justify-between items-center border-b border-gray-100" onClick={() => toggleMonth(group.month)} >
                                <h3 className="text-md md:text-lg font-semibold text-gray-700">{group.monthName}</h3>
                                <div className="text-right text-xs text-gray-600 flex items-center gap-2">
                                    <p>Present: {group.presentCount} / {group.totalCount}</p>
                                    <FontAwesomeIcon icon={expandedMonths.has(group.month) ? faChevronDown : faChevronRight} className="text-sm transition-transform duration-200" />
                                </div>
                            </div>
                            {/* Month Content (Weeks) */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedMonths.has(group.month) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`} >
                                <div className="p-2 md:p-4 space-y-2 bg-gray-50/50">
                                    {group.weeks.map((week) => (
                                        <div key={week.weekKey} className="bg-white rounded border border-gray-200 overflow-hidden">
                                            {/* Week Header */}
                                            <div className="p-2 md:p-3 cursor-pointer hover:bg-gray-100 transition flex justify-between items-center" onClick={() => toggleWeek(group.month, week.weekKey)} >
                                                <h4 className="text-sm font-semibold text-gray-600">Week {week.weekNum}</h4>
                                                <div className="text-right text-xs text-gray-500 flex items-center gap-2">
                                                    <p>Present: {week.presentCount} / {week.totalCount}</p>
                                                    <FontAwesomeIcon icon={expandedWeeks[group.month]?.has(week.weekKey) ? faChevronDown : faChevronRight} className="text-xs transition-transform duration-200" />
                                                </div>
                                            </div>
                                            {/* Week Content (Days) */}
                                            <div className={`transition-all duration-300 ease-in-out border-t border-gray-100 ${expandedWeeks[group.month]?.has(week.weekKey) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`} >
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3">
                                                    {week.records.map((record) => {
                                                        const date = new Date(record.date);
                                                        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                                                        let statusClass = 'bg-gray-100 text-gray-700 border-gray-300';
                                                        if (record.status === 'Present') statusClass = 'bg-green-100 text-green-800 border-green-300';
                                                        if (record.status === 'Absent') statusClass = 'bg-red-100 text-red-800 border-red-300';
                                                        if (record.status === 'Tardy') statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';

                                                        return (
                                                            <div
                                                                key={record._id || record.date}
                                                                className={`flex flex-col items-center p-2 rounded border shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition transform duration-150 ${statusClass}`}
                                                                onClick={(e) => { e.stopPropagation(); setSelectedDate(date); }}
                                                                title={`Click for details: ${dayLabel}`}
                                                            >
                                                                <FontAwesomeIcon icon={faCalendarDay} className="mb-1 text-xs opacity-60"/>
                                                                <span className="text-xs font-medium text-center mb-0.5">{dayLabel}</span>
                                                                <span className="text-[10px] font-semibold uppercase tracking-wide">{record.status}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Date Details Popup Modal */}
            {selectedDate && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                        onClick={clearSelectedDate}
                    />
                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold text-gray-800">Details for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                    <button 
                                        onClick={clearSelectedDate} 
                                        className="text-gray-500 hover:text-gray-700 text-xl font-bold p-1 rounded-full hover:bg-gray-100 transition"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 text-sm text-gray-700 space-y-3">
                                {(() => {
                                    const record = attendanceRecords.find((r) => new Date(r.date).toDateString() === selectedDate.toDateString());
                                    return record ? (
                                        <>
                                            <div className="space-y-2">
                                                <p><strong>Status:</strong> <span className={`inline-block capitalize px-3 py-1 rounded-full text-sm font-semibold ml-2 ${ record.status === 'Present' ? 'bg-green-100 text-green-800' : record.status === 'Absent' ? 'bg-red-100 text-red-800' : record.status === 'Tardy' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800' }`}>{record.status}</span></p>
                                                <p><strong>Notes:</strong> <span className="">{record.notes || 'No notes provided'}</span></p>
                                            </div>
                                        </>
                                    ) : <p className="text-gray-500 italic">No attendance record found for this date.</p>;
                                })()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentAttendanceHistory;