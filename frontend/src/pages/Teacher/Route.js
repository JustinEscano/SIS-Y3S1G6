// routes/TeacherRoutes.jsx (Updated: Nested StudentAnalytics under grades for clearer hierarchy: subjects/:id/grades/:studentId/analytics)
import React from "react";
import { Routes, Route } from "react-router-dom";
import TeacherLayout from "./layout/TeacherLayout";
import Dashboard from "./sections/Dashboard";
import SubjectManagement from "./sections/SubjectManagement";
import StudentManagement from "./sections/StudentManagement";
import Notifications from "./sections/Notifications";
import Analytics from "./sections/Analytics";
import SubjectStudents from "./sections/SubjectStudents";
import SubjectGrades from "./sections/SubjectGrades";
import StudentAnalytics from "./sections/StudentAnalytics"; // New import

function TeacherRoutes() {
  return (
    <TeacherLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="subjects/:id" element={<SubjectStudents />} />
        <Route path="subjects/:id/grades" element={<SubjectGrades />} />
        <Route path="subjects/:id/grades/:studentId/analytics" element={<StudentAnalytics />} /> {/* Nested under grades */}
        <Route path="students" element={<StudentManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Analytics />} />
      </Routes>
    </TeacherLayout>
  );
}

export default TeacherRoutes;