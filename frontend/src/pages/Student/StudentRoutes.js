// routes/StudentRoutes.jsx (Updated: Added routes for subjects list and subject analytics)
import React from "react";
import { Routes, Route } from "react-router-dom";
import StudentLayout from "./layout/StudentLayout";
import Dashboard from "./sections/Dashboard";
import StudentSubjectList from "./sections/StudentSubjectList";
import StudentSubjectAnalytics from "./sections/StudentSubjectAnalytics";

function StudentRoutes() {
  return (
    <StudentLayout>
      <Routes path="/student/*" element={<StudentRoutes />}>
        <Route index element={<Dashboard />} />
        <Route path="/subjects" element={<StudentSubjectList />} />
        <Route path="/subjects/:id/analytics" element={<StudentSubjectAnalytics />} />
        <Route path="*" element={<div className="p-8 text-center">Page not found. <a href="/student">Go home</a></div>} />
      </Routes>
    </StudentLayout>
  );
}

export default StudentRoutes;