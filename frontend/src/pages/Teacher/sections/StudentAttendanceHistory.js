// src/pages/Teacher/sections/StudentAttendanceHistory.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle, faCalendarDay, faChevronDown, faChevronRight, faTimes, faCheckCircle, faCircleXmark, faClock, faChartPie } from '@fortawesome/free-solid-svg-icons'; // Added icons
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

                 const studentData = studentRes?.student || studentRes?.data?.student || studentRes?.data || studentRes || null;
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
        <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8 min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#410b13] via-[#8d1322] to-[#f25c74] text-white shadow-2xl">
                <div className="relative z-10 space-y-8 p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-4 max-w-2xl">
                            <button
                                onClick={() => navigate(`/teacher/subjects/${subjectId}`)}
                                className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/25 transition"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-[0.7rem]" />
                                Back to subject
                            </button>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold md:text-4xl text-white">{studentInfo?.name || 'Student'} Attendance History</h1>
                                <p className="text-sm text-white/90 max-w-xl">
                                    Track daily presence, absences, and tardiness across the term. Expand a month or week to explore detailed records.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25">
                            <p className="text-xs uppercase tracking-wider text-white">Student contact</p>
                            <p className="mt-3 text-lg font-semibold text-white break-all">
                                {studentInfo?.email?.trim() || studentInfo?.guardianEmail?.trim() || studentInfo?.user?.email?.trim() || studentInfo?.name || 'Not provided'}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25">
                            <p className="text-xs uppercase tracking-wider text-white">Subject</p>
                            <p className="mt-3 text-lg font-semibold text-white">
                                {subjectInfo?.name || 'Loading...'}
                            </p>
                            <p className="mt-1 text-sm text-white/80">Grade {subjectInfo?.gradeLevel || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25">
                            <p className="text-xs uppercase tracking-wider text-white">Sessions logged</p>
                            <p className="mt-3 text-3xl font-semibold text-white" style={{ textShadow: '0 8px 18px rgba(0,0,0,0.35)' }}>{total}</p>
                            <p className="mt-1 text-xs text-white/80">Individual attendance events</p>
                        </div>
                        <div className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25">
                            <p className="text-xs uppercase tracking-wider text-white">Overall presence</p>
                            <p className="mt-3 text-3xl font-semibold text-white" style={{ textShadow: '0 8px 18px rgba(0,0,0,0.35)' }}>{overall}%</p>
                            <p className="mt-1 text-xs text-white/80">Present across recorded sessions</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-xl" />
                    <p className="text-xs uppercase tracking-wider text-green-600">Present</p>
                    <p className="mt-2 text-3xl font-semibold text-green-700">{present}</p>
                    <p className="text-xs text-green-500 mt-1">Marked as present</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
                    <FontAwesomeIcon icon={faCircleXmark} className="text-red-500 text-xl" />
                    <p className="text-xs uppercase tracking-wider text-red-600">Absent</p>
                    <p className="mt-2 text-3xl font-semibold text-red-700">{absent}</p>
                    <p className="text-xs text-red-500 mt-1">Days missed</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                    <FontAwesomeIcon icon={faClock} className="text-amber-500 text-xl" />
                    <p className="text-xs uppercase tracking-wider text-amber-600">Tardy</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-700">{tardy}</p>
                    <p className="text-xs text-amber-500 mt-1">Late arrivals recorded</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                    <FontAwesomeIcon icon={faChartPie} className="text-sky-500 text-xl" />
                    <p className="text-xs uppercase tracking-wider text-blue-600">Overall rate</p>
                    <p className="mt-2 text-3xl font-semibold text-blue-700">{overall}%</p>
                    <p className="text-xs text-blue-500 mt-1">Across {total} sessions</p>
                </div>
            </div>

            {/* No Records Message */}
            {total === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-300">
                    <p className="text-lg">No attendance records found.</p>
                    <p className="mt-2 text-sm">Records will appear here once attendance is logged for this student.</p>
                </div>
            )}

            {/* Monthly Accordions */}
            {total > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200">
                    {groupedRecords.map((group, monthIndex) => (
                        <div key={group.month} className={monthIndex > 0 ? 'border-t border-gray-100' : ''}>
                            {/* Month Header */}
                            <button
                                type="button"
                                onClick={() => toggleMonth(group.month)}
                                className="w-full px-4 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{group.monthName}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Present {group.presentCount} of {group.totalCount} recorded days</p>
                                </div>
                                <span className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                    <FontAwesomeIcon icon={expandedMonths.has(group.month) ? faChevronDown : faChevronRight} />
                                </span>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMonths.has(group.month) ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                <div className="px-4 pb-4 space-y-3 bg-gray-50/60">
                                    {group.weeks.map((week) => (
                                        <div key={week.weekKey} className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => toggleWeek(group.month, week.weekKey)}
                                                className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-gray-50 transition"
                                            >
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700">Week {week.weekNum}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{week.presentCount} present / {week.totalCount} sessions</p>
                                                </div>
                                                <span className="h-7 w-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                                    <FontAwesomeIcon icon={expandedWeeks[group.month]?.has(week.weekKey) ? faChevronDown : faChevronRight} />
                                                </span>
                                            </button>

                                            <div className={`grid gap-2 px-4 pb-4 transition-all duration-300 ease-in-out ${expandedWeeks[group.month]?.has(week.weekKey) ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 pt-3' : 'grid-cols-1 max-h-0 overflow-hidden'}`}>
                                                {expandedWeeks[group.month]?.has(week.weekKey) && week.records.map((record) => {
                                                    const date = new Date(record.date);
                                                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                                                    let statusClass = 'bg-gray-100 text-gray-700 border-gray-300';
                                                    if (record.status === 'Present') statusClass = 'bg-green-100 text-green-800 border-green-300';
                                                    if (record.status === 'Absent') statusClass = 'bg-red-100 text-red-800 border-red-300';
                                                    if (record.status === 'Tardy') statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={record._id || record.date}
                                                            onClick={() => setSelectedDate(date)}
                                                            className={`flex flex-col items-center rounded-xl border px-3 py-3 text-center shadow-sm transition hover:shadow-md hover:scale-[1.02] ${statusClass}`}
                                                            title={`Click for details: ${dayLabel}`}
                                                        >
                                                            <FontAwesomeIcon icon={faCalendarDay} className="mb-1 text-xs opacity-70" />
                                                            <span className="text-xs font-semibold">{dayLabel}</span>
                                                            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{record.status}</span>
                                                        </button>
                                                    );
                                                })}
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
                        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={clearSelectedDate}
                    />
                    {/* Modal */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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