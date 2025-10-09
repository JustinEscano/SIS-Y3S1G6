import React from "react";
import { Routes, Route } from "react-router-dom";
import TeacherLayout from "./layout/TeacherLayout";
import Dashboard from "./sections/Dashboard";
import SubjectManagement from "./sections/SubjectManagement";
import StudentManagement from "./sections/StudentManagement";
import Notifications from "./sections/Notifications";
import Analytics from "./sections/Analytics";

function TeacherRoutes() {
  return (
    <TeacherLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subjects" element={<SubjectManagement />} />
        <Route path="/students" element={<StudentManagement />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </TeacherLayout>
  );
}

export default TeacherRoutes;