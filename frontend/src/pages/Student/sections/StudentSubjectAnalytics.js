// src/pages/Student/sections/StudentSubjectAnalytics.js
// REFACTORED: This component now wraps the reusable SubjectAnalytics component
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/authContext';
import SubjectAnalytics from '../../../components/subjectAnalyst'; // REFACTORED: Import new component

const StudentSubjectAnalytics = () => {
  const { id: subjectId } = useParams(); // Get subjectId from URL
  const { user } = useAuth(); // Get the full user object (contains id, name, role)

  // A student can ONLY view their own analytics.
  // We pass user.id as the studentId prop.
  return (
    <SubjectAnalytics
      subjectId={subjectId}
      studentId={user.id} 
      user={user} // Pass the user object
      backUrl={`/student/subjects`} // REFACTORED: Fixed back URL to point to the list
    />
  );
};

export default StudentSubjectAnalytics;