// sections/StudentAnalytics.jsx (Full Refactor: Improved structure, error handling, sync, and UX; aligned with Grade model)
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faExclamationTriangle, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
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
import gradeService from '../../../services/gradeService'; // Adjust path as needed
import subjectService from '../../../services/subjectService'; // For subject info
import { useAuth } from '../../../context/authContext'; // Assume auth context for token/user

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StudentAnalytics = () => {
  const { id: subjectId, studentId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth(); // token and user.name for author
  const [studentData, setStudentData] = useState(null); // Full student/grades data
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingGrades, setSavingGrades] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [selectedSem, setSelectedSem] = useState('sem1'); // 'sem1' or 'sem2' for inputs
  const [predictionMode, setPredictionMode] = useState('current'); // 'current', 'sem2' or 'nextYear' for predictions
  const [dataScope, setDataScope] = useState('q1q2'); // 'q1', 'q1q2', 'q1q2q3', 'q1q2q3q4' for nextYear basis
  const [comments, setComments] = useState([]); // Comments array from DB
  const [editingComment, setEditingComment] = useState(null); // For edit mode
  const [gradeInputs, setGradeInputs] = useState({ q1: '', q2: '', q3: '', q4: '' }); // Local state for grade inputs

  // New comment form state
  const [newComment, setNewComment] = useState({ title: '', content: '' });

  // Updated linear regression function to handle n < 2
  const linearRegression = (x, y) => {
    if (x.length !== y.length) return { slope: 0, intercept: 0 };

    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    if (n === 1) return { slope: 0, intercept: y[0] };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  // Predict based on mode using linear regression extrapolation
  const predictValue = () => {
    const q1 = Number(gradeInputs.q1) || null;
    const q2 = Number(gradeInputs.q2) || null;
    const q3 = Number(gradeInputs.q3) || null;
    const q4 = Number(gradeInputs.q4) || null;

    if (predictionMode === 'sem2') {
      // For Sem2: Always predict Q3/Q4 from available Sem1 data (Q1/Q2), ignore any Q3/Q4 inputs
      const sem1Y = [q1, q2].filter(v => v !== null);
      if (sem1Y.length === 0) return NaN;
      const sem1X = sem1Y.map((_, i) => i + 1);
      const { slope: semSlope, intercept: semIntercept } = linearRegression(sem1X, sem1Y);
      const predQ3 = semSlope * 3 + semIntercept;
      const predQ4 = semSlope * 4 + semIntercept;
      return (predQ3 + predQ4) / 2;
    } else if (predictionMode === 'current') {
      // For Current: Predict missing quarters up to Q4 based on available data, then avg of all (actual + predicted)
      let usedY = [];
      let lastQuarterIndex = 0;
      switch (dataScope) {
        case 'q1':
          usedY = [q1].filter(v => v !== null);
          lastQuarterIndex = 1;
          break;
        case 'q1q2':
          usedY = [q1, q2].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
          break;
        case 'q1q2q3':
          usedY = [q1, q2, q3].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
          break;
        default:
          usedY = [q1, q2, q3, q4].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
      }
      if (usedY.length === 0) return NaN;
      const usedX = usedY.map((_, i) => i + 1);
      const { slope, intercept } = linearRegression(usedX, usedY);
      const allQuarters = [q1, q2, q3, q4].map((q, i) => {
        if (q !== null) return q;
        // Predict missing after last available
        if (i + 1 > lastQuarterIndex) {
          return slope * (i + 1) + intercept;
        }
        return NaN; // Should not happen
      });
      const validAll = allQuarters.filter(v => !isNaN(v));
      return validAll.length > 0 ? validAll.reduce((a, b) => a + b, 0) / validAll.length : NaN;
    } else {
      // Next Year: Use selected data scope for trend, extrapolate to next 4
      let usedY;
      switch (dataScope) {
        case 'q1':
          usedY = [q1].filter(v => v !== null);
          break;
        case 'q1q2':
          usedY = [q1, q2].filter(v => v !== null);
          break;
        case 'q1q2q3':
          usedY = [q1, q2, q3].filter(v => v !== null);
          break;
        default:
          usedY = [q1, q2, q3, q4].filter(v => v !== null);
      }
      if (usedY.length === 0) return NaN;
      const usedX = usedY.map((_, i) => i + 1);
      const { slope, intercept } = linearRegression(usedX, usedY);
      const nextQuarters = [5, 6, 7, 8].map(xi => slope * xi + intercept);
      return nextQuarters.reduce((a, b) => a + b, 0) / nextQuarters.length;
    }
  };

  // Get predicted final grade (if applicable, e.g., for Sem2 mode with Sem1 available)
  const getPredictedFinal = () => {
    const q1 = Number(gradeInputs.q1) || null;
    const q2 = Number(gradeInputs.q2) || null;

    if (predictionMode === 'sem2') {
      const sem1Available = [q1, q2].filter(v => v !== null);
      if (sem1Available.length === 0) return NaN;
      const sem1Avg = sem1Available.reduce((a, b) => a + b, 0) / sem1Available.length;
      const sem2Pred = predictValue();
      if (isNaN(sem2Pred)) return NaN;
      return (sem1Avg + sem2Pred) / 2; // Predicted overall final
    } else if (predictionMode === 'current') {
      return predictValue(); // For current, the prediction is the full year predicted avg
    }
    return NaN; // Not applicable for nextYear
  };

  // Get data for chart based on mode
  const getChartData = () => {
    const q1 = Number(gradeInputs.q1) || null;
    const q2 = Number(gradeInputs.q2) || null;
    const q3 = Number(gradeInputs.q3) || null;
    const q4 = Number(gradeInputs.q4) || null;

    if (predictionMode === 'sem2') {
      // Chart: Q1/Q2 actual (may have nulls) + always predicted Q3/Q4 from Sem1 trend
      const sem1Y = [q1, q2].filter(v => v !== null);
      let predQ3 = NaN, predQ4 = NaN;
      if (sem1Y.length > 0) {
        const sem1X = sem1Y.map((_, i) => i + 1);
        const { slope: semSlope, intercept: semIntercept } = linearRegression(sem1X, sem1Y);
        predQ3 = semSlope * 3 + semIntercept;
        predQ4 = semSlope * 4 + semIntercept;
      }
      return {
        labels: ['Q1 (Sem 1)', 'Q2 (Sem 1)', 'Q3 (Sem 2)', 'Q4 (Sem 2)'],
        datasets: [{
          label: 'Grade Progress',
          data: [q1, q2, predQ3, predQ4],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.1,
          fill: false,
        }]
      };
    } else if (predictionMode === 'current') {
      // Current: Show actual up to available, predict missing up to Q4 based on dataScope
      let usedY = [];
      let lastQuarterIndex = 0;
      let predData = [NaN, NaN, NaN, NaN];
      switch (dataScope) {
        case 'q1':
          usedY = [q1].filter(v => v !== null);
          lastQuarterIndex = 1;
          predData[0] = q1;
          break;
        case 'q1q2':
          usedY = [q1, q2].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
          predData[0] = q1;
          predData[1] = q2;
          break;
        case 'q1q2q3':
          usedY = [q1, q2, q3].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
          predData[0] = q1;
          predData[1] = q2;
          predData[2] = q3;
          break;
        default:
          usedY = [q1, q2, q3, q4].filter(v => v !== null);
          lastQuarterIndex = usedY.length;
          predData = [q1, q2, q3, q4];
      }
      if (usedY.length > 0 && lastQuarterIndex < 4) {
        const usedX = usedY.map((_, i) => i + 1);
        const { slope, intercept } = linearRegression(usedX, usedY);
        for (let i = lastQuarterIndex; i < 4; i++) {
          predData[i] = slope * (i + 1) + intercept;
        }
      }
      const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
      return {
        labels,
        datasets: [{
          label: 'Grade Progress',
          data: predData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.1,
          fill: false,
        }]
      };
    } else {
      // Next Year: All actual (with nulls) + 4 predicted based on selected scope
      let usedY;
      switch (dataScope) {
        case 'q1':
          usedY = [q1].filter(v => v !== null);
          break;
        case 'q1q2':
          usedY = [q1, q2].filter(v => v !== null);
          break;
        case 'q1q2q3':
          usedY = [q1, q2, q3].filter(v => v !== null);
          break;
        default:
          usedY = [q1, q2, q3, q4].filter(v => v !== null);
      }
      let predQ5 = NaN, predQ6 = NaN, predQ7 = NaN, predQ8 = NaN;
      if (usedY.length > 0) {
        const usedX = usedY.map((_, i) => i + 1);
        const { slope, intercept } = linearRegression(usedX, usedY);
        predQ5 = slope * 5 + intercept;
        predQ6 = slope * 6 + intercept;
        predQ7 = slope * 7 + intercept;
        predQ8 = slope * 8 + intercept;
      }
      const actualData = [q1, q2, q3, q4];
      return {
        labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Pred Q5', 'Pred Q6', 'Pred Q7', 'Pred Q8'],
        datasets: [{
          label: 'Grade Progress',
          data: [...actualData, predQ5, predQ6, predQ7, predQ8],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.1,
          fill: false,
        }]
      };
    }
  };

  // Compute risk level based on slope and prediction
  const getRiskLevel = (slope, predicted) => {
    if (isNaN(slope) || isNaN(predicted)) return 'Medium - Monitor Progress';
    if (slope > 0 && predicted >= 75) return 'Low - Steady or improving';
    if (slope < 0 || predicted < 75) return 'High - Needs intervention';
    return 'Medium - Monitor Progress';
  };

  useEffect(() => {
    if (!subjectId || !studentId || !token) {
      setError('Invalid parameters or authentication missing.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [subjectId, studentId, token]);

  // Set default dataScope based on available grades
  useEffect(() => {
    const q1 = Number(gradeInputs.q1) || null;
    const q2 = Number(gradeInputs.q2) || null;
    const q3 = Number(gradeInputs.q3) || null;
    const q4 = Number(gradeInputs.q4) || null;

    if (q4 !== null) {
      setDataScope('q1q2q3q4');
    } else if (q3 !== null) {
      setDataScope('q1q2q3');
    } else if (q2 !== null) {
      setDataScope('q1q2');
    } else if (q1 !== null) {
      setDataScope('q1');
    } else {
      setDataScope('q1q2'); // Default even if empty
    }
  }, [gradeInputs]);

  // Centralized data fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch subject
      const subjectResponse = await subjectService.getSubject(subjectId);
      const subjectApiData = subjectResponse.data || subjectResponse;
      const subjectInnerData = subjectApiData.data || subjectApiData;
      setSubjectInfo(subjectInnerData.subject || subjectInnerData || null);

      // Fetch student data
      const studentResponse = await gradeService.getStudentSubjectGrades(subjectId, studentId, token);
      const apiData = studentResponse.data || studentResponse;
      setStudentData(apiData);
      setComments(apiData.comments || []); // Sync comments array
      // Sync grade inputs from fetched data
      setGradeInputs({
        q1: apiData.currentGrades?.quarterGrades?.q1?.toString() || '',
        q2: apiData.currentGrades?.quarterGrades?.q2?.toString() || '',
        q3: apiData.currentGrades?.quarterGrades?.q3?.toString() || '',
        q4: apiData.currentGrades?.quarterGrades?.q4?.toString() || ''
      });
    } catch (err) {
      console.error('💥 Fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [subjectId, studentId, token]);

  // Live final grade calculation (avg of non-null quarters) - for UI preview
  const calculatedFinal = (() => {
    const quarters = Object.values(gradeInputs).filter(g => g !== '').map(Number);
    return quarters.length > 0 ? quarters.reduce((a, b) => a + b, 0) / quarters.length : NaN;
  })();

  // Suggested titles based on grades
  const getSuggestedTitles = useCallback(() => {
    const qGrades = {
      q1: Number(gradeInputs.q1) || 0,
      q2: Number(gradeInputs.q2) || 0,
      q3: Number(gradeInputs.q3) || 0,
      q4: Number(gradeInputs.q4) || 0
    };
    const sem1Avg = (qGrades.q1 + qGrades.q2) / 2;
    const sem2Avg = (qGrades.q3 + qGrades.q4) / 2;
    const finalAvg = calculatedFinal;

    const titles = [];
    if (qGrades.q1 < 75) titles.push('Concerning First Quarter Performance');
    if (qGrades.q2 < 75) titles.push('Needs Improvement in Second Quarter');
    if (qGrades.q3 < 75) titles.push('Challenges in Third Quarter');
    if (qGrades.q4 < 75) titles.push('Regarding Fourth Quarter Results');
    if (sem1Avg < 75) titles.push('Semester 1: Areas for Growth');
    if (sem2Avg < 75) titles.push('Semester 2: Support Required');
    if (!isNaN(finalAvg) && finalAvg < 75) titles.push('Overall: Intervention Needed');
    if (qGrades.q1 >= 90) titles.push('Excellent Start in Q1');
    if (!isNaN(finalAvg) && finalAvg >= 90) titles.push('Outstanding Yearly Achievement');

    return titles.length > 0 ? titles : ['General Feedback'];
  }, [gradeInputs, calculatedFinal]);

  // Handle grade input changes (local state update)
  const handleGradeChange = useCallback((quarter, value) => {
    if (value === '' || (!isNaN(value) && Number(value) >= 0 && Number(value) <= 100)) {
      setGradeInputs(prev => ({ ...prev, [quarter]: value }));
    }
  }, []);

  // Save grades - send only quarters and computed sem/finals to match backend logic
  const handleSaveGrades = async () => {
    try {
      setSavingGrades(true);
      const q1 = parseFloat(gradeInputs.q1) || null;
      const q2 = parseFloat(gradeInputs.q2) || null;
      const q3 = parseFloat(gradeInputs.q3) || null;
      const q4 = parseFloat(gradeInputs.q4) || null;

      let sem1 = null;
      if (q1 !== null && q2 !== null) {
        sem1 = Math.round(((q1 + q2) / 2) * 100) / 100;
      }
      let sem2 = null;
      if (q3 !== null && q4 !== null) {
        sem2 = Math.round(((q3 + q4) / 2) * 100) / 100;
      }
      let finalGrade = null;
      if (sem1 !== null && sem2 !== null) {
        finalGrade = Math.round(((sem1 + sem2) / 2) * 100) / 100;
      }

      const gradeData = {
        quarterGrades: { q1, q2, q3, q4 },
        semesterGrades: { sem1, sem2 },
        finalGrade
        // Backend pre-save hook will compute letterGrade and remarks
      };
      await gradeService.updateStudentGrade(subjectId, studentId, gradeData, token);
      console.log('✅ Grades saved');
      await fetchData(); // Refetch to sync UI with DB (includes hook calcs)
    } catch (err) {
      console.error('💥 Save grades error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save grades');
    } finally {
      setSavingGrades(false);
    }
  };

  // Comment handlers
  const handleNewCommentChange = (field, value) => {
    setNewComment(prev => ({ ...prev, [field]: value }));
  };

  const handleAddComment = async () => {
    if (!newComment.content.trim()) return;
    try {
      setSavingComment(true);
      const newCommentObj = {
        title: newComment.title || getSuggestedTitles()[0],
        content: newComment.content,
        author: user?.name || 'Teacher',
        timestamp: new Date().toISOString()
        // _id will be generated by backend
      };
      const updatedComments = [...comments, newCommentObj];
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedComments }, token);
      console.log('✅ Comment added');
      setNewComment({ title: '', content: '' });
      await fetchData(); // Refetch comments
    } catch (err) {
      console.error('💥 Add comment error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  const startEditComment = (comment) => {
    setEditingComment(comment);
    setNewComment({ title: comment.title, content: comment.content });
  };

  const handleEditComment = async () => {
    if (!editingComment || !newComment.content.trim()) return;
    try {
      setSavingComment(true);
      // Backend: Update specific comment in array
      const updatedComments = comments.map(c =>
        c._id === editingComment._id
          ? { ...c, title: newComment.title, content: newComment.content, timestamp: new Date().toISOString() }
          : c
      );
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedComments }, token); // Overwrite array
      console.log('✅ Comment updated');
      setEditingComment(null);
      setNewComment({ title: '', content: '' });
      await fetchData();
    } catch (err) {
      console.error('💥 Edit comment error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to edit comment');
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const updatedComments = comments.filter(c => c._id !== commentId);
      await gradeService.updateStudentGrade(subjectId, studentId, { comments: updatedComments }, token);
      console.log('✅ Comment deleted');
      await fetchData();
    } catch (err) {
      console.error('💥 Delete comment error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete comment');
    }
  };

  const chartData = getChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { 
        display: true, 
        text: predictionMode === 'current' ? 'Current Year Progress & Remaining Predictions' : 
              predictionMode === 'sem2' ? 'Sem1 Progress & Sem2 Prediction' : 'Full Year Progress & Next Year Prediction' 
      },
    },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } },
    },
  };

  // Slope for risk (Sem1 for sem2 mode, selected scope for nextYear, available for current)
  const getSlopeForRisk = () => {
    const q1 = Number(gradeInputs.q1) || null;
    const q2 = Number(gradeInputs.q2) || null;
    const q3 = Number(gradeInputs.q3) || null;
    const q4 = Number(gradeInputs.q4) || null;

    if (predictionMode === 'sem2') {
      const sem1Y = [q1, q2].filter(v => v !== null);
      if (sem1Y.length === 0) return 0;
      const sem1X = sem1Y.map((_, i) => i + 1);
      const { slope } = linearRegression(sem1X, sem1Y);
      return slope;
    } else {
      // Use selected dataScope for current and nextYear
      let usedY;
      switch (dataScope) {
        case 'q1':
          usedY = [q1].filter(v => v !== null);
          break;
        case 'q1q2':
          usedY = [q1, q2].filter(v => v !== null);
          break;
        case 'q1q2q3':
          usedY = [q1, q2, q3].filter(v => v !== null);
          break;
        default:
          usedY = [q1, q2, q3, q4].filter(v => v !== null);
      }
      if (usedY.length < 2) return 0;
      const usedX = usedY.map((_, i) => i + 1);
      const { slope } = linearRegression(usedX, usedY);
      return slope;
    }
  };

  const predictionValue = predictValue();
  const slope = getSlopeForRisk();
  const riskLevel = getRiskLevel(slope, predictionValue);
  const currentAvg = studentData?.finalGrade || calculatedFinal || 88.6;
  const predictedFinal = getPredictedFinal();

  // Quarter inputs renderer
  const getQuarterInputs = () => {
    if (selectedSem === 'sem1') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Q1:</label>
            <input
              type="number"
              value={gradeInputs.q1}
              onChange={(e) => handleGradeChange('q1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0" max="100"
              placeholder="Enter Q1 grade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Q2:</label>
            <input
              type="number"
              value={gradeInputs.q2}
              onChange={(e) => handleGradeChange('q2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0" max="100"
              placeholder="Enter Q2 grade"
            />
          </div>
        </>
      );
    } else {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Q3:</label>
            <input
              type="number"
              value={gradeInputs.q3}
              onChange={(e) => handleGradeChange('q3', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0" max="100"
              placeholder="Enter Q3 grade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Q4:</label>
            <input
              type="number"
              value={gradeInputs.q4}
              onChange={(e) => handleGradeChange('q4', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0" max="100"
              placeholder="Enter Q4 grade"
            />
          </div>
        </>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500 mr-2" />
        <span className="text-lg">Loading student analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md border border-red-200 mx-auto max-w-4xl">
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong</h2>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
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
            Grade {subjectInfo?.gradeLevel || 'N/A'} - {subjectInfo?.schoolYear || 'N/A'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/teacher/subjects/${subjectId}/grades`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Grades
        </button>
      </div>

      {/* Error Banner (if save failed) */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Grade Input Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Enter Quarter Grades</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Semester:</label>
          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sem1">Semester 1 (Q1 & Q2)</option>
            <option value="sem2">Semester 2 (Q3 & Q4)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {getQuarterInputs()}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Final Grade Preview (Avg of Quarters)</label>
          <input
            type="number"
            value={!isNaN(calculatedFinal) ? calculatedFinal.toFixed(1) : 'N/A'}
            readOnly
            className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
          />
          {!isNaN(predictedFinal) && (
            <p className="text-sm text-gray-500 mt-1">
              {predictionMode === 'current' ? 'Predicted Year Final' : 
               predictionMode === 'sem2' ? 'Predicted Final (w/ Sem2)' : 'N/A'}
              : {predictedFinal.toFixed(1)}
            </p>
          )}
        </div>
        <button
          onClick={handleSaveGrades}
          disabled={savingGrades}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {savingGrades ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Grades (Updates Final Overview)'
          )}
        </button>
      </div>

      {/* Grades Graph and Predictions */}
      <div className="grid grid-cols-3 gap-6 mb-8 w-full">
        {/* Graph (2/3 width) */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Grade Progress Across Semesters</h3>
          <div className="h-64 w-full">
            <Line options={chartOptions} data={chartData} />
          </div>
        </div>

        {/* Predictions (1/3 width) */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Grade Prediction</h3>
            <select
              value={predictionMode}
              onChange={(e) => setPredictionMode(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="current">Current Year</option>
              <option value="sem2">2nd Semester</option>
              <option value="nextYear">Next Academic Year</option>
            </select>
          </div>
          {predictionMode === 'nextYear' && (
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Based on data up to:</label>
              <select
                value={dataScope}
                onChange={(e) => setDataScope(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="q1">Q1 Only</option>
                <option value="q1q2">Q1-Q2</option>
                <option value="q1q2q3">Q1-Q3</option>
                <option value="q1q2q3q4">Q1-Q4</option>
              </select>
            </div>
          )}
          <div className="space-y-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Current Average</p>
              <p className="text-2xl font-bold text-blue-600">{currentAvg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {predictionMode === 'current' ? 'Current Year Prediction (w/ Remaining)' :
                 predictionMode === 'sem2' ? '2nd Sem Prediction (Linear Trend)' : 'Next Year Prediction (Linear Trend)'}
              </p>
              <p className="text-2xl font-bold text-green-600">{!isNaN(predictionValue) ? predictionValue.toFixed(1) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risk Level</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                riskLevel.includes('Low') ? 'bg-green-100 text-green-800' : 
                riskLevel.includes('Medium') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {riskLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Past Comments Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Past Comments</h2>
        <p className="text-gray-600 mb-6">View and manage previous teacher comments.</p>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{comment.title}</h4>
                    <p className="text-gray-600 mt-1">{comment.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      By {comment.author} on {new Date(comment.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => startEditComment(comment)}
                    className="ml-4 p-1 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No comments available yet. Add one below!</p>
          )}
        </div>
      </div>

      {/* Add/Edit Comment Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {editingComment ? 'Edit Comment' : 'Add New Comment'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title:</label>
            <input
              type="text"
              value={newComment.title || ''}
              onChange={(e) => handleNewCommentChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Suggested: ${getSuggestedTitles()[0]}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content:</label>
            <textarea
              value={newComment.content}
              onChange={(e) => handleNewCommentChange('content', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Write your comment here..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setNewComment({ title: '', content: '' });
                setEditingComment(null);
              }}
              disabled={savingComment}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={editingComment ? handleEditComment : handleAddComment}
              disabled={savingComment || !newComment.content.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {savingComment ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : editingComment ? (
                'Update Comment'
              ) : (
                'Post Comment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;