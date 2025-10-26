import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardTeacher,
  faGraduationCap,
  faChartLine,
  faUserShield,
  faUsers,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import teacherService from "../../../services/teacherService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ icon, label, value, helper, accent = "#0f6fd3" }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        <FontAwesomeIcon icon={icon} className="text-lg" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
    {helper && <p className="text-xs text-gray-500 leading-relaxed">{helper}</p>}
  </div>
);

const HighlightCard = ({ subject }) => (
  <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{subject.name}</h3>
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
        Grade {subject.gradeLevel}
      </span>
    </div>
    <p className="text-xs text-gray-500">{subject.academicYear}</p>
    <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
      <div>
        <p className="text-gray-500 text-xs">Students</p>
        <p className="font-semibold text-gray-800">{subject.studentCount}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs">Avg. Grade</p>
        <p className="font-semibold text-gray-800">
          {subject.averageGrade != null ? `${subject.averageGrade}%` : "–"}
        </p>
      </div>
      <div>
        <p className="text-gray-500 text-xs">Attendance</p>
        <p className="font-semibold text-gray-800">{subject.attendanceRate}%</p>
      </div>
    </div>
  </div>
);

const RiskRow = ({ student }) => (
  <div className="rounded-lg border border-red-100 bg-red-50/70 px-4 py-3 flex items-center justify-between gap-3">
    <div>
      <p className="font-semibold text-red-700 text-sm">{student.studentName}</p>
      <p className="text-xs text-red-500">{student.subjectName}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-red-600">{student.finalGrade}%</p>
      <p className="text-xs text-red-400">
        Updated {new Date(student.updatedAt).toLocaleDateString()}
      </p>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await teacherService.getDashboard();
        setData(response);
      } catch (err) {
        console.error("Error loading teacher dashboard", err);
        setError(
          err?.response?.data?.message || err?.message || "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const attendanceChart = useMemo(() => {
    if (!data?.recentActivity?.attendanceTimeline?.length) return null;

    const labels = data.recentActivity.attendanceTimeline.map((item) => item.date);
    return {
      labels,
      datasets: [
        {
          label: "Present",
          data: data.recentActivity.attendanceTimeline.map((item) => item.present),
          borderColor: "rgba(16, 185, 129, 0.9)",
          backgroundColor: "rgba(16, 185, 129, 0.25)",
          tension: 0.35,
          fill: true,
        },
        {
          label: "Absent",
          data: data.recentActivity.attendanceTimeline.map((item) => item.absent),
          borderColor: "rgba(248, 113, 113, 0.8)",
          backgroundColor: "rgba(248, 113, 113, 0.2)",
          tension: 0.35,
          fill: true,
        },
        {
          label: "Tardy",
          data: data.recentActivity.attendanceTimeline.map((item) => item.tardy),
          borderColor: "rgba(250, 204, 21, 0.9)",
          backgroundColor: "rgba(250, 204, 21, 0.25)",
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2">We hit a snag</h2>
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};

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
                Teacher workspace
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Welcome back! Here’s your class snapshot.</h1>
                <p className="text-sm text-white/85">
                  Monitor subject health, keep an eye on at-risk students, and review recent activity in one view. Insight cards update as you teach.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Active subjects: <strong className="text-white">{overview.activeSubjects || 0}</strong>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Total students: <strong className="text-white">{overview.totalStudents || 0}</strong>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Attendance rate: <strong className="text-white">{overview.attendanceRate || 0}%</strong>
                </span>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 text-xs text-white/90 shadow-lg backdrop-blur-sm sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#81020b]/20 text-white">
                  <FontAwesomeIcon icon={faGraduationCap} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Highlights</p>
                  <p className="text-sm font-semibold text-white">{data?.recentActivity?.gradeUpdates?.length || 0} recent grade updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-white">
                  <FontAwesomeIcon icon={faCircleExclamation} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Alerts</p>
                  <p className="text-sm font-semibold text-white">{overview.atRiskStudents || 0} students flagged below 75%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={faChalkboardTeacher}
          label="Active subjects"
          value={`${overview.activeSubjects || 0} / ${overview.totalSubjects || 0}`}
          helper={`Archived: ${overview.archivedSubjects || 0}`}
          accent="#81020b"
        />
        <StatCard
          icon={faGraduationCap}
          label="Students"
          value={overview.totalStudents || 0}
          helper={`Avg. class size ${overview.averageClassSize || 0}`}
          accent="#0ea5e9"
        />
        <StatCard
          icon={faChartLine}
          label="Average grade"
          value={overview.averageGrade ? `${overview.averageGrade}%` : "–"}
          helper="Across all graded students"
          accent="#10b981"
        />
        <StatCard
          icon={faUsers}
          label="Attendance rate"
          value={`${overview.attendanceRate || 0}%`}
          helper={`${overview.atRiskStudents || 0} students flagged below 75%`}
          accent="#f59e0b"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Attendance over the past 2 weeks</h2>
              <p className="text-sm text-gray-500">Track engagement trends across your classes.</p>
            </div>
          </div>
          {attendanceChart ? (
            <div className="h-72">
              <Line
                data={attendanceChart}
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
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No attendance records yet.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-red-500" />
            <h2 className="text-lg font-semibold text-gray-800">Students needing attention</h2>
          </div>
          <p className="text-sm text-gray-500">
            Students below 75% in their final grade. Review and plan interventions.
          </p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {data?.studentsAtRisk?.length ? (
              data.studentsAtRisk.map((student) => (
                <RiskRow key={`${student.studentId}-${student.subjectName}`} student={student} />
              ))
            ) : (
              <div className="rounded-xl border border-gray-100 py-10 text-center text-gray-400 text-sm">
                All students are on track!
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Class highlights</h2>
              <p className="text-sm text-gray-500">Top classes by engagement and performance.</p>
            </div>
            <FontAwesomeIcon icon={faUserShield} className="text-[#81020b]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.subjectHighlights?.length ? (
              data.subjectHighlights.map((subject) => (
                <HighlightCard key={subject.id} subject={subject} />
              ))
            ) : (
              <div className="col-span-full text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl py-10 text-center">
                Add subjects to start tracking insights.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <h2 className="text-lg font-semibold text-gray-800">Recent grade updates</h2>
          <p className="text-sm text-gray-500">Your latest grading activity across classes.</p>
          <div className="divide-y divide-gray-100">
            {data?.recentActivity?.gradeUpdates?.length ? (
              data.recentActivity.gradeUpdates.map((item, index) => (
                <div key={`${item.studentName}-${index}`} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.studentName}</p>
                    <p className="text-xs text-gray-500">{item.subjectName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {item.finalGrade != null ? `${item.finalGrade}%` : "–"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">
                No grade changes recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
