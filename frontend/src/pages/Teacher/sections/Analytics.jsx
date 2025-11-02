import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faCircleInfo,
  faBookOpen,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import teacherService from "../../../services/teacherService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const InfoCard = ({ title, description }) => (
  <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 flex gap-3">
    <div className="text-[#81020b] pt-1">
      <FontAwesomeIcon icon={faCircleInfo} />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const RiskMeter = ({ risk }) => {
  const total = (risk?.high || 0) + (risk?.medium || 0) + (risk?.low || 0);
  if (!total) {
    return <p className="text-sm text-gray-400">No graded students yet.</p>;
  }

  const segments = [
    { label: "High", value: risk.high, color: "bg-red-500" },
    { label: "Medium", value: risk.medium, color: "bg-amber-500" },
    { label: "Low", value: risk.low, color: "bg-emerald-500" },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="space-y-3">
      <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden flex">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.color} h-full`}
            style={{ width: `${Math.round((segment.value / total) * 100)}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />
          High: {risk.high}
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />
          Medium: {risk.medium}
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          Low: {risk.low}
        </p>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await teacherService.getAnalytics();
        setData(response);
      } catch (err) {
        console.error("Error loading teacher analytics", err);
        setError(
          err?.response?.data?.message || err?.message || "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const gradeDistributionChart = useMemo(() => {
    if (!data?.gradeDistribution?.labels?.length) return null;
    return {
      labels: data.gradeDistribution.labels,
      datasets: [
        {
          label: "Students",
          data: data.gradeDistribution.counts,
          backgroundColor: [
            "rgba(14, 165, 233, 0.85)",
            "rgba(16, 185, 129, 0.85)",
            "rgba(250, 204, 21, 0.9)",
            "rgba(248, 113, 113, 0.9)",
            "rgba(107, 114, 128, 0.9)",
            "rgba(129, 2, 11, 0.85)",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  const quarterAveragesChart = useMemo(() => {
    if (!data?.quarterAverages?.values?.some((value) => value != null)) return null;
    return {
      labels: data.quarterAverages.labels,
      datasets: [
        {
          label: "Average grade",
          data: data.quarterAverages.values.map((value) => value ?? null),
          borderColor: "rgba(129, 2, 11, 0.85)",
          backgroundColor: "rgba(129, 2, 11, 0.15)",
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [data]);

  const attendanceTrendChart = useMemo(() => {
    if (!data?.attendanceTrend?.length) return null;
    return {
      labels: data.attendanceTrend.map((item) => item.date),
      datasets: [
        {
          label: "Present",
          data: data.attendanceTrend.map((item) => item.Present ?? 0),
          borderColor: "rgba(16, 185, 129, 0.9)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Absent",
          data: data.attendanceTrend.map((item) => item.Absent ?? 0),
          borderColor: "rgba(248, 113, 113, 0.85)",
          backgroundColor: "rgba(248, 113, 113, 0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [data]);

  const subjectPerformanceChart = useMemo(() => {
    if (!data?.subjectPerformance?.length) return null;
    return {
      labels: data.subjectPerformance.map((subject) => subject.name),
      datasets: [
        {
          label: "Students",
          data: data.subjectPerformance.map((subject) => subject.studentCount || 0),
          backgroundColor: "rgba(14, 165, 233, 0.75)",
          borderRadius: 6,
        },
        {
          label: "Average grade",
          data: data.subjectPerformance.map((subject) => subject.averageGrade || 0),
          backgroundColor: "rgba(129, 2, 11, 0.75)",
          borderRadius: 6,
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
          Loading analytics…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2">We couldn’t load analytics</h2>
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

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
                Analytics dashboard
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Insights across your classes</h1>
                <p className="text-sm text-white/85">
                  Review grade distribution trends, attendance patterns, and subject performance to inform interventions and celebrate wins with your learners.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Subjects analysed: <strong className="text-white">{data?.subjectPerformance?.length || 0}</strong>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Risk snapshot: <strong className="text-white">{(data?.studentRisk?.high || 0) + (data?.studentRisk?.medium || 0) + (data?.studentRisk?.low || 0)} students</strong>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Attendance records: <strong className="text-white">{data?.attendanceTrend?.length || 0}</strong>
                </span>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 text-xs text-white/90 shadow-lg backdrop-blur-sm sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0ea5e9]/30 text-white">
                  <FontAwesomeIcon icon={faChartLine} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Highest average</p>
                  <p className="text-sm font-semibold text-white">
                    {data?.subjectPerformance?.length ? `${Math.max(...data.subjectPerformance.map((s) => s.averageGrade || 0)).toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/25 text-white">
                  <FontAwesomeIcon icon={faCircleInfo} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Attendance trend</p>
                  <p className="text-sm font-semibold text-white">
                    {data?.attendanceTrend?.length ? `${data.attendanceTrend[data.attendanceTrend.length - 1]?.Present ?? 0} present last day` : 'No data yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Grade distribution</h2>
              <p className="text-sm text-gray-500">How final grades are distributed across your classes.</p>
            </div>
          </div>
          {gradeDistributionChart ? (
            <div className="h-72">
              <Doughnut
                data={gradeDistributionChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                }}
              />
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No grades recorded yet.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500" />
            <h2 className="text-lg font-semibold text-gray-800">Risk snapshot</h2>
          </div>
          <p className="text-sm text-gray-500">
            Students falling below key grade thresholds. Use this to prioritise feedback and interventions.
          </p>
          <RiskMeter risk={data?.studentRisk} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Quarter averages</h2>
              <p className="text-sm text-gray-500">Compare how each quarter is trending across your classes.</p>
            </div>
          </div>
          {quarterAveragesChart ? (
            <div className="h-64">
              <Line
                data={quarterAveragesChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { stepSize: 10 },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              Quarters will appear once grades are recorded.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <h2 className="text-lg font-semibold text-gray-800">Attendance trend</h2>
          <p className="text-sm text-gray-500">Presence and absences across the last 14 teaching days.</p>
          {attendanceTrendChart ? (
            <div className="h-64">
              <Line
                data={attendanceTrendChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              Attendance will appear once sessions are logged.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faBookOpen} className="text-[#81020b]" />
          <h2 className="text-lg font-semibold text-gray-800">Subject performance overview</h2>
        </div>
        <p className="text-sm text-gray-500">
          Compare class sizes, grade averages, and attendance rates across all of your subjects.
        </p>

        {subjectPerformanceChart ? (
          <div className="h-72">
            <Bar
              data={subjectPerformanceChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5 },
                  },
                  x: {
                    ticks: { font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            Add subjects to view comparative insights.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <InfoCard
            title="Use trends to personalise support"
            description="Identify which classes need more attention based on lower average grades or attendance dips."
          />
          <InfoCard
            title="Celebrate improvements"
            description="Spot classes that are trending upward and share progress with your students and their guardians."
          />
          <InfoCard
            title="Plan interventions"
            description="Combine grade and attendance data to decide when to reach out or schedule consultations."
          />
        </div>
      </section>
    </div>
  );
};

export default Analytics;
