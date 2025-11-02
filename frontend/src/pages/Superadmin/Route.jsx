// src/pages/Superadmin/Route.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import SuperadminLayout from "./layout/SuperadminLayout";
import Dashboard from "./sections/Dashboard";
import UserManagement from "./sections/UserManagement";
import SubjectManagement from "./sections/SubjectManagement";
import SystemSettings from "./sections/SystemSettings";
import Analytics from "./sections/Analytics";
import Profile from "./sections/Profile";

function SuperadminRoutes() {
  return (
    <SuperadminLayout>
      <Routes>
        <Route index element={<Dashboard />} /> {/* Default route for /superadmin */}
        <Route path="users" element={<UserManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />

        {/* Fallback for superadmin section */}
        <Route path="*" element={<div className="p-6 text-center text-gray-600">Page not found within Superadmin section.</div>} />
      </Routes>
    </SuperadminLayout>
  );
}

export default SuperadminRoutes;
