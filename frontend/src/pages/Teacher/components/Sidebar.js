import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import "../styles/Sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUserGraduate,
  faBook,
  faChartLine,
  faBell,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

function Sidebar() {
  return (
    <aside className="teacher-sidebar">
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

      <nav className="sidebar-nav">
        <NavLink
          to="/teacher/dashboard"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FontAwesomeIcon icon={faHome} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/teacher/students"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FontAwesomeIcon icon={faUserGraduate} />
          <span>Student Management</span>
        </NavLink>

        <NavLink
          to="/teacher/subjects"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FontAwesomeIcon icon={faBook} />
          <span>Subject Management</span>
        </NavLink>

        <NavLink
          to="/teacher/analytics"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FontAwesomeIcon icon={faChartLine} />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/teacher/notifications"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FontAwesomeIcon icon={faBell} />
          <span>Notifications</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn">
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
