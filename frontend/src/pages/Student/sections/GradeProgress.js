// src/pages/Student/sections/GradeProgress.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/authContext';
import gradeService from '../../../services/gradeService';
import LoadingSpinner from '../../../components/loadingSpinner'; // Ensure correct path
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
} from '@fortawesome/free-solid-svg-icons';

const GradeProgress = () => {
  const { user, token } = useAuth();
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        console.log(`Fetching grade progress for student ID: ${user.id}`);
        const response = await gradeService.getStudentGradeProgress(user.id, token);
        console.log("Progress data received:", response);
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
            subjectId: subject.subjectId || subject._id || subject.subjectName,
            subjectName: subject.subjectName || subject.name || 'Subject',
            entries,
          };
        });

        setProgressData(normalized);
      } catch (err) {
        console.error("Error fetching grade progress:", err);
        setError(err.response?.data?.message || err.message || "Failed to load grade progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  // Helper to render the delta with an icon and color
  const renderDelta = (delta) => {
    if (delta === null || delta === undefined) {
      return <span className="text-gray-400 italic text-xs">N/A</span>; // First year has no delta
    }
    const absDelta = Math.abs(delta);
    if (delta > 0.1) { // Threshold for significance
      return <span className="text-green-600 font-medium"><FontAwesomeIcon icon={faArrowUp} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    if (delta < -0.1) { // Threshold for significance
      return <span className="text-red-600 font-medium"><FontAwesomeIcon icon={faArrowDown} size="xs" /> {absDelta.toFixed(1)}</span>;
    }
    // Very small or zero change
    return <span className="text-gray-500"><FontAwesomeIcon icon={faMinus} size="xs" /> {absDelta.toFixed(1)}</span>;
  };

  const metrics = useMemo(() => {
    if (!progressData.length) {
      return {
        subjectCount: 0,
        totalHistory: 0,
        overallAverage: null,
        bestImprovement: null,
      };
    }

    const uniqueYears = new Set();
    let totalGrades = 0;
    let gradeCount = 0;
    let bestSubject = null;
    let bestDelta = -Infinity;

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

    return {
      subjectCount: progressData.length,
      totalHistory: uniqueYears.size,
      overallAverage: gradeCount ? Number((totalGrades / gradeCount).toFixed(1)) : null,
      bestImprovement: bestSubject && bestSubject.delta > 0 ? bestSubject : null,
    };
  }, [progressData]);

  const improvingSubjects = useMemo(() => (
    progressData.filter((subject) => {
      if (subject.entries.length < 2) return false;
      const latest = subject.entries[subject.entries.length - 1];
      return typeof latest.delta === 'number' && latest.delta > 0;
    }).length
  ), [progressData]);

  const baseChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            return typeof value === 'number' ? `${value.toFixed(1)} grade` : 'No grade';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 10 },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
      x: {
        grid: { display: false },
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
    const header = 'Academic Year,Final Grade,Letter,Delta';
    const rows = subject.entries.map((entry) => {
      const grade = typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '';
      const delta = typeof entry.delta === 'number' ? entry.delta.toFixed(1) : '';
      return `${entry.academicYear || ''},${grade},${entry.letterGrade || ''},${delta}`;
    });
    downloadCSV(`${subject.subjectName.replace(/\s+/g, '_')}-grade-history.csv`, [header, ...rows]);
  };

  const exportAllCsv = () => {
    const header = 'Subject,Academic Year,Final Grade,Letter,Delta';
    const rows = progressData.flatMap((subject) => {
      if (!subject.entries.length) {
        return [`${subject.subjectName},,,`];
      }
      return subject.entries.map((entry) => {
        const grade = typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '';
        const delta = typeof entry.delta === 'number' ? entry.delta.toFixed(1) : '';
        return `${subject.subjectName},${entry.academicYear || ''},${grade},${entry.letterGrade || ''},${delta}`;
      });
    });
    downloadCSV('grade-progress-history.csv', [header, ...rows]);
  };

  const exportChartImage = (subjectId, subjectName) => {
    const chart = chartRefs.current[subjectId];
    if (!chart) return;
    const link = document.createElement('a');
    link.href = chart.toBase64Image('image/png', 1);
    link.download = `${subjectName.replace(/\s+/g, '_')}-grade-trend.png`;
    link.click();
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {progressData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-600">No grade history yet</p>
          <p className="mt-2 text-sm text-gray-500">Once you complete more graded subjects, you’ll see the year-over-year breakdown right here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {progressData.map((subject) => {
            const entries = subject.entries;
            const latest = entries[entries.length - 1] || {};
            const previous = entries.length > 1 ? entries[entries.length - 2] : null;
            const trend = latest && typeof latest.delta === 'number' ? latest.delta : null;
            const labels = entries.map((entry, index) => entry.academicYear || `Year ${index + 1}`);
            const dataPoints = entries.map((entry) => typeof entry.finalGrade === 'number' ? entry.finalGrade : null);

            const chartData = {
              labels,
              datasets: [
                {
                  label: 'Final Grade',
                  data: dataPoints,
                  borderColor: 'rgba(168, 85, 247, 0.9)',
                  backgroundColor: 'rgba(168, 85, 247, 0.25)',
                  pointBackgroundColor: dataPoints.map((value) =>
                    typeof value === 'number' && value >= 85
                      ? '#22c55e'
                      : typeof value === 'number' && value >= 75
                      ? '#f59e0b'
                      : '#ef4444'
                  ),
                  pointRadius: 5,
                  pointHoverRadius: 7,
                  tension: 0.3,
                  spanGaps: true,
                  fill: false,
                },
              ],
            };

            return (
              <section key={subject.subjectId} className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{subject.subjectName}</h2>
                    <p className="text-sm text-gray-500">
                      {entries.length > 1
                        ? 'Progress spanning multiple academic years'
                        : 'Waiting for more graded terms to show a full timeline.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-600">
                      <FontAwesomeIcon icon={faCalendarAlt} /> {entries.length} year{entries.length === 1 ? '' : 's'} tracked
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                      Latest grade: {typeof latest.finalGrade === 'number' ? latest.finalGrade.toFixed(1) : '—'}
                    </span>
                    {previous && (
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${trend && trend > 0 ? 'bg-emerald-50 text-emerald-600' : trend && trend < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        <FontAwesomeIcon icon={faArrowTrendUp} />
                        {trend ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} vs prior year` : 'No change'}
                      </span>
                    )}
                    <button
                      onClick={() => exportSubjectCsv(subject)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-600 transition hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faLayerGroup} /> Export CSV
                    </button>
                    {entries.length > 1 && (
                      <button
                        onClick={() => exportChartImage(subject.subjectId, subject.subjectName)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-600 transition hover:bg-gray-50"
                      >
                        <FontAwesomeIcon icon={faChartLine} /> Download chart
                      </button>
                    )}
                  </div>
                </div>

                {entries.length > 0 ? (
                  <div className="mt-6 space-y-6">
                    {entries.length > 1 && (
                      <div className="h-56 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-gray-600">Final grade trajectory</p>
                        <div className="mt-3 h-44">
                          <Line
                            data={chartData}
                            options={baseChartOptions}
                            ref={(chart) => {
                              if (chart) {
                                chartRefs.current[subject.subjectId] = chart;
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {entries.map((entry, idx) => (
                        <div key={`${entry.academicYear}-${idx}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{entry.academicYear || 'Year'}</span>
                            {idx > 0 ? renderDelta(entry.delta) : <span className="text-gray-400 italic text-xs">Baseline</span>}
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-gray-900">
                            {typeof entry.finalGrade === 'number' ? entry.finalGrade.toFixed(1) : '—'}
                          </p>
                          <p className="text-xs text-gray-500">Letter: {entry.letterGrade ?? '—'}</p>
                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            {['q1', 'q2', 'q3', 'q4'].map((quarterKey) => (
                              <div key={quarterKey} className="flex items-center justify-between">
                                <span className="uppercase tracking-wide text-gray-400">{quarterKey.toUpperCase()}</span>
                                <span className="font-semibold text-gray-700">
                                  {entry.quarterTotals && typeof entry.quarterTotals[quarterKey] === 'number'
                                    ? entry.quarterTotals[quarterKey].toFixed(1)
                                    : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${typeof entry.finalGrade === 'number' && entry.finalGrade >= 85 ? 'bg-emerald-500' : typeof entry.finalGrade === 'number' && entry.finalGrade >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, entry.finalGrade ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {entries.length < 2 && (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                        We need at least two academic years of grades to chart trends for this subject. Keep going—you’re on your way!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    No grades recorded yet for this subject.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradeProgress;