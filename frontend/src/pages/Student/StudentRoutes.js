// src/pages/Student/StudentRoutes.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import StudentLayout from "./layout/StudentLayout";
import Dashboard from "./sections/Dashboard";
import StudentSubjectList from "./sections/StudentSubjectList";
import StudentSubjectAnalytics from "./sections/StudentSubjectAnalytics";
import GradeProgress from "./sections/GradeProgress"; // NEW Import

function StudentRoutes() {
  return (
    <StudentLayout>
      <Routes> {/* Removed duplicate wrapper */}
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<StudentSubjectList />} />
        {/* Adjusted analytics route for consistency */}
        <Route path="subjects/:id/analytics" element={<StudentSubjectAnalytics />} />
        <Route path="progress" element={<GradeProgress />} /> {/* NEW Route */}
        <Route path="*" element={<div className="p-8 text-center">Page not found. <a href="/student">Go home</a></div>} />
      </Routes>
    </StudentLayout>
  );
}

export default StudentRoutes;