// sections/StudentAttendanceHistory.jsx (UI Fixes: Nested accordion structure for months > weeks > days.
// Each month/week shows present totals and expand/collapse. Days remain clickable for details.
// Enabled full-width layout for immersive view. Ensured details panel only shows if selectedDate has record or not.
// Minor: Added subtle styling matches from screenshot (e.g., card borders, text colors). Fixed contradictory message display.
// Updates: Reduced accordion header sizes (padding, fonts). Added smooth expand/collapse animations using CSS transitions.)
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/authContext';
import attendanceService from '../../../services/attendanceService';
import LoadingSpinner from '../../../components/loadingSpinner';

const getWeekStart = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const StudentAttendanceHistory = () => {
  const { id: subjectId, studentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // For details panel
  const [error, setError] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId || !studentId || !token) {
        setError('Missing required data.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch student info and all attendance for this subject/student (no date filter for full history)
        const [studentRes, attRes] = await Promise.all([
          attendanceService.getStudent(studentId, token),
          attendanceService.getStudentSubjectAttendance(subjectId, studentId, {}, token) // {} for no date filter
        ]);

        // Handle student response (adjust based on API structure, e.g., res.data or direct)
        const student = studentRes.data?.student || studentRes || null;
        setStudentInfo(student);

        // Handle attendance response (data is array of attendances; assume populated student if backend does)
        let records = attRes.data || attRes || [];
        if (!Array.isArray(records)) records = []; // Ensure array

        // If backend doesn't populate, student info is already fetched separately
        setAttendanceRecords(records);

        // Log totals
        const totalSessions = records.length;
        const presents = records.filter(a => a.status === 'Present').length;
        const absents = records.filter(a => a.status === 'Absent').length;
        const tardies = records.filter(a => a.status === 'Tardy').length;
        const overall = totalSessions > 0 ? ((presents / totalSessions) * 100).toFixed(1) : 0;
        console.log(`Totals - Present: ${presents}, Absent: ${absents}, Tardy: ${tardies}, Overall: ${overall}%`);
      } catch (err) {
        console.error('Error fetching attendance history:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load attendance history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, studentId, token]);

  // Toggle month expansion
  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
        setExpandedWeeks((prevWeeks) => {
          const newObj = { ...prevWeeks };
          delete newObj[monthKey];
          return newObj;
        });
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  // Toggle week expansion
  const toggleWeek = (monthKey, weekKey) => {
    setExpandedWeeks((prev) => {
      const monthWeeks = prev[monthKey] || new Set();
      const newSet = new Set(monthWeeks);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return { ...prev, [monthKey]: newSet };
    });
  };

  // Group records by month (YYYY-MM key), then by week, and prepare display data
  const groupedRecords = useMemo(() => {
    const groups = {};
    attendanceRecords.forEach((record) => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(record);
    });

    // Sort records within each month by date descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // Sort months descending (most recent first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => {
      const records = groups[key];
      const weekGroups = {};
      records.forEach((record) => {
        const weekStart = getWeekStart(record.date);
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = { weekStart, weekKey, records: [] };
        }
        weekGroups[weekKey].records.push(record);
      });

      // Compute totals and sort records for each week
      Object.values(weekGroups).forEach((week) => {
        week.records.sort((a, b) => new Date(b.date) - new Date(a.date));
        week.totalCount = week.records.length;
        week.presentCount = week.records.filter((r) => r.status === 'Present').length;
      });

      // Sort weeks by weekStart ascending (earliest first)
      const sortedWeeks = Object.keys(weekGroups).sort((a, b) => new Date(a) - new Date(b));

      const totalCount = records.length;
      const presentCount = records.filter((r) => r.status === 'Present').length;

      return {
        month: key,
        monthName: new Date(key + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalCount,
        presentCount,
        weeks: sortedWeeks.map((wKey) => weekGroups[wKey]),
      };
    });
  }, [attendanceRecords]);

  // Get totals for display
  const getTotals = () => {
    const records = attendanceRecords;
    const total = records.length;
    const present = records.filter((a) => a.status === 'Present').length;
    const absent = records.filter((a) => a.status === 'Absent').length;
    const tardy = records.filter((a) => a.status === 'Tardy').length;
    const overall = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return { present, absent, tardy, total, overall };
  };

  const { present, absent, tardy, total, overall } = getTotals();

  const clearSelectedDate = () => setSelectedDate(null);

  if (loading) {
    return <LoadingSpinner message="Loading attendance history..." size="lg" color="green" fullScreen={false} />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Error</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-none min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {studentInfo?.name || 'Student'} - Attendance History
        </h1>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back
        </button>
      </div>

      {/* Student Info */}
      {studentInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg text-gray-700">Email: {studentInfo.email || 'N/A'}</p>
          <p className="text-sm text-gray-500">Grade: {studentInfo.gradeLevel || 'N/A'}</p>
        </div>
      )}

      {/* Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
          <h3 className="text-2xl font-bold text-green-600">{present}</h3>
          <p className="text-sm text-green-700">Present</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
          <h3 className="text-2xl font-bold text-red-600">{absent}</h3>
          <p className="text-sm text-red-700">Absent</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
          <h3 className="text-2xl font-bold text-yellow-600">{tardy}</h3>
          <p className="text-sm text-yellow-700">Tardy</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
          <h3 className="text-2xl font-bold text-blue-600">{overall}%</h3>
          <p className="text-sm text-blue-700">Overall</p>
          <p className="text-xs text-blue-500">out of {total} sessions</p>
        </div>
      </div>

      {/* No Records Message (only if no total records) */}
      {total === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-6">
          <p className="text-lg">No attendance records yet.</p>
        </div>
      )}

      {/* Monthly Grouped Attendance Records */}
      {total > 0 && (
        <div className="space-y-6">
          {groupedRecords.map((group) => (
            <div key={group.month} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              {/* Month Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => toggleMonth(group.month)}
              >
                <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                  <h3 className="text-lg font-semibold text-gray-800">{group.monthName}</h3>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Present: {group.presentCount} / {group.totalCount}</p>
                    <span className="text-base font-bold ml-1 transition-transform duration-300 ease-in-out">
                      {expandedMonths.has(group.month) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Month Content - Animated */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedMonths.has(group.month) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 space-y-3">
                  {group.weeks.map((week) => {
                    const weekStartDate = new Date(week.weekStart);
                    const weekLabel = `Week of ${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    return (
                      <div key={week.weekKey} className="bg-gray-50 rounded-lg overflow-hidden">
                        {/* Week Header */}
                        <div 
                          className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" 
                          onClick={() => toggleWeek(group.month, week.weekKey)}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-semibold text-gray-700">{weekLabel}</h4>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Present: {week.presentCount} / {week.totalCount}</p>
                              <span className="text-base font-bold ml-1 transition-transform duration-300 ease-in-out">
                                {expandedWeeks[group.month]?.has(week.weekKey) ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Week Content - Animated */}
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200 ${
                            expandedWeeks[group.month]?.has(week.weekKey) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-3 space-y-2">
                            {week.records.map((record) => {
                              const date = new Date(record.date);
                              const day = date.getDate();
                              const dayLabel = `${day}${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short' })}`;
                              return (
                                <div
                                  key={record.id || record.date}
                                  className="flex justify-between items-center p-2 bg-white rounded hover:bg-gray-100 cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(date);
                                  }}
                                >
                                  <span className="font-medium text-gray-700 text-sm">{dayLabel}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                    record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                    record.status === 'Tardy' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {record.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Details for {selectedDate.toDateString()}</h3>
            <button 
              onClick={clearSelectedDate}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear
            </button>
          </div>
          {(() => {
            const record = attendanceRecords.find((r) => new Date(r.date).toDateString() === selectedDate.toDateString());
            if (record) {
              return (
                <div className="text-gray-700">
                  <p><strong>Status:</strong> <span className={`capitalize ${record.status === 'Present' ? 'text-green-600' : record.status === 'Absent' ? 'text-red-600' : 'text-yellow-600'}`}>{record.status}</span></p>
                  {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}
                </div>
              );
            }
            return <p className="text-gray-500 italic">No attendance record for this date.</p>;
          })()}
        </div>
      )}
    </div>
  );
};

export default StudentAttendanceHistory;