// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import Login from "./pages/Login/Login";
import TeacherRoutes from "./pages/Teacher/Route"; // ✅ import the Route.js wrapper
import StudentDashboard from "./pages/Student/Dashboard";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/teacher/*" element={<TeacherRoutes />} /> {/* ✅ add /* for nested routes */}
          <Route path="/student" element={<StudentDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
