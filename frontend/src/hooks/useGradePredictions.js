// hooks/useGradePredictions.js
// FULL REFRACTOR: Clear actual (green) vs. predicted (blue) separation.
// - All modes: Dual datasets; blue dashed for preds.
// - 'sem2': Blue only Q3/Q4; separate if Q3/Q4 actuals exist.
// - 'current': Actual avg primary; blue gap-fills only.
// - Clamped 0-100; enhanced tooltips.

import { useMemo } from 'react';

const computeTotal = (cs, exam) => {
  if (cs === '' || exam === '') return null;
  const csNum = Number(cs);
  const examNum = Number(exam);
  if (isNaN(csNum) || isNaN(examNum) || csNum < 0 || csNum > 100 || examNum < 0 || examNum > 100) return null;
  return Math.round(((csNum + examNum) / 2) * 100) / 100;
};

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

export const useGradePredictions = (gradeInputs, predictionMode, dataScope) => {
  const q1_total = useMemo(() => computeTotal(gradeInputs.q1_cs, gradeInputs.q1_exam), [gradeInputs.q1_cs, gradeInputs.q1_exam]);
  const q2_total = useMemo(() => computeTotal(gradeInputs.q2_cs, gradeInputs.q2_exam), [gradeInputs.q2_cs, gradeInputs.q2_exam]);
  const q3_total = useMemo(() => computeTotal(gradeInputs.q3_cs, gradeInputs.q3_exam), [gradeInputs.q3_cs, gradeInputs.q3_exam]);
  const q4_total = useMemo(() => computeTotal(gradeInputs.q4_cs, gradeInputs.q4_exam), [gradeInputs.q4_cs, gradeInputs.q4_exam]);

  // Available quarters with proper x indices
  const availableQuarters = useMemo(() => [
    q1_total !== null ? { x: 1, y: q1_total } : null,
    q2_total !== null ? { x: 2, y: q2_total } : null,
    q3_total !== null ? { x: 3, y: q3_total } : null,
    q4_total !== null ? { x: 4, y: q4_total } : null,
  ].filter(Boolean), [q1_total, q2_total, q3_total, q4_total]);

  const predictValue = useMemo(() => {
    if (predictionMode === 'sem2') {  // Q3/Q4 projection
      const q1Data = availableQuarters.filter(d => d.x <= 2);
      if (q1Data.length === 0) return NaN;
      const q1X = q1Data.map(d => d.x);
      const q1Y = q1Data.map(d => d.y);
      const { slope: q1Slope, intercept: q1Intercept } = linearRegression(q1X, q1Y);
      const predQ3 = Math.max(0, Math.min(100, q1Slope * 3 + q1Intercept));
      const predQ4 = Math.max(0, Math.min(100, q1Slope * 4 + q1Intercept));
      return (predQ3 + predQ4) / 2;
    } else if (predictionMode === 'current') {
      if (availableQuarters.length === 0) return NaN;
      const allX = availableQuarters.map(d => d.x);
      const allY = availableQuarters.map(d => d.y);
      const { slope, intercept } = linearRegression(allX, allY);
      let sum = 0;
      let count = 0;
      for (let x = 1; x <= 4; x++) {
        const actual = availableQuarters.find(d => d.x === x);
        if (actual) {
          sum += actual.y;
          count++;
        } else {
          const pred = Math.max(0, Math.min(100, slope * x + intercept));
          sum += pred;
          count++;
        }
      }
      return sum / count;
    } else {  // 'nextYear'
      if (availableQuarters.length === 0) return NaN;
      const allX = availableQuarters.map(d => d.x);
      const allY = availableQuarters.map(d => d.y);
      const { slope, intercept } = linearRegression(allX, allY);
      let sum = 0;
      for (let x = 5; x <= 8; x++) {
        const val = Math.max(0, Math.min(100, slope * x + intercept));
        sum += val;
      }
      return sum / 4;
    }
  }, [predictionMode, availableQuarters]);

  const predictedFinal = useMemo(() => {
    if (predictionMode === 'sem2') {
      const q1Available = availableQuarters.filter(d => d.x <= 2).map(d => d.y);
      if (q1Available.length === 0) return NaN;
      const q1Avg = q1Available.reduce((a, b) => a + b, 0) / q1Available.length;
      const q2Pred = predictValue;
      if (isNaN(q2Pred)) return NaN;
      return (q1Avg + q2Pred) / 2;
    } else if (predictionMode === 'current') {
      return predictValue;
    } else if (predictionMode === 'nextYear') {
      return predictValue;
    }
    return NaN;
  }, [predictionMode, predictValue, availableQuarters]);

  const chartData = useMemo(() => {
    if (availableQuarters.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Base styles
    const actualStyle = {
      borderColor: 'rgb(34, 197, 94)',  // Green
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      tension: 0.1,
      fill: false,
      pointBackgroundColor: 'rgb(34, 197, 94)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    };
    const predictedStyle = {
      borderColor: 'rgb(59, 130, 246)',  // Blue
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.1,
      fill: false,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      borderDash: [5, 5],  // Dashed for predictions to distinguish
    };

    let labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    let actualData = [q1_total ?? NaN, q2_total ?? NaN, q3_total ?? NaN, q4_total ?? NaN];
    let predictedData = [NaN, NaN, NaN, NaN];  // Default empty

    if (predictionMode === 'sem2') {  // Q3/Q4 preds only
      const q1Data = availableQuarters.filter(d => d.x <= 2);
      const { slope, intercept } = q1Data.length > 0 ? linearRegression(
        q1Data.map(d => d.x), q1Data.map(d => d.y)
      ) : { slope: 0, intercept: 0 };
      predictedData[2] = Math.max(0, Math.min(100, slope * 3 + intercept));  // Q3 pred
      predictedData[3] = Math.max(0, Math.min(100, slope * 4 + intercept));  // Q4 pred
      // If Q3/Q4 actual, actualData shows them (green overrides)
    } else if (predictionMode === 'current') {
      const allX = availableQuarters.map(d => d.x);
      const allY = availableQuarters.map(d => d.y);
      const { slope, intercept } = linearRegression(allX, allY);
      const maxX = Math.max(...allX);
      // Fill gaps with preds (up to Q4)
      for (let x = 1; x <= 4; x++) {
        if (isNaN(actualData[x - 1])) {
          predictedData[x - 1] = Math.max(0, Math.min(100, slope * x + intercept));
        }
      }
    } else {  // 'nextYear'
      labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Next Q1', 'Next Q2', 'Next Q3', 'Next Q4'];
      actualData = [...actualData, NaN, NaN, NaN, NaN];
      const allX = availableQuarters.map(d => d.x);
      const allY = availableQuarters.map(d => d.y);
      const { slope, intercept } = linearRegression(allX, allY);
      for (let x = 5; x <= 8; x++) {
        predictedData.push(Math.max(0, Math.min(100, slope * x + intercept)));
      }
      predictedData = predictedData.slice(0, 8);  // Align to 8 points
    }

    // Only include predicted dataset if it has values
    const datasets = [{ label: 'Actual Grades', data: actualData, ...actualStyle }];
    if (predictedData.some(d => !isNaN(d))) {
      datasets.push({ label: 'Predicted Grades', data: predictedData, ...predictedStyle });
    }

    return { labels, datasets };
  }, [predictionMode, availableQuarters, q1_total, q2_total, q3_total, q4_total]);

  const slope = useMemo(() => {
    if (predictionMode === 'sem2') {
      const q1Data = availableQuarters.filter(d => d.x <= 2);
      if (q1Data.length < 2) return 0;
      const q1X = q1Data.map(d => d.x);
      const q1Y = q1Data.map(d => d.y);
      return linearRegression(q1X, q1Y).slope;
    } else {
      if (availableQuarters.length < 2) return 0;
      const usedX = availableQuarters.map(d => d.x);
      const usedY = availableQuarters.map(d => d.y);
      return linearRegression(usedX, usedY).slope;
    }
  }, [predictionMode, availableQuarters]);

  const calculatedFinal = useMemo(() => {
    const quarters = [q1_total, q2_total, q3_total, q4_total].filter(g => g !== null);
    return quarters.length > 0 ? quarters.reduce((a, b) => a + b, 0) / quarters.length : NaN;
  }, [q1_total, q2_total, q3_total, q4_total]);

  const riskLevel = useMemo(() => {
    if (slope == null || predictValue == null || isNaN(slope) || isNaN(predictValue)) {
      return 'None';
    }

    if (slope > 0 && predictValue >= 75) return 'Low - Steady or improving';
    if (slope < 0 || predictValue < 75) return 'High - Needs intervention';
    
    return 'Medium - Monitor Progress';
  }, [slope, predictValue]);

  const suggestedTitles = useMemo(() => {
    const q1Avg = (q1_total + q2_total) / 2 || 0;
    const q2Avg = (q3_total + q4_total) / 2 || 0;
    const finalAvg = calculatedFinal;

    const titles = [];
    if (q1_total < 75) titles.push('Concerning First Quarter Performance');
    if (q2_total < 75) titles.push('Needs Improvement in Second Quarter');
    if (q3_total < 75) titles.push('Challenges in Third Quarter');
    if (q4_total < 75) titles.push('Regarding Fourth Quarter Results');
    if (q1Avg < 75) titles.push('First Half (Q1 & Q2): Areas for Growth');
    if (q2Avg < 75) titles.push('Second Half (Q3 & Q4): Support Required');
    if (!isNaN(finalAvg) && finalAvg < 75) titles.push('Overall: Intervention Needed');
    if (q1_total >= 90) titles.push('Excellent Start in Q1');
    if (!isNaN(finalAvg) && finalAvg >= 90) titles.push('Outstanding Yearly Achievement');

    return titles.length > 0 ? titles : ['General Feedback'];
  }, [q1_total, q2_total, q3_total, q4_total, calculatedFinal]);

  return {
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
  };
};