import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Topbar />
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;