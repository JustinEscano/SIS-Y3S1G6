// pages/Teacher/TeacherLayout.js
import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function TeacherLayout({ children }) {
  return (
    <div className="teacher-layout">
      <Sidebar />
      <div className="teacher-main">
        <Topbar />
        <div className="teacher-content">{children}</div>
      </div>
    </div>
  );
}

export default TeacherLayout;
