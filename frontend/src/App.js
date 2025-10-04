import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/student" element={<h1>Student Dashboard</h1>} />
          <Route path="/teacher" element={<h1>Teacher Dashboard</h1>} />
          <Route path="/admin" element={<h1>Superadmin Dashboard</h1>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
