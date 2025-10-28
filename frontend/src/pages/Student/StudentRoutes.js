// src/pages/Student/StudentRoutes.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import StudentLayout from "./layout/StudentLayout";
import Dashboard from "./sections/Dashboard";
import StudentSubjectList from "./sections/StudentSubjectList";
import StudentSubjectAnalytics from "./sections/StudentSubjectAnalytics";
import GradeProgress from "./sections/GradeProgress";
import Profile from "./sections/Profile";
import AttendanceOverview from "./sections/AttendanceOverview";

function StudentRoutes() {
  return (
    <StudentLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<StudentSubjectList />} />
        <Route path="subjects/:id/analytics" element={<StudentSubjectAnalytics />} />
        <Route path="progress" element={<GradeProgress />} />
        <Route path="attendance" element={<AttendanceOverview />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<div className="p-8 text-center">Page not found. <a href="/student">Go home</a></div>} />
      </Routes>
    </StudentLayout>
  );
}

export default StudentRoutes;