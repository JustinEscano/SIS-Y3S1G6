import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserGraduate,
  faChartLine,
  faBullseye,
  faBookOpen,
  faArrowTrendUp,
  faCircleExclamation,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/authContext";
import AppService from "../../../appService";
import gradeService from "../../../services/gradeService";
import attendanceService from "../../../services/attendanceService";

const clampGrade = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
};

const parseAcademicYear = (academicYear) => {
  if (typeof academicYear !== "string") return 0;
  const year = parseInt(academicYear.split("-")[0], 10);
  return Number.isNaN(year) ? 0 : year;
};

const computeSubjectInsight = (subjectProgress) => {
  const hasUsableScores = (entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (typeof entry.finalGrade === "number" && !Number.isNaN(entry.finalGrade)) return true;
    const quarters = entry.quarterTotals;
    if (!quarters || typeof quarters !== "object") return false;
    return ["q1", "q2", "q3", "q4"].some(
      (key) => typeof quarters[key] === "number" && !Number.isNaN(quarters[key])
    );
  };

  const history = Array.isArray(subjectProgress.progress)
    ? subjectProgress.progress
        .filter(hasUsableScores)
        .sort((a, b) => parseAcademicYear(a.academicYear) - parseAcademicYear(b.academicYear))
    : [];

  if (!history.length) {
    return {
      subjectId: subjectProgress.subjectId,
      subjectName: subjectProgress.subjectName,
      currentAverage: null,
      previousAverage: null,
      improvementTrend: 0,
      predictedGrade: null,
    };
  }

  const currentEntry = history[history.length - 1];
  const previousEntry = history.length > 1 ? history[history.length - 2] : null;

  const extractFinal = (entry) => {
    if (!entry) return null;
    if (typeof entry.finalGrade === "number") return entry.finalGrade;
    if (entry.quarterTotals) {
      const values = [entry.quarterTotals.q1, entry.quarterTotals.q2, entry.quarterTotals.q3, entry.quarterTotals.q4]
        .filter((val) => typeof val === "number" && !Number.isNaN(val));
      if (values.length) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        return Number(avg.toFixed(1));
      }
    }
    return null;
  };

  const currentAverage = extractFinal(currentEntry);
  const previousAverage = extractFinal(previousEntry);
  const improvementTrend = previousAverage != null && currentAverage != null
    ? currentAverage - previousAverage
    : 0;

  // Predicted score: keep the current average as the baseline and apply 30% of the improvement delta
  const weightedPrediction = currentAverage != null
    ? currentAverage + 0.3 * improvementTrend
    : null;

  return {
    subjectId: subjectProgress.subjectId,
    subjectName: subjectProgress.subjectName,
    currentAverage: clampGrade(currentAverage),
    previousAverage: clampGrade(previousAverage),
    improvementTrend: Number(improvementTrend.toFixed(1)),
    predictedGrade: clampGrade(weightedPrediction),
  };
};

const formatGrade = (grade, fallback = "—") => {
  if (typeof grade !== "number" || Number.isNaN(grade)) return fallback;
  return grade.toFixed(1);
};

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subjectInsights, setSubjectInsights] = useState([]);
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildAttendanceFallback = useCallback(async (subjects) => {
    if (!Array.isArray(subjects) || !subjects.length || !user?.id || !token) {
      return null;
    }

    const responses = await Promise.allSettled(
      subjects.map((subject) => {
        if (!subject?.subjectId) return Promise.resolve(null);
        return attendanceService.getStudentSubjectAttendance(subject.subjectId, user.id, {}, token);
      })
    );

    const totals = { present: 0, absent: 0, tardy: 0, total: 0 };
    const subjectSummaries = [];

    responses.forEach((result, index) => {
      if (result.status !== "fulfilled" || !result.value) return;

      const subjectMeta = subjects[index] || {};
      const payload = result.value?.data ?? result.value ?? {};
      const records = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

      let present = 0;
      let absent = 0;
      let tardy = 0;
      let lastRecord = null;

      records.forEach((record) => {
        if (!record) return;
        const status = record.status || "Absent";
        const date = record.date ? new Date(record.date) : null;

        if (status === "Present") present += 1;
        else if (status === "Tardy") tardy += 1;
        else absent += 1;

        if (!lastRecord || (date && date > lastRecord.date)) {
          lastRecord = { date: date || null, status };
        }
      });

      const total = present + absent + tardy;
      totals.present += present;
      totals.absent += absent;
      totals.tardy += tardy;
      totals.total += total;

      subjectSummaries.push({
        subjectId: subjectMeta.subjectId || null,
        subjectName: subjectMeta.subjectName || "Subject",
        gradeLevel: subjectMeta.gradeLevel ?? null,
        academicYear: subjectMeta.academicYear ?? null,
        present,
        absent,
        tardy,
        total,
        attendanceRate: total ? Math.round((present / total) * 1000) / 10 : 0,
        lastStatus: lastRecord?.status || null,
        lastDate: lastRecord?.date ? lastRecord.date.toISOString() : null,
      });
    });

    if (!subjectSummaries.length) {
      return null;
    }

    const overallRate = totals.total ? Math.round((totals.present / totals.total) * 1000) / 10 : 0;

    return {
      overall: {
        attendanceRate: overallRate,
        present: totals.present,
        absent: totals.absent,
        tardy: totals.tardy,
        totalSessions: totals.total,
      },
      subjects: subjectSummaries,
    };
  }, [token, user?.id]);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user?.id || !token) {
        setError("We couldn't verify your session. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [profileRes, progressRes] = await Promise.all([
          AppService.get("/students/profile/me"),
          gradeService.getStudentGradeProgress(user.id, token),
        ]);

        const profilePayload = profileRes?.data?.data ?? profileRes?.data ?? null;
        const progressRaw = progressRes?.data ?? progressRes;
        const progressPayload = Array.isArray(progressRaw?.data)
          ? progressRaw.data
          : Array.isArray(progressRaw)
          ? progressRaw
          : Array.isArray(progressRaw?.data?.data)
          ? progressRaw.data.data
          : Array.isArray(progressRaw?.data?.progress)
          ? progressRaw.data.progress
          : Array.isArray(progressRaw?.progress)
          ? progressRaw.progress
          : [];

        setProfile(profilePayload);
        setSubjectInsights(progressPayload.map(computeSubjectInsight));

        let attendancePayload = null;
        try {
          const overviewRes = await attendanceService.getStudentAttendanceOverview(token);
          attendancePayload = overviewRes?.data || overviewRes || null;
        } catch (attendanceError) {
          if (attendanceError?.response?.status === 404) {
            attendancePayload = await buildAttendanceFallback(progressPayload);
          } else {
            throw attendanceError;
          }
        }

        setAttendanceOverview(attendancePayload);
      } catch (err) {
        console.error("Error loading student dashboard:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id, token, buildAttendanceFallback]);

  const overallMetrics = useMemo(() => {
    if (!subjectInsights.length) {
      return {
        currentAverage: null,
        predictedAverage: null,
        improvementTrend: 0,
        subjectCount: 0,
      };
    }

    const currentGrades = subjectInsights
      .map((item) => item.currentAverage)
      .filter((grade) => typeof grade === "number" && !Number.isNaN(grade));
    const predictedGrades = subjectInsights
      .map((item) => item.predictedGrade)
      .filter((grade) => typeof grade === "number" && !Number.isNaN(grade));
    const improvements = subjectInsights.map((item) => item.improvementTrend || 0);

    const average = (values) => {
      if (!values.length) return null;
      const total = values.reduce((sum, value) => sum + value, 0);
      return Number((total / values.length).toFixed(1));
    };

    return {
      currentAverage: average(currentGrades),
      predictedAverage: average(predictedGrades),
      improvementTrend: Number((improvements.reduce((sum, value) => sum + value, 0) / improvements.length).toFixed(1)),
      subjectCount: subjectInsights.length,
    };
  }, [subjectInsights]);

  const summaryCards = useMemo(() => (
    [
      {
        label: "Current average",
        value: formatGrade(overallMetrics.currentAverage),
        helper: "Across tracked subjects",
        icon: faChartLine,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Predicted average",
        value: formatGrade(overallMetrics.predictedAverage),
        helper: overallMetrics.predictedAverage != null && overallMetrics.currentAverage != null
          ? overallMetrics.predictedAverage >= overallMetrics.currentAverage
            ? "Forecast trending upward"
            : "Forecast trending lower"
          : "Based on your latest data",
        icon: faBullseye,
        accent: "bg-amber-100 text-amber-600",
      },
      {
        label: "Subjects monitored",
        value: overallMetrics.subjectCount,
        helper: "With historical data",
        icon: faBookOpen,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Avg. improvement",
        value: `${overallMetrics.improvementTrend >= 0 ? "+" : ""}${formatGrade(overallMetrics.improvementTrend, "0.0")}`,
        helper: "Year-over-year change",
        icon: faArrowTrendUp,
        accent: "bg-purple-100 text-purple-600",
      },
      {
        label: "Attendance",
        value: attendanceOverview?.overall?.attendanceRate != null
          ? `${attendanceOverview.overall.attendanceRate}%`
          : "—",
        helper: attendanceOverview?.overall
          ? `${attendanceOverview.overall.present}/${attendanceOverview.overall.totalSessions} sessions present`
          : "Attendance overview",
        icon: faCalendarAlt,
        accent: "bg-rose-100 text-rose-600",
      },
    ]
  ), [overallMetrics, attendanceOverview]);

  const momentumInsights = useMemo(() => {
    if (!subjectInsights.length) {
      return { improving: [], declining: [] };
    }

    const improving = subjectInsights
      .filter((item) => item.improvementTrend > 0 && typeof item.predictedGrade === "number")
      .sort((a, b) => b.improvementTrend - a.improvementTrend)
      .slice(0, 3);

    const declining = subjectInsights
      .filter((item) => item.improvementTrend < 0 && typeof item.predictedGrade === "number")
      .sort((a, b) => a.improvementTrend - b.improvementTrend)
      .slice(0, 3);

    return { improving, declining };
  }, [subjectInsights]);

  const strugglingSubjects = useMemo(
    () => subjectInsights
      .filter((item) => typeof item.predictedGrade === "number" && item.predictedGrade < 75)
      .sort((a, b) => (a.predictedGrade ?? 0) - (b.predictedGrade ?? 0)),
    [subjectInsights]
  );

  if (loading) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm">
          <p className="text-center text-sm text-gray-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-sky-900 text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faUserGraduate} /> Student dashboard
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {profile?.name ? `Hi ${profile.name.split(" ")[0]}, keep the momentum going!` : "Keep the momentum going!"}
                </h1>
                <p className="text-sm text-white/85">
                  Track your progress, forecast where your grades are heading, and focus on the subjects that need the most attention.
                </p>
              </div>
            </div>
            {overallMetrics.predictedAverage != null && overallMetrics.currentAverage != null && (
              <div className="flex flex-col items-start gap-3 text-sm md:items-end">
                <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-left shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-white/70">Forecast snapshot</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatGrade(overallMetrics.predictedAverage)} expected · {overallMetrics.predictedAverage >= overallMetrics.currentAverage ? "On pace" : "Needs lift"}
                  </p>
                  <p className="text-[11px] text-white/65">
                    Updated from your latest grades  stay consistent to keep this trend.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
              {error}
            </div>
          )}
        </div>
      </section>

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

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Predicted performance by subject</h2>
            <p className="text-sm text-gray-500">See where your grades are trending next based on historical improvement.</p>
          </div>
        </div>

        {subjectInsights.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            We need more graded subjects before we can generate predictions. Keep submitting assessments and check back soon!
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {subjectInsights.map((subject) => (
              <div key={subject.subjectId || subject.subjectName} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{subject.subjectName}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Historical trend</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${subject.predictedGrade != null && subject.predictedGrade >= 85
                      ? "bg-emerald-100 text-emerald-700"
                      : subject.predictedGrade != null && subject.predictedGrade >= 75
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-600"}`}>
                      <FontAwesomeIcon icon={faBullseye} />
                      {subject.predictedGrade != null ? `${subject.predictedGrade}` : "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Current</p>
                      <p className="text-lg font-semibold text-gray-800">{subject.currentAverage ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Previous</p>
                      <p className="text-lg font-semibold text-gray-800">{subject.previousAverage ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Trend</p>
                      <p className={`text-lg font-semibold ${subject.improvementTrend > 0 ? "text-emerald-600" : subject.improvementTrend < 0 ? "text-red-600" : "text-gray-600"}`}>
                        {subject.improvementTrend > 0 ? "+" : ""}{subject.improvementTrend.toFixed?.(1) ?? subject.improvementTrend}
                      </p>
                    </div>
                  </div>

                  {subject.predictedGrade != null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Projected score goal</span>
                        <span>{subject.predictedGrade >= 75 ? "On track" : "Needs attention"}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${subject.predictedGrade >= 85 ? "bg-emerald-500" : subject.predictedGrade >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, Math.max(0, subject.predictedGrade))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {attendanceOverview && (
        <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Attendance overview</h2>
              <p className="text-sm text-gray-500">Review how consistently youve attended classes this term.</p>
            </div>
            {attendanceOverview.overall && (
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600">
                <span>{attendanceOverview.overall.present} present</span>
                <span>&bull;</span>
                <span>{attendanceOverview.overall.absent} absent</span>
                <span>&bull;</span>
                <span>{attendanceOverview.overall.tardy} tardy</span>
                <span>&bull;</span>
                <span>{attendanceOverview.overall.totalSessions} total sessions</span>
              </div>
            )}
          </div>

          {attendanceOverview.subjects?.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {attendanceOverview.subjects.map((subject) => (
                <div key={subject.subjectId || subject.subjectName} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{subject.subjectName}</h3>
                    <p className="text-xs text-gray-500">Grade {subject.gradeLevel ?? "—"}  {subject.academicYear || "Academic year TBD"}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                    <span>Attendance rate</span>
                    <span>{subject.attendanceRate}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="font-semibold text-gray-900">{subject.present}</p>
                      <p>Present</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="font-semibold text-gray-900">{subject.absent}</p>
                      <p>Absent</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="font-semibold text-gray-900">{subject.tardy}</p>
                      <p>Tardy</p>
                    </div>
                  </div>
                  {subject.lastDate && (
                    <p className="text-xs text-gray-400">
                      Last recorded {new Date(subject.lastDate).toLocaleDateString()}  {subject.lastStatus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
              No attendance has been recorded yet. Once your teachers start logging attendance, youll see it here.
            </div>
          )}
        </section>
      )}

      {subjectInsights.length > 0 && (
        <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Subjects to watch closely</h2>
              <p className="text-sm text-gray-500">Predictions below 75 need extra attention. Plan a catch-up session soon.</p>

              {strugglingSubjects.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-6 py-8 text-center text-sm text-emerald-700">
                  No subjects are currently trending below 75. Great job—keep up the consistency!
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {strugglingSubjects.map((subject) => (
                    <div key={subject.subjectId || subject.subjectName} className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-red-700">{subject.subjectName}</p>
                        <p className="text-xs text-red-500">Predicted {formatGrade(subject.predictedGrade)} • Trend {subject.improvementTrend > 0 ? "+" : ""}{subject.improvementTrend}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600">Focus area</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900">Momentum insights</h2>
              <p className="text-sm text-gray-500">Celebrate wins and keep an eye on dips to stay ahead of your goals.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">Top gains</p>
                  {momentumInsights.improving.length === 0 ? (
                    <p className="mt-2 text-xs text-emerald-600">No strong upward trends yet—keep pushing!</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-xs text-emerald-700">
                      {momentumInsights.improving.map((subject) => (
                        <li key={`gain-${subject.subjectId || subject.subjectName}`} className="flex items-center justify-between">
                          <span className="font-semibold">{subject.subjectName}</span>
                          <span>+{formatGrade(subject.improvementTrend, "0.0")} trend</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-700">Slipping subjects</p>
                  {momentumInsights.declining.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-600">No declines detected—stay consistent!</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-xs text-amber-700">
                      {momentumInsights.declining.map((subject) => (
                        <li key={`decline-${subject.subjectId || subject.subjectName}`} className="flex items-center justify-between">
                          <span className="font-semibold">{subject.subjectName}</span>
                          <span>{formatGrade(subject.predictedGrade)} projected</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
