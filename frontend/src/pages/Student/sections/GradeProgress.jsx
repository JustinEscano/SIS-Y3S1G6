// src/pages/Student/sections/GradeProgress.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/authContext';
import gradeService from '../../../services/gradeService';
import LoadingSpinner from '../../../components/loadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  faArrowUp,
  faArrowDown,
  faMinus,
  faChartLine,
  faExclamationTriangle,
  faLayerGroup,
  faCalendarAlt,
  faArrowTrendUp,
  faRankingStar,
  faBookOpen,
  faFlask,
  faGlobe,
  faFont,
  faMusic,
  faLaptop,
  faHeart,
  faBookReader,
  faTools,
  faBalanceScale,
  faSortNumericUp,
  faSortNumericDown,
  faChevronDown,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Enhanced helper function to extract sequence information
const extractSequenceInfo = (subject) => {
  const name = subject.subjectName || '';
  
  const patterns = [
    { pattern: /(math|mathematics)\s*(\d+)/i, capture: 2 },
    { pattern: /(algebra|geometry|calculus|trigonometry)\s*(I|II|III|IV|V|[1-5])/i, capture: 2 },
    { pattern: /(algebra|geometry|calculus|trigonometry)\s+([a-z])/i, capture: 2 },
    { pattern: /(science)\s*(\d+)/i, capture: 2 },
    { pattern: /(biology|chemistry|physics|earth science)/i, sequence: { 'biology': 1, 'chemistry': 2, 'physics': 3, 'earth science': 1 } },
    { pattern: /(english|language arts)\s*(\d+)/i, capture: 2 },
    { pattern: /(english|language arts)\s*(I|II|III|IV)/i, capture: 2 },
    { pattern: /(\d+)/, capture: 1 },
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern.pattern);
    if (match) {
      if (pattern.capture) {
        const captured = match[pattern.capture];
        if (['I', 'II', 'III', 'IV', 'V'].includes(captured)) {
          const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
          return { sequenceNumber: romanMap[captured], sequenceType: 'numeric' };
        }
        if (/^[A-Za-z]$/.test(captured)) {
          return { sequenceNumber: captured.toUpperCase().charCodeAt(0) - 64, sequenceType: 'alpha' };
        }
        if (!isNaN(parseInt(captured))) {
          return { sequenceNumber: parseInt(captured), sequenceType: 'numeric' };
        }
      }
      if (pattern.sequence) {
        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(pattern.sequence)) {
          if (lowerName.includes(key)) {
            return { sequenceNumber: value, sequenceType: 'categorical' };
          }
        }
      }
    }
  }

  return { sequenceNumber: null, sequenceType: null };
};

// Create academic journey chart data for a subject group
const createGroupJourneyChartData = (subjects) => {
  const sequencedSubjects = subjects
    .filter(s => s.sequenceNumber !== null)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  if (sequencedSubjects.length === 0) return null;

  const labels = [];
  const dataPoints = [];
  
  sequencedSubjects.forEach(subject => {
    const latestEntry = subject.entries[subject.entries.length - 1];
    if (latestEntry) {
      labels.push(`${subject.subjectName}`);
      dataPoints.push(typeof latestEntry.finalGrade === 'number' ? latestEntry.finalGrade : null);
    }
  });

  return {
    labels,
    datasets: [
      {
        label: 'Math Grade',
        data: dataPoints,
        borderColor: 'rgba(79, 70, 229, 0.9)',
        backgroundColor: 'rgba(79, 70, 229, 0.25)',
        pointBackgroundColor: dataPoints.map((value) =>
          typeof value === 'number' && value >= 85
            ? '#22c55e'
            : typeof value === 'number' && value >= 75
            ? '#f59e0b'
            : '#ef4444'
        ),
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.2,
        spanGaps: true,
        fill: false,
      },
    ],
  };
};

const GradeProgress = () => {
  const { user, token } = useAuth();
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const chartRefs = useRef({});

  useEffect(() => {
    if (!user?.id || !token) {
      setError("User not authenticated. Please log in.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await gradeService.getStudentGradeProgress(user.id, token);
        const raw = response?.data ?? response;
        const list = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
          ? raw
          : [];

        const normalized = list.map((subject) => {
          const entries = Array.isArray(subject.progress) ? [...subject.progress] : [];
          entries.sort((a, b) => {
            const yearA = parseInt((a.academicYear || '').split('-')[0], 10) || 0;
            const yearB = parseInt((b.academicYear || '').split('-')[0], 10) || 0;
            return yearA - yearB;
          });

          return {
            subjectId: subject.subjectId || subject._id || subject.subject,
            subjectName: subject.subjectName || subject.name || 'Subject',
            subjectType: subject.subjectType || 'Other',
            gradeLevel: subject.gradeLevel || null,
            entries,
          };
        });

        setProgressData(normalized);
        
        // Auto-expand groups with sequenced subjects
        const groups = {};
        normalized.forEach(subject => {
          const type = subject.subjectType || 'Other';
          groups[type] = true;
        });
        setExpandedGroups(groups);
      } catch (err) {
        console.error("Error fetching grade progress:", err);
        setError(err.response?.data?.message || err.message || "Failed to load grade progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  // Enhanced grouping with proper sequencing analysis
  const groupedProgress = useMemo(() => {
    const groups = {};
    
    const subjectsWithSequence = progressData.map(subject => ({
      ...subject,
      ...extractSequenceInfo(subject),
      latestGrade: subject.entries.length > 0 ? subject.entries[subject.entries.length - 1]?.finalGrade : null,
      latestAcademicYear: subject.entries.length > 0 ? subject.entries[subject.entries.length - 1]?.academicYear : null,
    }));

    // Group by subject type
    subjectsWithSequence.forEach((subject) => {
      const type = subject.subjectType || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(subject);
    });

    // Process each group for sequencing
    Object.keys(groups).forEach(type => {
      const groupSubjects = groups[type];
      
      groupSubjects.sort((a, b) => {
        if (a.sequenceNumber !== b.sequenceNumber) {
          return (a.sequenceNumber || 999) - (b.sequenceNumber || 999);
        }
        const yearA = parseInt((a.latestAcademicYear || '').split('-')[0], 10) || 0;
        const yearB = parseInt((b.latestAcademicYear || '').split('-')[0], 10) || 0;
        return yearA - yearB;
      });

      groups[type] = groupSubjects.map((subject, index, array) => {
        let crossSubjectDelta = null;
        let previousSubjectName = null;

        if (index > 0) {
          const previousSubject = array[index - 1];
          const currentGrade = subject.latestGrade;
          const previousGrade = previousSubject.latestGrade;
          
          if (typeof currentGrade === 'number' && typeof previousGrade === 'number') {
            crossSubjectDelta = Number((currentGrade - previousGrade).toFixed(1));
            previousSubjectName = previousSubject.subjectName;
          }
        }

        return {
          ...subject,
          sequenceIndex: index,
          crossSubjectDelta,
          previousSubjectName,
          hasSequencing: array.length > 1 && array.some(s => s.sequenceNumber !== null)
        };
      });
    });

    return Object.entries(groups)
      .map(([type, subjects]) => ({ 
        type, 
        subjects,
        hasSequencing: subjects.some(s => s.hasSequencing),
        groupChartData: createGroupJourneyChartData(subjects)
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [progressData]);

  // Enhanced metrics with sequencing info
  const metrics = useMemo(() => {
    if (!progressData.length) {
      return {
        subjectCount: 0,
        totalHistory: 0,
        overallAverage: null,
        bestImprovement: null,
        sequencedSubjectsCount: 0,
        sequencedGroupsCount: 0,
      };
    }

    const uniqueYears = new Set();
    let totalGrades = 0;
    let gradeCount = 0;
    let bestSubject = null;
    let bestDelta = -Infinity;
    let sequencedCount = 0;
    let sequencedGroups = 0;

    progressData.forEach((subject) => {
      subject.entries.forEach((entry, idx) => {
        if (entry.academicYear) uniqueYears.add(entry.academicYear);
        if (typeof entry.finalGrade === 'number') {
          totalGrades += entry.finalGrade;
          gradeCount += 1;
        }
        if (idx === subject.entries.length - 1 && typeof entry.delta === 'number') {
          if (entry.delta > bestDelta) {
            bestDelta = entry.delta;
            bestSubject = {
              subjectName: subject.subjectName,
              delta: entry.delta,
            };
          }
        }
      });
    });

    groupedProgress.forEach(({ subjects, hasSequencing }) => {
      if (hasSequencing) {
        sequencedGroups++;
        sequencedCount += subjects.filter(s => s.sequenceNumber !== null).length;
      }
    });

    return {
      subjectCount: progressData.length,
      totalHistory: uniqueYears.size,
      overallAverage: gradeCount ? Number((totalGrades / gradeCount).toFixed(1)) : null,
      bestImprovement: bestSubject && bestSubject.delta > 0 ? bestSubject : null,
      sequencedSubjectsCount: sequencedCount,
      sequencedGradesCount: sequencedGroups,
    };
  }, [progressData, groupedProgress]);

  const improvingSubjects = useMemo(() => (
    progressData.filter((subject) => {
      if (subject.entries.length < 2) return false;
      const latest = subject.entries[subject.entries.length - 1];
      return typeof latest.delta === 'number' && latest.delta > 0;
    }).length
  ), [progressData]);

  const toggleGroup = (type) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const renderDelta = (delta) => {
    if (delta === null || delta === undefined) {
      return <span className="text-gray-400 italic text-xs">N/A</span>;
    }
    const absDelta = Math.abs(delta);
    if (delta > 0.1) {
      return <span className="text-green-600 font-medium"><FontAwesomeIcon icon={faArrowUp} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    if (delta < -0.1) {
      return <span className="text-red-600 font-medium"><FontAwesomeIcon icon={faArrowDown} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    return <span className="text-gray-500"><FontAwesomeIcon icon={faMinus} size="xs" /> {absDelta.toFixed(1)}</span>;
  };

  const academicChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            return typeof value === 'number' ? `Grade: ${value.toFixed(1)}` : 'No grade';
          }
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { 
          stepSize: 20,
          callback: function(value) {
            return value;
          }
        },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        title: {
          display: true,
          text: 'Math Grade'
        }
      },
      x: {
        grid: { display: false },
        title: {
          display: true,
          text: 'Course'
        }
      },
    },
  }), []);

  const downloadCSV = (filename, rows) => {
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSubjectCsv = (subject) => {
    const header = 'Academic Year,Final Grade,Letter,Delta,Sequence Number';
    const rows = subject.entries.map((entry) => {
      const grade = typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '';
      const delta = typeof entry.delta === 'number' ? entry.delta.toFixed(1) : '';
      return `${entry.academicYear || ''},${grade},${entry.letterGrade || ''},${delta},${subject.sequenceNumber || ''}`;
    });
    downloadCSV(`${subject.subjectName.replace(/\s+/g, '_')}-grade-history.csv`, [header, ...rows]);
  };

  const exportGroupCsv = (type, subjects) => {
    const header = 'Subject,Academic Year,Final Grade,Letter,Delta,Sequence Number';
    const rows = subjects.flatMap((subject) => {
      if (!subject.entries.length) {
        return [`${subject.subjectName},,,,${subject.sequenceNumber || ''}`];
      }
      return subject.entries.map((entry) => {
        const grade = typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '';
        const delta = typeof entry.delta === 'number' ? entry.delta.toFixed(1) : '';
        return `${subject.subjectName},${entry.academicYear || ''},${grade},${entry.letterGrade || ''},${delta},${subject.sequenceNumber || ''}`;
      });
    });
    downloadCSV(`${type.replace(/\s+/g, '_')}-grade-progress.csv`, [header, ...rows]);
  };

  const exportAllCsv = () => {
    const header = 'Subject Type,Subject,Academic Year,Final Grade,Letter,Delta,Sequence Number';
    const rows = groupedProgress.flatMap(({ type, subjects }) => 
      subjects.flatMap((subject) => {
        if (!subject.entries.length) {
          return [`${type},${subject.subjectName},,,,${subject.sequenceNumber || ''}`];
        }
        return subject.entries.map((entry) => {
          const grade = typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '';
          const delta = typeof entry.delta === 'number' ? entry.delta.toFixed(1) : '';
          return `${type},${subject.subjectName},${entry.academicYear || ''},${grade},${entry.letterGrade || ''},${delta},${subject.sequenceNumber || ''}`;
        });
      })
    );
    downloadCSV('grade-progress-history.csv', [header, ...rows]);
  };

  const typeIcons = {
    Math: faBookOpen,
    Science: faFlask,
    'Social Sciences': faGlobe,
    English: faFont,
    MAPEH: faMusic,
    'Computer Science': faLaptop,
    Filipino: faBookReader,
    Reading: faBookReader,
    TLE: faTools,
    Values: faHeart,
    Other: faBalanceScale,
  };

  if (loading) {
    return <LoadingSpinner message="Loading grade progress history..." />;
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8 bg-gray-50 min-h-screen">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faChartLine} /> Grade progress
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {user?.name ? `${user.name.split(' ')[0]}, your growth story across the years` : 'Your growth story across the years'}
                </h1>
                <p className="text-sm text-white/80">
                  Compare grades year over year, celebrate improvements, and spot subjects that need a little more attention.
                </p>
              </div>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                {error}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Subjects tracked</p>
              <p className="text-3xl font-bold text-white">{metrics.subjectCount}</p>
              <p className="text-xs text-white/60">Total subjects with multi-year data</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Academic years</p>
              <p className="text-3xl font-bold text-white">{metrics.totalHistory}</p>
              <p className="text-xs text-white/60">Distinct school years recorded</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Average grade</p>
              <p className="text-3xl font-bold text-white">{metrics.overallAverage ?? '—'}</p>
              <p className="text-xs text-white/60">Across all recorded classes</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Subjects improving</p>
              <p className="text-3xl font-bold text-white">{improvingSubjects}</p>
              <p className="text-xs text-white/60">Latest year-on-year gains</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Learning sequences</p>
              <p className="text-3xl font-bold text-white">{metrics.sequencedGradesCount}</p>
              <p className="text-xs text-white/60">Sequenced subject groups</p>
            </div>
          </div>

          {metrics.bestImprovement && (
            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 text-sm text-white/80">
              <FontAwesomeIcon icon={faRankingStar} className="mr-2 text-amber-300" />
              <span className="font-semibold text-white">Biggest leap:</span> {metrics.bestImprovement.subjectName} improved by {metrics.bestImprovement.delta.toFixed(1)} points last year.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportAllCsv}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/25"
            >
              <FontAwesomeIcon icon={faLayerGroup} /> Export overall CSV
            </button>
          </div>
        </div>
      </section>

      {groupedProgress.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-600">No grade history yet</p>
          <p className="mt-2 text-sm text-gray-500">Once you complete more graded subjects, you'll see the year-over-year breakdown right here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedProgress.map(({ type, subjects, hasSequencing, groupChartData }) => (
            <section key={type} className="rounded-3xl border border-gray-200 bg-white shadow-lg">
              {/* Group Header */}
              <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-3xl"
                onClick={() => toggleGroup(type)}
              >
                <div className="flex items-center gap-4">
                  <FontAwesomeIcon 
                    icon={typeIcons[type] || faBookOpen} 
                    className="h-6 w-6 text-gray-600" 
                  />
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {type}
                    </h2>
                    <span className="text-lg text-gray-500">
                      ({subjects.length} course{subjects.length === 1 ? '' : 's'})
                    </span>
                    {hasSequencing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                        <FontAwesomeIcon icon={faSortNumericUp} size="xs" />
                        Learning Sequence
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {subjects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportGroupCsv(type, subjects);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faLayerGroup} /> Export Group CSV
                    </button>
                  )}
                  <FontAwesomeIcon 
                    icon={expandedGroups[type] ? faChevronDown : faChevronRight} 
                    className="h-5 w-5 text-gray-400 transition-transform"
                  />
                </div>
              </div>

              {/* Group Learning Journey Chart */}
              {expandedGroups[type] && hasSequencing && groupChartData && (
                <div className="px-6 pb-6 border-b border-gray-200">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FontAwesomeIcon icon={faChartLine} className="text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{type} Learning Journey</h3>
                    </div>
                    <div className="h-64">
                      <Line
                        data={groupChartData}
                        options={academicChartOptions}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Shows progression through sequential courses in {type}
                    </p>
                  </div>
                </div>
              )}

              {/* Individual Courses - Only Grade Cards */}
              {expandedGroups[type] && (
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {subjects.map((subject) => {
                      const entries = subject.entries;
                      const latest = entries[entries.length - 1] || {};
                      const previous = entries.length > 1 ? entries[entries.length - 2] : null;
                      const trend = latest && typeof latest.delta === 'number' ? latest.delta : null;

                      return (
                        <div key={subject.subjectId} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          {/* Course Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{subject.subjectName}</h3>
                            </div>
                            <button
                              onClick={() => exportSubjectCsv(subject)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                            >
                              <FontAwesomeIcon icon={faLayerGroup} /> CSV
                            </button>
                          </div>

                          {/* Term Grades */}
                          <div className="space-y-4">
                            {entries.map((entry, idx) => (
                              <div key={`${entry.academicYear}-${idx}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                    GRADE {subject.sequenceNumber || (idx + 7)}
                                  </span>
                                  <span className="text-sm text-gray-500">{entry.academicYear || 'Year'}</span>
                                </div>
                                <div className="text-center mb-4">
                                  <p className="text-2xl font-bold text-gray-900">
                                    {typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '—'}
                                  </p>
                                  <p className="text-sm text-gray-500">Letter: {entry.letterGrade ?? '—'}</p>
                                </div>

                                {/* Quarter Grades */}
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  {['q1', 'q2', 'q3', 'q4'].map((quarterKey) => (
                                    <div key={quarterKey} className="text-center">
                                      <div className="font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                        {quarterKey.toUpperCase()}
                                      </div>
                                      <div className="font-bold text-gray-700 text-sm">
                                        {entry.quarterTotals && typeof entry.quarterTotals[quarterKey] === 'number'
                                          ? entry.quarterTotals[quarterKey].toFixed(1)
                                          : '—'}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className={`h-full rounded-full ${
                                      typeof entry.finalGrade === 'number' && entry.finalGrade >= 85 ? 'bg-emerald-500' : 
                                      typeof entry.finalGrade === 'number' && entry.finalGrade >= 75 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, entry.finalGrade ?? 0))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradeProgress;