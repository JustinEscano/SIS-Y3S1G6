// src/components/SubjectAnalytics.jsx
// FULL REFRACTOR: Enhanced with clear actual (green) vs. predicted (blue) distinction.
// - Charts: Separate datasets for all modes; dashed blue for preds.
// - 'current': Emphasizes actual avg; gap-fills secondary.
// - 'sem2': Blue only on Q3/Q4; no next labels.
// - Dropdowns: Clearer labels.
// - Titles/Tooltips: Explicit "Actual" vs. "Predicted".

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faArrowLeft, 
  faExclamationTriangle, 
  faEdit, 
  faTrash, 
  faCheck, 
  faTimes, 
  faFileExport,
  faChartLine,
  faBullseye,
  faBookOpen,
  faArrowTrendUp,
  faCalendarAlt,
  faUserGraduate,
  faCircleExclamation,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';

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
import gradeService from '../services/gradeService';
import subjectService from '../services/subjectService';
import attendanceService from '../services/attendanceService';
import { useAuth } from '../context/authContext';
import { useGradePredictions } from '../hooks/useGradePredictions';
import LoadingSpinner from './loadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Constants
const QUARTERS = {
  q1: { label: 'Q1', cs: 'q1_cs', exam: 'q1_exam' },
  q2: { label: 'Q2', cs: 'q2_cs', exam: 'q2_exam' },
  q3: { label: 'Q3', cs: 'q3_cs', exam: 'q3_exam' },
  q4: { label: 'Q4', cs: 'q4_cs', exam: 'q4_exam' },
};

const PREDICTION_MODES = [
  { value: 'current', label: 'Current Year (Actual Avg + Gap Fills)' },
  { value: 'sem2', label: 'Q3 & Q4 Projection' },
  { value: 'nextYear', label: 'Next Year Projection' },
];

const CHART_BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 15
      }
    },
  },
  scales: {
    y: { 
      beginAtZero: true, 
      max: 100, 
      ticks: { stepSize: 10 },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    }
  },
};

const SubjectAnalytics = ({ subjectId, studentId, user, backUrl }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Core data states
  const [studentData, setStudentData] = useState(null);
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [comments, setComments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradeInputs, setGradeInputs] = useState({ 
    q1_cs: '', q1_exam: '', q2_cs: '', q2_exam: '', q3_cs: '', q3_exam: '', q4_cs: '', q4_exam: '' 
  });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingGrades, setSavingGrades] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('q1');
  const [predictionMode, setPredictionMode] = useState('current');
  const [dataScope, setDataScope] = useState('q1q2');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Comment-specific states
  const [newComment, setNewComment] = useState({ title: '', content: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editingCommentData, setEditingCommentData] = useState({ title: '', content: '' });
  
  // Pagination states
  const [currentCommentPage, setCurrentCommentPage] = useState(1);
  const [commentsPerPage, setCommentsPerPage] = useState(5);

  // Predictions hook
  const {
    chartData,
    predictValue,
    predictedFinal,
    slope,
    calculatedFinal,
    riskLevel,
    suggestedTitles,
    q1_total,
    q2_total,
    q3_total,
    q4_total,
  } = useGradePredictions(gradeInputs, predictionMode, dataScope);

  // Calculate attendance rate
  const { attendanceRate, presentCount, totalSessions } = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const rate = total > 0 ? (present / total * 100).toFixed(1) : 0;
    return { attendanceRate: parseFloat(rate), presentCount: present, totalSessions: total };
  }, [attendanceRecords]);

  // Quarters with actual grades
  const actualQuarters = useMemo(() => {
    const quarters = [];
    if (q1_total > 0) quarters.push('q1');
    if (q2_total > 0) quarters.push('q2');
    if (q3_total > 0) quarters.push('q3');
    if (q4_total > 0) quarters.push('q4');
    return quarters;
  }, [q1_total, q2_total, q3_total, q4_total]);

  // Most recent quarter
  const mostRecentQuarter = useMemo(() => {
    const recent = actualQuarters[actualQuarters.length - 1];
    if (!recent) return null;
    const totals = { q1: q1_total, q2: q2_total, q3: q3_total, q4: q4_total };
    return { label: QUARTERS[recent].label, value: totals[recent] };
  }, [actualQuarters, q1_total, q2_total, q3_total, q4_total]);

  // Conditional prediction modes
  const availablePredictionModes = useMemo(() => {
    const modes = [PREDICTION_MODES[0]];
    const hasSem1 = q1_total != null && q1_total > 0 && q2_total != null && q2_total > 0;
    if (hasSem1) {
      modes.push(PREDICTION_MODES[1]);
    }
    const hasFullYear = hasSem1 && q3_total != null && q3_total > 0 && q4_total != null && q4_total > 0;
    if (hasFullYear) {
      modes.push(PREDICTION_MODES[2]);
    }
    return modes;
  }, [q1_total, q2_total, q3_total, q4_total]);

  // Paginated comments
  const paginatedComments = useMemo(() => {
    const startIndex = (currentCommentPage - 1) * commentsPerPage;
    const endIndex = startIndex + commentsPerPage;
    return comments.slice(startIndex, endIndex);
  }, [comments, currentCommentPage, commentsPerPage]);

  // Calculate total pages
  const totalCommentPages = Math.ceil(comments.length / commentsPerPage);

  // Reset prediction mode if invalid
  useEffect(() => {
    if (!availablePredictionModes.find(m => m.value === predictionMode)) {
      setPredictionMode('current');
    }
  }, [availablePredictionModes, predictionMode]);

  // Auto-set data scope
  useEffect(() => {
    if (q4_total != null && q4_total > 0) setDataScope('q1q2q3q4');
    else if (q3_total != null && q3_total > 0) setDataScope('q1q2q3');
    else if (q2_total != null && q2_total > 0) setDataScope('q1q2');
    else if (q1_total != null && q1_total > 0) setDataScope('q1');
    else setDataScope('q1q2');
  }, [q1_total, q2_total, q3_total, q4_total]);

  // Reset to first page when comments change or items per page changes
  useEffect(() => {
    setCurrentCommentPage(1);
  }, [comments.length, commentsPerPage]);

  // Initial fetch
  useEffect(() => {
    if (!subjectId || !studentId || !token) {
      setError('Invalid parameters or authentication missing.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [subjectId, studentId, token]);

  const fetchData = useCallback(async (skipLoading = false) => {
    const wasLoading = !skipLoading;
    try {
      if (wasLoading) setLoading(true);
      setError(null);
      
      const [subjectResponse, studentResponse, attRes] = await Promise.all([
        subjectService.getSubject(subjectId, token),
        gradeService.getStudentSubjectGrades(subjectId, studentId, token),
        attendanceService.getStudentSubjectAttendance(subjectId, studentId, {}, token)
      ]);
      
      const subjectApiData = subjectResponse.data || subjectResponse;
      const subjectInnerData = subjectApiData.data || subjectApiData;
      setSubjectInfo(subjectInnerData.subject || subjectInnerData || null);

      const apiData = studentResponse.data || studentResponse;
      setStudentData(apiData);
      setComments(apiData.comments || []);
      
      let records = attRes.data || attRes || [];
      if (!Array.isArray(records)) records = [];
      setAttendanceRecords(records);
      
      setGradeInputs({
        q1_cs: apiData.currentGrades?.quarterGrades?.q1?.cs?.toString() || '',
        q1_exam: apiData.currentGrades?.quarterGrades?.q1?.exam?.toString() || '',
        q2_cs: apiData.currentGrades?.quarterGrades?.q2?.cs?.toString() || '',
        q2_exam: apiData.currentGrades?.quarterGrades?.q2?.exam?.toString() || '',
        q3_cs: apiData.currentGrades?.quarterGrades?.q3?.cs?.toString() || '',
        q3_exam: apiData.currentGrades?.quarterGrades?.q3?.exam?.toString() || '',
        q4_cs: apiData.currentGrades?.quarterGrades?.q4?.cs?.toString() || '',
        q4_exam: apiData.currentGrades?.quarterGrades?.q4?.exam?.toString() || '',
      });
    } catch (err) {
      console.error('💥 Fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      if (wasLoading) setLoading(false);
    }
  }, [subjectId, studentId, token]);

  const handleGradeChange = useCallback((field, value) => {
    if (value === '' || (!isNaN(value) && Number(value) >= 0 && Number(value) <= 100)) {
      setGradeInputs((prev) => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleSaveGrades = async () => {
    try {
      setSavingGrades(true);
      const q1_cs = parseFloat(gradeInputs.q1_cs) || null;
      const q1_exam = parseFloat(gradeInputs.q1_exam) || null;
      const q2_cs = parseFloat(gradeInputs.q2_cs) || null;
      const q2_exam = parseFloat(gradeInputs.q2_exam) || null;
      const q3_cs = parseFloat(gradeInputs.q3_cs) || null;
      const q3_exam = parseFloat(gradeInputs.q3_exam) || null;
      const q4_cs = parseFloat(gradeInputs.q4_cs) || null;
      const q4_exam = parseFloat(gradeInputs.q4_exam) || null;

      const q1_total_local = q1_cs !== null && q1_exam !== null ? Math.round(((q1_cs + q1_exam) / 2) * 100) / 100 : null;
      const q2_total_local = q2_cs !== null && q2_exam !== null ? Math.round(((q2_cs + q2_exam) / 2) * 100) / 100 : null;
      const q3_total_local = q3_cs !== null && q3_exam !== null ? Math.round(((q3_cs + q3_exam) / 2) * 100) / 100 : null;
      const q4_total_local = q4_cs !== null && q4_exam !== null ? Math.round(((q4_cs + q4_exam) / 2) * 100) / 100 : null;

      let sem1 = null;
      if (q1_total_local != null && q2_total_local != null) {
        sem1 = Math.round(((q1_total_local + q2_total_local) / 2) * 100) / 100;
      }
      let sem2 = null;
      if (q3_total_local != null && q4_total_local != null) {
        sem2 = Math.round(((q3_total_local + q4_total_local) / 2) * 100) / 100;
      }
      const gradeData = {
        quarterGrades: { 
          q1: { cs: q1_cs, exam: q1_exam },
          q2: { cs: q2_cs, exam: q2_exam },
          q3: { cs: q3_cs, exam: q3_exam },
          q4: { cs: q4_cs, exam: q4_exam }
        },
        semesterGrades: { sem1, sem2 }
      };
      await gradeService.updateStudentGrade(subjectId, studentId, gradeData, token);
      console.log('✅ Grades saved');
      await fetchData();
      setShowGradeModal(false);
    } catch (err) {
      console.error('💥 Save grades error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save grades');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleExportGrades = async () => {
    try {
      setExporting(true);
      const response = await gradeService.getStudentSubjectGrades(subjectId, studentId, token);
      const gradeData = response?.data || response;
      if (!gradeData) return;

      const rows = [
        ['Quarter', 'Component', 'Score'],
        ['Q1', 'CS', gradeData.currentGrades?.quarterGrades?.q1?.cs ?? ''],
        ['Q1', 'Exam', gradeData.currentGrades?.quarterGrades?.q1?.exam ?? ''],
        ['Q1', 'Total', gradeData.currentGrades?.quarterGrades?.q1?.total ?? ''],
        ['Q2', 'CS', gradeData.currentGrades?.quarterGrades?.q2?.cs ?? ''],
        ['Q2', 'Exam', gradeData.currentGrades?.quarterGrades?.q2?.exam ?? ''],
        ['Q2', 'Total', gradeData.currentGrades?.quarterGrades?.q2?.total ?? ''],
        ['Q3', 'CS', gradeData.currentGrades?.quarterGrades?.q3?.cs ?? ''],
        ['Q3', 'Exam', gradeData.currentGrades?.quarterGrades?.q3?.exam ?? ''],
        ['Q3', 'Total', gradeData.currentGrades?.quarterGrades?.q3?.total ?? ''],
        ['Q4', 'CS', gradeData.currentGrades?.quarterGrades?.q4?.cs ?? ''],
        ['Q4', 'Exam', gradeData.currentGrades?.quarterGrades?.q4?.exam ?? ''],
        ['Q4', 'Total', gradeData.currentGrades?.quarterGrades?.q4?.total ?? ''],
        ['Final', 'Final Grade', gradeData.currentGrades?.finalGrade ?? ''],
        ['Final', 'Letter', gradeData.currentGrades?.letterGrade ?? ''],
      ];

      const csvContent = rows
        .map((row) => row.map((cell) => (cell == null ? '' : `${cell}`.replace(/"/g, '""'))).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeSubject = (gradeData.student?.name || 'student').replace(/\s+/g, '_');
      link.setAttribute('download', `${safeSubject}-quarter-grades.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('💥 Export error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to export grades');
    } finally {
      setExporting(false);
    }
  };

  // Comment change handlers
  const handleNewCommentChange = useCallback((field, value) => {
    setNewComment(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEditCommentChange = useCallback((field, value) => {
    setEditingCommentData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Edit lifecycle
  const startEditComment = useCallback((comment) => {
    setEditingComment(comment);
    setEditingCommentData({ title: comment.title || '', content: comment.content || '' });
  }, []);

  const cancelEditComment = useCallback(() => {
    setEditingComment(null);
    setEditingCommentData({ title: '', content: '' });
    setNewComment({ title: '', content: '' });
  }, []);

  // Edit comment
  const handleEditComment = async () => {
    if (!editingComment || !editingCommentData.content.trim()) return;
    try {
      setSavingComment(true);
      const updatedComment = {
        ...editingComment,
        title: editingCommentData.title || editingComment.title,
        content: editingCommentData.content,
        timestamp: new Date().toISOString(),
      };
      setComments(prev => prev.map(c => c._id === editingComment._id ? updatedComment : c));
      const updatedComments = comments.map(c => c._id === editingComment._id ? updatedComment : c);
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedComments }, token);
      console.log('✅ Comment updated');
      await fetchData(true);
      cancelEditComment();
    } catch (err) {
      console.error('💥 Edit comment error:', err);
      await fetchData(true);
      setError(err.response?.data?.message || err.message || 'Failed to edit comment');
    } finally {
      setSavingComment(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.content.trim()) return;
    const tempId = `temp-${Date.now()}`;
    try {
      setSavingComment(true);
      const newCommentObjForPayload = {
        title: newComment.title || suggestedTitles[0],
        content: newComment.content,
        author: user?.name || 'Teacher',
        timestamp: new Date().toISOString(),
      };
      const newCommentObjLocal = { ...newCommentObjForPayload, _id: tempId };
      setComments(prev => [...prev, newCommentObjLocal]);
      const updatedCommentsForPayload = [...comments, newCommentObjForPayload];
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedCommentsForPayload }, token);
      console.log('✅ Comment added');
      await fetchData(true);
      setNewComment({ title: '', content: '' });
    } catch (err) {
      console.error('💥 Add comment error:', err);
      setComments(prev => prev.filter(c => c._id !== tempId));
      await fetchData(true);
      setError(err.response?.data?.message || err.message || 'Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      setComments(prev => prev.filter(c => c._id !== commentId));
      const updatedComments = comments.filter(c => c._id !== commentId);
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedComments }, token);
      console.log('✅ Comment deleted');
      await fetchData(true);
    } catch (err) {
      console.error('💥 Delete comment error:', err);
      await fetchData(true);
      setError(err.response?.data?.message || err.message || 'Failed to delete comment');
    }
  };

  const currentAvg = studentData?.finalGrade || calculatedFinal || 0;

  // Prediction value for right panel
  const displayPredictValue = useMemo(() => {
    if (predictionMode === 'current' && mostRecentQuarter) {
      return mostRecentQuarter.value;
    }
    return predictValue;
  }, [predictionMode, mostRecentQuarter, predictValue]);

  // Chart title
  const getChartTitle = (mode) => {
    switch (mode) {
      case 'current':
        return actualQuarters.length > 0 ? `Current Year: Actual Grades (Green) & Gap Predictions (Blue)` : 'No Actual Grades Yet';
      case 'sem2':
        return 'Q3/Q4 Projections: Actual (Green) vs. Predicted (Blue)';
      case 'nextYear':
        return 'Full Year Actuals & Next Year Predictions: Green vs. Blue';
      default:
        return 'Grade Progress: Actual (Green) vs. Predicted (Blue)';
    }
  };
  const chartTitle = getChartTitle(predictionMode);

  // Quarter inputs renderer
  const getQuarterInputs = () => {
    const quarter = QUARTERS[selectedQuarter];
    if (!quarter) return null;
    const { label, cs, exam } = quarter;
    const totalVar = { q1: q1_total, q2: q2_total, q3: q3_total, q4: q4_total }[selectedQuarter];
    return (
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label} CS</label>
          <input
            type="number"
            value={gradeInputs[cs]}
            onChange={(e) => handleGradeChange(cs, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            min="0" max="100"
            placeholder="CS"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label} Exam</label>
          <input
            type="number"
            value={gradeInputs[exam]}
            onChange={(e) => handleGradeChange(exam, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            min="0" max="100"
            placeholder="Exam"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label} Total</label>
          <input
            type="number"
            value={totalVar != null ? totalVar.toFixed(1) : ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-xl"
            placeholder="Auto (Avg)"
          />
        </div>
      </div>
    );
  };

  // Pagination Controls Component
  const CommentPagination = () => (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
      <div className="text-sm text-gray-500">
        Showing {((currentCommentPage - 1) * commentsPerPage) + 1} to {Math.min(currentCommentPage * commentsPerPage, comments.length)} of {comments.length} comments
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentCommentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentCommentPage === 1}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalCommentPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentCommentPage(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                currentCommentPage === page
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentCommentPage(prev => Math.min(prev + 1, totalCommentPages))}
          disabled={currentCommentPage === totalCommentPages}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
        >
          Next
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm">
          <p className="text-center text-sm text-gray-500">Loading student analytics…</p>
        </div>
      </div>
    );
  }

  if (error && !studentData) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-xl text-red-500 mr-2" />
            <h2 className="text-xl font-semibold text-red-800">Oops! Something went wrong</h2>
          </div>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => navigate(backUrl)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      {/* Header */}
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
                <FontAwesomeIcon icon={faUserGraduate} /> Subject Analytics
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {studentData?.student?.name || 'Student'} - {subjectInfo?.name || 'Subject'}
                </h1>
                <p className="text-sm text-white/85">
                  Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.academicYear || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(backUrl)}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back
            </button>
          </div>

          {error && studentData && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold bg-sky-100 text-sky-600">
            <FontAwesomeIcon icon={faChartLine} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Average</p>
            <p className="text-2xl font-semibold text-gray-900">{currentAvg.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Across all quarters</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faBullseye} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {predictionMode === 'current' ? 'Recent Grade' : 'Predicted'}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {!isNaN(displayPredictValue) ? displayPredictValue.toFixed(1) : 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              {predictionMode === 'current' ? 'Most recent actual' : 'Forecasted average'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold bg-emerald-100 text-emerald-600">
            <FontAwesomeIcon icon={faBookOpen} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quarters Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{actualQuarters.length}</p>
            <p className="text-xs text-gray-500">Out of 4 total</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold bg-rose-100 text-rose-600">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attendance Rate</p>
            <p className="text-2xl font-semibold text-gray-900">{attendanceRate}%</p>
            <p className="text-xs text-gray-500">{presentCount}/{totalSessions} sessions</p>
          </div>
        </div>
      </section>

      {/* Analytics Grid */}
      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Grade Progress Across Semesters</h2>
                <p className="text-sm text-gray-500">Track actual vs predicted performance over time</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <Line 
                options={{ 
                  ...CHART_BASE_OPTIONS, 
                  plugins: { 
                    ...CHART_BASE_OPTIONS.plugins, 
                    title: { display: true, text: chartTitle },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
                      }
                    }
                  } 
                }} 
                data={chartData || { labels: [], datasets: [] }} 
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Grade Prediction</h3>
                <select
                  value={predictionMode}
                  onChange={(e) => setPredictionMode(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {availablePredictionModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">
                    {predictionMode === 'current' ? 'Current Average (Actual Grades Only)' : 'Current Average'}
                  </p>
                  <p className="text-2xl font-bold text-sky-600">{currentAvg.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {predictionMode === 'current' 
                      ? 'Most Recent Actual Grade' 
                      : predictionMode === 'sem2' 
                        ? 'Q3/Q4 Predicted Average' 
                        : 'Predicted Average'
                    }
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {!isNaN(displayPredictValue) ? displayPredictValue.toFixed(1) : 'N/A'}
                  </p>
                </div>
                {predictionMode !== 'current' && (
                  <div>
                    <p className="text-sm text-gray-500">Risk Level</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      riskLevel.includes('Low') ? 'bg-emerald-100 text-emerald-800' : 
                      riskLevel.includes('Medium') ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {riskLevel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {user?.role !== 'student' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowGradeModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm"
                >
                  <FontAwesomeIcon icon={faEdit} /> Update Grades
                </button>
                <button
                  onClick={handleExportGrades}
                  disabled={exporting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  <FontAwesomeIcon icon={faFileExport} /> Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Past Comments */}
      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Past Comments</h2>
            <p className="text-sm text-gray-500">View and manage previous teacher comments</p>
          </div>
          {comments.length > 5 && (
            <select
              value={commentsPerPage}
              onChange={(e) => setCommentsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          )}
        </div>
        
        <div className="space-y-4">
          {paginatedComments.length > 0 ? (
            paginatedComments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                isEditing={editingComment?._id === comment._id}
                onEdit={startEditComment}
                onDelete={handleDeleteComment}
                onSave={handleEditComment}
                onCancel={cancelEditComment}
                editingData={editingCommentData}
                onEditChange={handleEditCommentChange}
                saving={savingComment}
                userRole={user?.role}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
              No comments available yet.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {comments.length > commentsPerPage && <CommentPagination />}
      </section>

      {/* Add Comment Form */}
      {user?.role !== 'student' && (
        <AddCommentForm
          newComment={newComment}
          onChange={handleNewCommentChange}
          onAdd={handleAddComment}
          suggestedTitle={suggestedTitles[0]}
          editingComment={editingComment}
          saving={savingComment}
        />
      )}

      {/* Grade Modal */}
      {user?.role !== 'student' && (
        <GradeModal
          isOpen={showGradeModal}
          onClose={() => setShowGradeModal(false)}
          selectedQuarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          quarterInputs={getQuarterInputs()}
          calculatedFinal={calculatedFinal}
          predictedFinal={predictedFinal}
          onSave={handleSaveGrades}
          saving={savingGrades}
        />
      )}
    </div>
  );
};

// Sub-component: Individual Comment Item
const CommentItem = ({ comment, isEditing, onEdit, onDelete, onSave, onCancel, editingData, onEditChange, saving, userRole }) => (
  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 relative group">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editingData.title}
              onChange={(e) => onEditChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Title"
            />
            <textarea
              value={editingData.content}
              onChange={(e) => onEditChange('content', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
              placeholder="Content"
            />
          </div>
        ) : (
          <>
            <h4 className="font-medium text-gray-800">{comment.title}</h4>
            <p className="text-gray-600 mt-1">{comment.content}</p>
            <p className="text-xs text-gray-500 mt-2">
              By {comment.author} on {new Date(comment.timestamp).toLocaleDateString()}
            </p>
          </>
        )}
      </div>
      {userRole !== 'student' && (
        <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
          {isEditing ? (
            <>
              <button onClick={onSave} disabled={saving} className="p-1 text-emerald-500 hover:text-emerald-700 disabled:opacity-50">
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button onClick={onCancel} disabled={saving} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(comment)} className="p-1 text-gray-500 hover:text-gray-700">
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button onClick={() => onDelete(comment._id)} className="p-1 text-red-500 hover:text-red-700 ml-2">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  </div>
);

// Sub-component: Add New Comment Form
const AddCommentForm = ({ newComment, onChange, onAdd, suggestedTitle, editingComment, saving }) => (
  <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Comment</h2>
    {editingComment && (
      <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-2xl text-amber-800 text-sm">
        Editing comment above—finish or cancel there first.
      </div>
    )}
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title:</label>
        <input
          type="text"
          value={newComment.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={!!editingComment}
          className={`w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
            editingComment ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder={`Suggested: ${suggestedTitle || 'General Comment'}`}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Content:</label>
        <textarea
          value={newComment.content}
          onChange={(e) => onChange('content', e.target.value)}
          rows={4}
          disabled={!!editingComment}
          className={`w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white ${
            editingComment ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Write your comment here..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          disabled={saving || !newComment.content.trim() || !!editingComment}
          className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Post Comment'
          )}
        </button>
      </div>
    </div>
  </section>
);

// Sub-component: Grade Input Modal
const GradeModal = ({ isOpen, onClose, selectedQuarter, onQuarterChange, quarterInputs, calculatedFinal, predictedFinal, onSave, saving }) => {
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Enter Quarter Grades</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Quarter:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => onQuarterChange(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="q1">Quarter 1</option>
            <option value="q2">Quarter 2</option>
            <option value="q3">Quarter 3</option>
            <option value="q4">Quarter 4</option>
          </select>
        </div>
        <div className="mb-4">{quarterInputs}</div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Final Grade Preview (Avg of Totals)</label>
          <input
            type="number"
            value={!isNaN(calculatedFinal) ? calculatedFinal.toFixed(1) : 'N/A'}
            readOnly
            className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-gray-100 rounded-xl"
          />
          {!isNaN(predictedFinal) && (
            <p className="text-sm text-gray-500 mt-1">Predicted Final: {predictedFinal.toFixed(1)}</p>
          )}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Grades'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubjectAnalytics;