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
  faBookOpen as faBookOpenSolid,
  faFlask,
  faGlobe,
  faFont,
  faMusic,
  faLaptop,
  faHeart,
  faBookReader,
  faTools,
  faBalanceScale,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/authContext";
import AppService from "../../../appService";
import gradeService from "../../../services/gradeService";
import attendanceService from "../../../services/attendanceService";

// ===== UTILITY FUNCTIONS =====
const clampGrade = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
};

const parseAcademicYear = (academicYear) => {
  if (typeof academicYear !== "string") return 0;
  const year = parseInt(academicYear.split("-")[0], 10);
  return Number.isNaN(year) ? 0 : year;
};

// ===== GRADE PROCESSING ENGINE =====
class GradeProcessor {
  static extractFinalGrade(entry) {
    if (!entry) return null;

    // Priority 1: Direct finalGrade field
    if (typeof entry.finalGrade === "number" && !Number.isNaN(entry.finalGrade)) {
      return entry.finalGrade;
    }

    // Priority 2: Quarter totals average (if available)
    if (entry.quarterTotals) {
      const quarters = ['q1', 'q2', 'q3', 'q4'];
      const validGrades = quarters
        .map(q => entry.quarterTotals[q])
        .filter(grade => typeof grade === "number" && !Number.isNaN(grade));
      
      if (validGrades.length > 0) {
        return validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
      }
    }

    return null;
  }

  static extractQuarterTrend(entry) {
    if (!entry?.quarterTotals) return 0;
    
    const quarters = ['q1', 'q2', 'q3', 'q4'];
    const validGrades = quarters
      .map(q => entry.quarterTotals[q])
      .filter(grade => typeof grade === "number" && !Number.isNaN(grade));
    
    if (validGrades.length < 2) return 0;
    
    // Calculate trend within the current academic year using quarters
    const xValues = Array.from({ length: validGrades.length }, (_, i) => i + 1);
    const { slope } = this.calculateLinearRegression(xValues, validGrades);
    
    return Number((slope * 10).toFixed(1)); // Scale for meaningful display
  }

  static calculateLinearRegression(x, y) {
    if (x.length !== y.length || x.length === 0) return { slope: 0, intercept: 0 };

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  static processSubjectHistory(progress) {
    if (!Array.isArray(progress)) return [];

    return progress
      .filter(entry => {
        if (!entry?.academicYear) return false;
        return this.extractFinalGrade(entry) !== null;
      })
      .sort((a, b) => {
        const yearA = parseAcademicYear(a.academicYear);
        const yearB = parseAcademicYear(b.academicYear);
        if (yearA !== yearB) return yearA - yearB;
        return (a.gradeLevel || 0) - (b.gradeLevel || 0);
      });
  }

  static calculateOverallTrend(history) {
    // If we have multiple academic years, use year-over-year trend
    if (history.length >= 2) {
      const grades = history.map(entry => this.extractFinalGrade(entry));
      const xValues = Array.from({ length: grades.length }, (_, i) => i + 1);
      const { slope } = this.calculateLinearRegression(xValues, grades);
      
      return Number((slope * 10).toFixed(1));
    }
    
    // For single year, use quarter trend within the year
    if (history.length === 1 && history[0]?.quarterTotals) {
      return this.extractQuarterTrend(history[0]);
    }
    
    return 0;
  }

  static predictGrade(currentGrade, trend, history, subjectName) {
    if (currentGrade === null) return null;

    // Base prediction formula
    let prediction = 0.6 * currentGrade + 0.3 * trend;

    // Apply quarter-based adjustments if available
    if (history.length === 1 && history[0]?.quarterTotals) {
      const quarters = ['q1', 'q2', 'q3', 'q4'];
      const quarterGrades = quarters
        .map(q => history[0].quarterTotals[q])
        .filter(grade => typeof grade === "number" && !Number.isNaN(grade));
      
      if (quarterGrades.length >= 2) {
        const recentTrend = this.extractQuarterTrend(history[0]);
        
        // If recent trend is strongly negative, adjust prediction downward
        if (recentTrend < -2) {
          prediction *= 0.9;
        }
        // If recent trend is strongly positive, adjust prediction upward
        else if (recentTrend > 2) {
          prediction *= 1.05;
        }
      }
    }

    // Final safety checks
    prediction = Math.max(0, Math.min(100, prediction));
    
    const finalPrediction = Number(prediction.toFixed(1));
    return finalPrediction;
  }

  static formatTrendDisplay(trendValue) {
    return `${trendValue > 0 ? "+" : ""}${trendValue.toFixed(1)}`;
  }
}

// ===== DATA PROCESSING HOOKS =====
const useSubjectInsights = (progressData) => {
  return useMemo(() => {
    if (!Array.isArray(progressData)) return [];

    return progressData.map(subject => {
      const history = GradeProcessor.processSubjectHistory(subject.progress);
      
      if (history.length === 0) {
        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          subjectType: subject.subjectType || 'Other',
          currentAverage: null,
          previousAverage: null,
          improvementTrend: 0,
          predictedGrade: null,
          hasData: false,
          historyLength: 0,
        };
      }

      const currentEntry = history[history.length - 1];
      const previousEntry = history.length > 1 ? history[history.length - 2] : null;

      const currentAverage = GradeProcessor.extractFinalGrade(currentEntry);
      const previousAverage = previousEntry ? GradeProcessor.extractFinalGrade(previousEntry) : null;
      const improvementTrend = GradeProcessor.calculateOverallTrend(history);
      const predictedGrade = GradeProcessor.predictGrade(
        currentAverage, 
        improvementTrend, 
        history, 
        subject.subjectName
      );

      // Add quarter data for display if available
      const quarterData = currentEntry.quarterTotals ? {
        q1: currentEntry.quarterTotals.q1,
        q2: currentEntry.quarterTotals.q2,
        q3: currentEntry.quarterTotals.q3,
        q4: currentEntry.quarterTotals.q4,
      } : null;

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        subjectType: subject.subjectType || 'Other',
        currentAverage: clampGrade(currentAverage),
        previousAverage: clampGrade(previousAverage),
        improvementTrend,
        predictedGrade,
        hasData: true,
        historyLength: history.length,
        hasMultipleYears: history.length > 1,
        quarterData,
        academicYear: currentEntry.academicYear,
        formattedTrend: GradeProcessor.formatTrendDisplay(improvementTrend),
      };
    });
  }, [progressData]);
};

const useOverallMetrics = (subjectInsights) => {
  return useMemo(() => {
    const validSubjects = subjectInsights.filter(subject => subject.hasData);

    if (validSubjects.length === 0) {
      return {
        currentAverage: null,
        predictedAverage: null,
        improvementTrend: 0,
        subjectCount: subjectInsights.length,
        validSubjectCount: 0,
      };
    }

    const currentAverage = validSubjects.reduce((sum, subject) => 
      sum + subject.currentAverage, 0) / validSubjects.length;

    const predictedAverage = validSubjects.reduce((sum, subject) => 
      sum + subject.predictedGrade, 0) / validSubjects.length;

    // Calculate simple average improvement trend
    const totalImprovement = validSubjects.reduce((sum, subject) => 
      sum + subject.improvementTrend, 0);
    const averageImprovement = totalImprovement / validSubjects.length;

    return {
      currentAverage: Number(currentAverage.toFixed(1)),
      predictedAverage: Number(predictedAverage.toFixed(1)),
      improvementTrend: Number(averageImprovement.toFixed(1)),
      subjectCount: subjectInsights.length,
      validSubjectCount: validSubjects.length,
      formattedTrend: GradeProcessor.formatTrendDisplay(averageImprovement),
    };
  }, [subjectInsights]);
};

const useGroupedInsights = (subjectInsights) => {
  return useMemo(() => {
    const groups = {};
    
    subjectInsights.forEach(insight => {
      const type = insight.subjectType || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(insight);
    });

    return Object.entries(groups)
      .map(([type, insights]) => ({ 
        type, 
        insights: insights.sort((a, b) => a.subjectName.localeCompare(b.subjectName))
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [subjectInsights]);
};

// ===== MAIN COMPONENT =====
const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Process insights from raw data
  const subjectInsights = useSubjectInsights(progressData);
  const overallMetrics = useOverallMetrics(subjectInsights);
  const groupedInsights = useGroupedInsights(subjectInsights);

  // Data fetching
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

        // Process profile
        const profilePayload = profileRes?.data?.data ?? profileRes?.data ?? profileRes;
        setProfile(profilePayload);

        // Process progress data
        const progressRaw = progressRes?.data ?? progressRes;
        let progressPayload = [];

        if (Array.isArray(progressRaw?.data)) progressPayload = progressRaw.data;
        else if (Array.isArray(progressRaw)) progressPayload = progressRaw;
        else if (Array.isArray(progressRaw?.data?.data)) progressPayload = progressRaw.data.data;
        else if (Array.isArray(progressRaw?.data?.progress)) progressPayload = progressRaw.data.progress;
        else if (Array.isArray(progressRaw?.progress)) progressPayload = progressRaw.progress;

        setProgressData(progressPayload);

        // Process attendance
        let attendancePayload = null;
        try {
          const overviewRes = await attendanceService.getStudentAttendanceOverview(token);
          attendancePayload = overviewRes?.data || overviewRes;
        } catch (attendanceError) {
          console.warn('Attendance overview failed:', attendanceError);
        }

        setAttendanceOverview(attendancePayload);

      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id, token]);

  // Summary cards configuration
  const summaryCards = useMemo(() => [
    {
      label: "Current average",
      value: overallMetrics.currentAverage ?? "—",
      helper: "Across tracked subjects",
      icon: faChartLine,
      accent: "bg-sky-100 text-sky-600",
    },
    {
      label: "Predicted average",
      value: overallMetrics.predictedAverage ?? "—",
      helper: "Using weighted forecast",
      icon: faBullseye,
      accent: "bg-amber-100 text-amber-600",
    },
    {
      label: "Subjects monitored",
      value: overallMetrics.subjectCount,
      helper: `${overallMetrics.validSubjectCount} with grades`,
      icon: faBookOpen,
      accent: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Avg. improvement",
      value: overallMetrics.formattedTrend ?? "0.0",
      helper: "Based on current performance",
      icon: faArrowTrendUp,
      accent: overallMetrics.improvementTrend > 0 
        ? "bg-emerald-100 text-emerald-600" 
        : overallMetrics.improvementTrend < 0 
        ? "bg-red-100 text-red-600"
        : "bg-purple-100 text-purple-600",
    },
    {
      label: "Attendance",
      value: attendanceOverview?.overall?.attendanceRate != null
        ? `${attendanceOverview.overall.attendanceRate}%`
        : "—",
      helper: attendanceOverview?.overall
        ? `${attendanceOverview.overall.present}/${attendanceOverview.overall.totalSessions} sessions`
        : "No attendance data",
      icon: faCalendarAlt,
      accent: "bg-rose-100 text-rose-600",
    },
  ], [overallMetrics, attendanceOverview]);

  // Subject type icons
  const typeIcons = {
    Math: faBookOpenSolid,
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
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-sky-900 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }} />
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
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Summary Cards */}
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

      {/* Current Performance Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Performance and Trend by Subject</h2>
            <p className="text-sm text-gray-500">
              {subjectInsights.some(s => s.hasMultipleYears) 
                ? "Monitor your current grades and improvement trends across all subjects."
                : "Track your current performance and grade progress."
              }
            </p>
          </div>
        </div>

        {groupedInsights.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            We need more graded subjects before we can generate insights. Keep submitting assessments and check back soon!
          </div>
        ) : (
          groupedInsights.map(({ type, insights }) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-4">
                <FontAwesomeIcon 
                  icon={typeIcons[type] || faBookOpenSolid} 
                  className="h-5 w-5 text-gray-600" 
                />
                <h3 className="text-lg font-semibold text-gray-900">
                  {type} ({insights.length} subject{insights.length === 1 ? '' : 's'})
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {insights.map((subject) => (
                  <SubjectCard key={subject.subjectId} subject={subject} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

// ===== SUB-COMPONENTS =====
const SubjectCard = ({ subject }) => {
  const getGradeColor = (grade) => {
    if (grade >= 85) return { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" };
    if (grade >= 75) return { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" };
    return { bg: "bg-red-100", text: "text-red-600", bar: "bg-red-500" };
  };

  const colors = subject.currentAverage != null ? getGradeColor(subject.currentAverage) : null;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{subject.subjectName}</h4>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {subject.hasMultipleYears ? 'Year-over-year trend' : 'Current performance'}
              {subject.academicYear && ` • ${subject.academicYear}`}
            </p>
          </div>
          {subject.currentAverage != null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}>
              <FontAwesomeIcon icon={faChartLine} />
              {subject.currentAverage}
            </span>
          )}
        </div>

        {/* Current Performance and Trend */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Current Grade</p>
            <p className="text-xl font-semibold text-gray-800">{subject.currentAverage ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Trend</p>
            <p className={`text-xl font-semibold ${
              subject.improvementTrend > 0 ? "text-emerald-600" : 
              subject.improvementTrend < 0 ? "text-red-600" : "text-gray-600"
            }`}>
              {subject.formattedTrend}
            </p>
          </div>
        </div>

        {subject.currentAverage != null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Performance level</span>
              <span>{subject.currentAverage >= 75 ? "On track" : "Needs attention"}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${colors.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, subject.currentAverage))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;