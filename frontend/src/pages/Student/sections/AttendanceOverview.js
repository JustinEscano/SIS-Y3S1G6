import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faCircleExclamation,
  faArrowRotateRight,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/authContext";
import attendanceService from "../../../services/attendanceService";
import subjectService from "../../../services/subjectService";

const AttendanceOverview = () => {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectPage, setSubjectPage] = useState(1);
  const [enrolledPage, setEnrolledPage] = useState(1);
  const pageSize = 6;
  const enrolledPageSize = 6;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildAttendanceFallback = useCallback(async (subjectList) => {
    if (!Array.isArray(subjectList) || !subjectList.length || !user?.id || !token) {
      return null;
    }

    const responses = await Promise.allSettled(
      subjectList.map((subject) => {
        const subjectId = subject._id || subject.subjectId;
        if (!subjectId) return Promise.resolve(null);
        return attendanceService.getStudentSubjectAttendance(subjectId, user.id, {}, token);
      })
    );

    const totals = { present: 0, absent: 0, tardy: 0, total: 0 };
    const subjectSummaries = [];

    responses.forEach((result, index) => {
      if (result.status !== "fulfilled" || !result.value) return;

      const meta = subjectList[index] || {};
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
        subjectId: meta._id || meta.subjectId || null,
        subjectName: meta.name || meta.subjectName || "Subject",
        gradeLevel: meta.gradeLevel ?? null,
        academicYear: meta.academicYear ?? null,
        present,
        absent,
        tardy,
        total,
        attendanceRate: total ? Math.round((present / total) * 1000) / 10 : 0,
        lastStatus: lastRecord?.status || null,
        lastDate: lastRecord?.date ? lastRecord.date.toISOString() : null,
      });
    });

    if (!subjectSummaries.length) return null;

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

  const fetchAttendanceOverview = useCallback(async () => {
    if (!user?.id || !token) {
      setError("We couldn't verify your session. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const subjectRes = await subjectService.getStudentSubjects(token);
      const subjectList = Array.isArray(subjectRes?.data)
        ? subjectRes.data
        : Array.isArray(subjectRes)
        ? subjectRes
        : [];

      let attendanceData = null;
      try {
        const attendanceRes = await attendanceService.getStudentAttendanceOverview(token);
        attendanceData = attendanceRes?.data || attendanceRes || null;
      } catch (attendanceError) {
        if (attendanceError?.response?.status === 404) {
          attendanceData = await buildAttendanceFallback(subjectList);
        } else {
          throw attendanceError;
        }
      }

      const decoratedSubjects = (attendanceData?.subjects || []).map((entry) => {
        const meta = subjectList.find((subject) =>
          (subject._id || subject.subjectId) === (entry.subjectId || entry.subjectName)
        ) || {};

        return {
          ...entry,
          gradeLevel: entry.gradeLevel ?? meta.gradeLevel ?? null,
          academicYear: entry.academicYear ?? meta.academicYear ?? null,
        };
      });

      setSubjects(subjectList);
      setOverview(attendanceData ? { ...attendanceData, subjects: decoratedSubjects } : null);
    } catch (err) {
      console.error("Error fetching attendance overview:", err);
      setError(err.response?.data?.message || "Failed to load attendance overview.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [buildAttendanceFallback, token, user?.id]);

  useEffect(() => {
    fetchAttendanceOverview();
  }, [fetchAttendanceOverview]);

  const overallSummary = useMemo(() => {
    if (!overview?.overall) {
      return {
        attendanceRate: "—",
        present: 0,
        absent: 0,
        tardy: 0,
        totalSessions: 0,
      };
    }
    return overview.overall;
  }, [overview]);

  const paginatedSubjects = useMemo(() => {
    if (!overview?.subjects?.length) return [];
    const start = (subjectPage - 1) * pageSize;
    return overview.subjects.slice(start, start + pageSize);
  }, [overview, subjectPage]);

  const subjectTotalPages = useMemo(() => {
    if (!overview?.subjects?.length) return 1;
    return Math.max(1, Math.ceil(overview.subjects.length / pageSize));
  }, [overview]);

  const paginatedEnrolled = useMemo(() => {
    if (!subjects?.length) return [];
    const start = (enrolledPage - 1) * enrolledPageSize;
    return subjects.slice(start, start + enrolledPageSize);
  }, [subjects, enrolledPage]);

  const enrolledTotalPages = useMemo(() => {
    if (!subjects?.length) return 1;
    return Math.max(1, Math.ceil(subjects.length / enrolledPageSize));
  }, [subjects]);

  if (loading) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm">
          <p className="text-center text-sm text-gray-500">Loading your attendance overview…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-700 via-rose-600 to-rose-900 text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faCalendarAlt} /> Attendance overview
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {user?.name ? `${user.name.split(" ")[0]}, see how consistently you're showing up.` : "Track your presence."}
                </h1>
                <p className="text-sm text-white/80">
                  Monitor attendance per subject, spot gaps early, and stay accountable throughout the school year.
                </p>
              </div>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
                {error}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Attendance rate</p>
              <p className="text-3xl font-bold text-white">
                {overallSummary.attendanceRate != null ? `${overallSummary.attendanceRate}%` : "—"}
              </p>
              <p className="text-xs text-white/70">Overall presence across tracked sessions</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Present</p>
              <p className="text-3xl font-bold text-white">{overallSummary.present}</p>
              <p className="text-xs text-white/70">Total on-time attendances</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Absent</p>
              <p className="text-3xl font-bold text-white">{overallSummary.absent}</p>
              <p className="text-xs text-white/70">Sessions you missed</p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Tardy</p>
              <p className="text-3xl font-bold text-white">{overallSummary.tardy}</p>
              <p className="text-xs text-white/70">Late or partial attendances</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Attendance by subject</h2>
            <p className="text-sm text-gray-500">Drill into each class to review your participation pattern.</p>
          </div>
          <button
            onClick={fetchAttendanceOverview}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-600 transition hover:bg-gray-50"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} /> Refresh data
          </button>
        </div>

        {overview?.subjects?.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Attendance rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tardy</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedSubjects.map((entry) => (
                  <tr key={entry.subjectId || entry.subjectName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-semibold">{entry.subjectName}</div>
                      <div className="text-xs text-gray-500">
                        {entry.academicYear || "Academic year TBD"}
                        {entry.gradeLevel != null ? ` • Grade ${entry.gradeLevel}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{entry.attendanceRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{entry.present}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{entry.absent}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{entry.tardy}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.lastDate ? (
                        <span className="inline-flex items-center gap-2 text-gray-600">
                          <FontAwesomeIcon icon={faClock} className="text-xs text-gray-400" />
                          {new Date(entry.lastDate).toLocaleDateString()} {entry.lastStatus ? `• ${entry.lastStatus}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            No attendance records available yet. Once your teachers start tracking attendance, you'll see detailed breakdowns here.
          </div>
        )}
        {overview?.subjects?.length > pageSize && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            <button
              onClick={() => setSubjectPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border border-gray-200 px-3 py-1 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={subjectPage === 1}
            >
              Previous
            </button>
            <span className="text-xs uppercase tracking-widest">
              Page {subjectPage} of {subjectTotalPages}
            </span>
            <button
              onClick={() => setSubjectPage((prev) => Math.min(subjectTotalPages, prev + 1))}
              className="rounded-full border border-gray-200 px-3 py-1 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={subjectPage === subjectTotalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {subjects.length > 0 && (
        <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-gray-900">Enrolled subjects</h2>
          <p className="text-sm text-gray-500">Quick reference for the classes currently on your schedule.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedEnrolled.map((subject) => (
              <div key={subject._id || subject.subjectId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{subject.name || subject.subjectName}</div>
                <div className="mt-2 text-xs text-gray-500">
                  {subject.academicYear || "Academic year TBD"} • Grade {subject.gradeLevel ?? "—"}
                </div>
              </div>
            ))}
          </div>
          {subjects.length > enrolledPageSize && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
              <button
                onClick={() => setEnrolledPage((prev) => Math.max(1, prev - 1))}
                className="rounded-full border border-gray-200 px-3 py-1 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={enrolledPage === 1}
              >
                Previous
              </button>
              <span className="text-xs uppercase tracking-widest">
                Page {enrolledPage} of {enrolledTotalPages}
              </span>
              <button
                onClick={() => setEnrolledPage((prev) => Math.min(enrolledTotalPages, prev + 1))}
                className="rounded-full border border-gray-200 px-3 py-1 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={enrolledPage === enrolledTotalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AttendanceOverview;
