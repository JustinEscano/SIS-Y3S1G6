import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faCircleInfo, faUsers, faUserGraduate, faChalkboardTeacher, faBook } from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import analyticsService from "../../../services/analyticsService";
import LoadingSpinner from "../../../components/loadingSpinner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const EMPTY_SUMMARY = {
  userRegistrationTrends: [],
  subjectEnrollment: {
    byGradeLevel: [],
    topSubjects: [],
  },
  gradeDistribution: {
    letters: [],
  },
  attendance: {
    statusCounts: { Present: 0, Absent: 0, Tardy: 0 },
    recentActivity: [],
  },
  systemUsage: {
    totals: {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalSuperadmins: 0,
      totalSubjects: 0,
      activeSubjects: 0,
      archivedSubjects: 0,
    },
    last30Days: {
      newStudents: 0,
      newTeachers: 0,
      newSubjects: 0,
      attendanceSessions: 0,
    },
  },
};

const INFO_BOXES = [
  {
    title: "What am I seeing?",
    description:
      "This dashboard aggregates key engagement and academic indicators across the system.",
  },
  {
    title: "Data refresh",
    description:
      "Metrics update whenever new records are created. Historical ranges cover the last 6 months or 30 days, depending on the widget.",
  },
];

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    <div className="mt-4 h-72 flex items-center justify-center">
      {children}
    </div>
  </div>
);

function Analytics() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsService.getSummary();
        setSummary(data || EMPTY_SUMMARY);
      } catch (err) {
        console.error("Error loading analytics summary", err);
        setError(
          err?.response?.data?.message || err?.message || "Failed to load analytics summary."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const registrationChart = useMemo(() => {
    const labels = summary.userRegistrationTrends.map((item) => item.label);
    const datasets = [
      {
        label: "Students",
        data: summary.userRegistrationTrends.map((item) => item.students),
        backgroundColor: "rgba(129, 2, 11, 0.75)",
      },
      {
        label: "Teachers",
        data: summary.userRegistrationTrends.map((item) => item.teachers),
        backgroundColor: "rgba(16, 185, 129, 0.75)",
      },
      {
        label: "Superadmins",
        data: summary.userRegistrationTrends.map((item) => item.superadmins),
        backgroundColor: "rgba(59, 130, 246, 0.75)",
      },
    ];

    return {
      labels,
      datasets,
    };
  }, [summary.userRegistrationTrends]);

  const gradeDistributionChart = useMemo(() => {
    const labels = summary.gradeDistribution.letters.map((item) => item.label);
    const data = summary.gradeDistribution.letters.map((item) => item.count);
    return {
      labels,
      datasets: [
        {
          label: "Count",
          data,
          backgroundColor: [
            "#0f6fd3",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#6b7280",
            "#a855f7",
          ],
        },
      ],
    };
  }, [summary.gradeDistribution.letters]);

  const attendanceTrendChart = useMemo(() => {
    const labels = summary.attendance.recentActivity.map((item) => item.date);
    const data = summary.attendance.recentActivity.map((item) => item.total);

    return {
      labels,
      datasets: [
        {
          label: "Attendance Records",
          data,
          fill: true,
          borderColor: "rgba(129, 2, 11, 0.9)",
          backgroundColor: "rgba(129, 2, 11, 0.2)",
          tension: 0.3,
        },
      ],
    };
  }, [summary.attendance.recentActivity]);

  const attendanceStatusChart = useMemo(() => {
    const counts = summary.attendance.statusCounts;
    return {
      labels: ["Present", "Absent", "Tardy"],
      datasets: [
        {
          data: [counts.Present || 0, counts.Absent || 0, counts.Tardy || 0],
          backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
          hoverOffset: 4,
        },
      ],
    };
  }, [summary.attendance.statusCounts]);

  const enrollmentBarChart = useMemo(() => {
    const labels = summary.subjectEnrollment.byGradeLevel.map((item) =>
      typeof item.gradeLevel === "number" ? `Grade ${item.gradeLevel}` : item.gradeLevel
    );
    const subjectData = summary.subjectEnrollment.byGradeLevel.map(
      (item) => item.totalSubjects || 0
    );
    const studentData = summary.subjectEnrollment.byGradeLevel.map(
      (item) => item.totalStudents || 0
    );

    return {
      labels,
      datasets: [
        {
          label: "Subjects",
          data: subjectData,
          backgroundColor: "rgba(129, 2, 11, 0.75)",
        },
        {
          label: "Students",
          data: studentData,
          backgroundColor: "rgba(59, 130, 246, 0.75)",
        },
      ],
    };
  }, [summary.subjectEnrollment.byGradeLevel]);

  const totals = summary.systemUsage.totals;
  const latest = summary.systemUsage.last30Days;

  const summaryCards = useMemo(() => (
    [
      {
        label: "Total users",
        value: totals.totalUsers ?? 0,
        helper: `${totals.totalStudents ?? 0} students • ${totals.totalTeachers ?? 0} teachers`,
        icon: faUsers,
        accent: "bg-blue-100 text-blue-600",
      },
      {
        label: "Total students",
        value: totals.totalStudents ?? 0,
        helper: `${latest.newStudents ?? 0} joined in last 30 days`,
        icon: faUserGraduate,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Total teachers",
        value: totals.totalTeachers ?? 0,
        helper: `${latest.newTeachers ?? 0} added recently`,
        icon: faChalkboardTeacher,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Subjects",
        value: totals.totalSubjects ?? 0,
        helper: `${totals.activeSubjects ?? 0} active • ${totals.archivedSubjects ?? 0} archived`,
        icon: faBook,
        accent: "bg-amber-100 text-amber-600",
      },
    ]
  ), [totals, latest]);

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
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
                System analytics
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Insights that guide academic decisions</h1>
                <p className="text-sm text-white/85">
                  Monitor usage trends, subject coverage, and classroom engagement to make proactive choices for your school.
                </p>
              </div>
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faChartLine} />
                {latest.newStudents + latest.newTeachers + latest.newSubjects > 0
                  ? `${latest.newStudents + latest.newTeachers + latest.newSubjects} updates in last 30 days`
                  : "Awaiting new activity"}
              </div>
              {loading && <LoadingSpinner message="Loading analytics..." />}
            </div>
          </div>
        </div>
      </section>

      {!loading && !error && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${card.accent}`}>
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

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="User registrations"
              subtitle="Monthly breakdown of new students and staff (last 6 months)"
            >
              {summary.userRegistrationTrends.length ? (
                <Bar
                  data={registrationChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                    scales: {
                      x: { stacked: true, ticks: { font: { size: 11 } } },
                      y: { stacked: true, beginAtZero: true },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400">No registration data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Grade distribution" subtitle="Across all subjects">
              {summary.gradeDistribution.letters.some((item) => item.count > 0) ? (
                <Doughnut
                  data={gradeDistributionChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400">No recorded grades yet.</p>
              )}
            </ChartCard>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="Subject enrollment"
              subtitle="Student and subject totals per grade level"
            >
              {summary.subjectEnrollment.byGradeLevel.length ? (
                <Bar
                  data={enrollmentBarChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                    scales: {
                      x: { ticks: { font: { size: 11 } } },
                      y: { beginAtZero: true },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400">No enrollment data available yet.</p>
              )}
            </ChartCard>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Top active subjects</h2>
              <p className="text-sm text-gray-500 mb-4">Classes with the highest enrollment</p>
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {summary.subjectEnrollment.topSubjects.length ? (
                  summary.subjectEnrollment.topSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="border border-gray-100 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-sm text-gray-800">{subject.name}</h3>
                        <p className="text-xs text-gray-500">
                          Grade {subject.gradeLevel || "N/A"} • {subject.academicYear}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {subject.studentCount} students
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No subjects available yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="Attendance trend"
              subtitle="Daily attendance entries (last 14 days)"
            >
              {summary.attendance.recentActivity.length ? (
                <Line
                  data={attendanceTrendChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
                      },
                      y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(
                          5,
                          ...summary.attendance.recentActivity.map((item) => item.total)
                        ),
                      },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400">No attendance records yet.</p>
              )}
            </ChartCard>

            <ChartCard
              title="Attendance status mix"
              subtitle="Entries recorded in the last 30 days"
            >
              {Object.values(summary.attendance.statusCounts).some((value) => value > 0) ? (
                <Doughnut
                  data={attendanceStatusChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              ) : (
                <p className="text-sm text-gray-400">No attendance entries yet.</p>
              )}
            </ChartCard>
          </section>

          <section className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">How to use this dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INFO_BOXES.map((box) => (
                <div
                  key={box.title}
                  className="flex gap-3 items-start bg-gray-50 border border-gray-100 rounded-lg p-4"
                >
                  <div className="text-[#81020b] pt-1">
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">{box.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{box.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Analytics;
