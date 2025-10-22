// components/Sidebar.jsx (Hybrid Version)
import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUserGraduate,
  faBook,
  faChartLine,
  faBell,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import '../styles/Sidebar.css'; // Import hybrid CSS

function Sidebar() {
  return (
    <aside className="teacher-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <img src={logo} alt="Oakridge Logo" className="sidebar-logo" />
        <div className="sidebar-school-info">
          <h2>OAKRIDGE</h2>
          <p>
            International High School
            <br />
            of Young Leaders
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink
          to="/teacher/dashboard"
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faHome} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/teacher/students"
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faUserGraduate} />
          <span>Student Management</span>
        </NavLink>

        <NavLink
          to="/teacher/subjects"
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faBook} />
          <span>Subject Management</span>
        </NavLink>

        <NavLink
          to="/teacher/analytics"
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faChartLine} />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/teacher/notifications"
          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faBell} />
          <span>Notifications</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn">
          <FontAwesomeIcon icon={faRightFromBracket} className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;