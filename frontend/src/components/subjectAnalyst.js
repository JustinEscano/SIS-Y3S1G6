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
import { faSpinner, faArrowLeft, faExclamationTriangle, faEdit, faTrash, faCheck, faTimes, faFileExport } from '@fortawesome/free-solid-svg-icons';

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
import LoadingSpinner from './loadingSpinner'; // Adjusted path

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
    legend: { position: 'top' },
  },
  scales: {
    y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } },
  },
};

// REFACTORED: Renamed function and accept props
const SubjectAnalytics = ({ subjectId, studentId, user, backUrl }) => {
  const navigate = useNavigate();
  const { token } = useAuth(); // Token still comes from context
  
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

  // Initial fetch (depends on props now)
  useEffect(() => {
    if (!subjectId || !studentId || !token) {
      setError('Invalid parameters or authentication missing.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [subjectId, studentId, token]); // REFACTORED: Use props

  const fetchData = useCallback(async (skipLoading = false) => {
    const wasLoading = !skipLoading;
    try {
      if (wasLoading) setLoading(true);
      setError(null);
      
      const [subjectResponse, studentResponse, attRes] = await Promise.all([
        subjectService.getSubject(subjectId, token), // token added for consistency
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
  }, [subjectId, studentId, token]); // REFACTORED: Use props

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
        author: user?.name || 'Teacher', // REFACTORED: Use user prop
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
            placeholder="Auto (Avg)"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading student analytics..." size="lg" color="blue" fullScreen={false} />;
  }

  if (error && !studentData) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md border border-red-200 mx-auto max-w-4xl">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate(backUrl)} // REFACTORED: Use prop
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {studentData?.student?.name || 'Student'} - Analytics for {subjectInfo?.name || 'Subject'}
          </h1>
          <p className="text-lg text-gray-600">
            Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.academicYear || 'N/A'}
          </p>
        </div>
        <button
          onClick={() => navigate(backUrl)} // REFACTORED: Use prop
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back
        </button>
      </div>

      {/* Transient Error Banner */}
      {error && studentData && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Attendance Rate Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Attendance Rate</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${attendanceRate}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {attendanceRate}% ({presentCount}/{totalSessions} sessions)
        </p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8 w-full">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Grade Progress Across Semesters</h3>
          <div className="h-64 w-full">
            <Line 
              options={{ 
                ...CHART_BASE_OPTIONS, 
                plugins: { 
                  ...CHART_BASE_OPTIONS.plugins, 
                  title: { display: true, text: chartTitle } ,
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

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Grade Prediction</h3>
            <select
              value={predictionMode}
              onChange={(e) => setPredictionMode(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <p className="text-2xl font-bold text-blue-600">{currentAvg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {predictionMode === 'current' 
                  ? 'Most Recent Actual Grade' 
                  : predictionMode === 'sem2' 
                    ? 'Q3/Q4 Predicted Average (Blue Line)' 
                    : 'Predicted Average (Blue Line)'
                }
              </p>
              <p className="text-2xl font-bold text-green-600">
                {!isNaN(displayPredictValue) ? displayPredictValue.toFixed(1) : 'N/A'}
              </p>
            </div>
            {predictionMode !== 'current' && (
              <div>
                <p className="text-sm text-gray-500">Risk Level</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  riskLevel.includes('Low') ? 'bg-green-100 text-green-800' : 
                  riskLevel.includes('Medium') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {riskLevel}
                </span>
              </div>
            )}
          </div>
          {/* REFACTORED: Conditional "Edit" button */}
          {user?.role !== 'student' && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowGradeModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-sky-600 transition hover:bg-gray-100"
                >
                  <FontAwesomeIcon icon={faEdit} /> Update grades
                </button>
                <button
                  onClick={handleExportGrades}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faFileExport} /> Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past Comments */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Past Comments</h2>
        <p className="text-gray-600 mb-6">View and manage previous teacher comments.</p>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length > 0 ? (
            comments.map((comment) => (
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
                userRole={user?.role} // REFACTORED: Pass role
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No comments available yet.</p>
          )}
        </div>
      </div>

      {/* REFACTORED: Conditional "Add Comment" form */}
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

      {/* REFACTORED: Conditional "Grade Modal" */}
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
  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editingData.title}
              onChange={(e) => onEditChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Title"
            />
            <textarea
              value={editingData.content}
              onChange={(e) => onEditChange('content', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
      {/* REFACTORED: Conditional actions */}
      {userRole !== 'student' && (
        <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
          {isEditing ? (
            <>
              <button onClick={onSave} disabled={saving} className="p-1 text-green-500 hover:text-green-700 disabled:opacity-50">
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
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Comment</h2>
    {editingComment && (
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 text-sm">
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
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            editingComment ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Write your comment here..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          disabled={saving || !newComment.content.trim() || !!editingComment}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
  </div>
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
        className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Enter Quarter Grades</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Quarter:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => onQuarterChange(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
          />
          {!isNaN(predictedFinal) && (
            <p className="text-sm text-gray-500 mt-1">Predicted Final: {predictedFinal.toFixed(1)}</p>
          )}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
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