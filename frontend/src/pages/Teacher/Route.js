// src/pages/Teacher/Route.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import TeacherLayout from "./layout/TeacherLayout";
import Dashboard from "./sections/Dashboard";
import SubjectManagement from "./sections/SubjectManagement";
import StudentManagement from "./sections/StudentManagement"; // Kept for now, evaluate if needed later
import Notifications from "./sections/Notifications";
import Analytics from "./sections/Analytics";
import SubjectOverview from "./sections/SubjectOverview"; // NEW: Import the combined component
import StudentAnalytics from "./sections/StudentAnalytics";
import StudentAttendanceHistory from "./sections/StudentAttendanceHistory";
import Profile from "./sections/Profile";

function TeacherRoutes() {
  return (
    <TeacherLayout>
      <Routes>
        <Route index element={<Dashboard />} /> {/* Default route for /teacher */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="subjects" element={<SubjectManagement />} />

        {/* --- CONSOLIDATED ROUTE --- */}
        {/* This route now handles Students, Grades, and Attendance for a subject */}
        <Route path="subjects/:id" element={<SubjectOverview />} />
        {/* The :id parameter will be available via useParams() in SubjectOverview */}

        {/* --- Specific Student Views (remain unchanged) --- */}
        {/* Route for individual student's grade analytics within a subject */}
        <Route path="subjects/:id/grades/:studentId/analytics" element={<StudentAnalytics />} />
        {/* Route for individual student's attendance history within a subject */}
        <Route path="subjects/:id/attendance/students/:studentId" element={<StudentAttendanceHistory />} />

        {/* --- Other Teacher Routes --- */}
        {/* Consider if this top-level student management is still needed or if subject-based is sufficient */}
        <Route path="students" element={<StudentManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />

         {/* Old separate routes are now handled by SubjectOverview - REMOVE OR COMMENT OUT */}
         {/*
         <Route path="subjects/:id/students" element={<SubjectStudents />} /> // Handled by /subjects/:id
         <Route path="subjects/:id/grades" element={<SubjectGrades />} />     // Handled by /subjects/:id
         <Route path="subjects/:id/attendance" element={<SubjectAttendance />} /> // Handled by /subjects/:id
         */}

         {/* Fallback for teacher section */}
         <Route path="*" element={<div className="p-6 text-center text-gray-600">Page not found within Teacher section.</div>} />

      </Routes>
    </TeacherLayout>
  );
}

export default TeacherRoutes;