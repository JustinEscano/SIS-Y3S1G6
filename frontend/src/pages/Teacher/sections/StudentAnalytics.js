// src/pages/Teacher/sections/StudentAnalytics.js
// REFACTORED: This component now wraps the reusable SubjectAnalytics component
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/authContext';
import SubjectAnalytics from '../../../components/subjectAnalyst'; // REFACTORED: Import new component

const StudentAnalytics = () => {
  const { id: subjectId, studentId } = useParams();
  const { user } = useAuth(); // Get the full user object

  return (
    <SubjectAnalytics
      subjectId={subjectId}
      studentId={studentId}
      user={user} // Pass the user object
      backUrl={`/teacher/subjects/${subjectId}/grades`}
    />
  );
};

export default StudentAnalytics;