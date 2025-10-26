// src/pages/Student/components/Sidebar.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import logo from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBook, // Changed from faHome for Subjects
  faChartLine, // Changed from faChartBar for consistency
  faRightFromBracket,
  faExclamationTriangle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import '../styles/Sidebar.css'; // Ensure path is correct
import authService from "../../../services/authService";

// Logout Modal Component (assuming it's the same as Teacher's)
const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  const handleOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };
  const handleConfirm = () => { onConfirm(); onClose(); };

  const modalContent = (
    <div className="logout-modal-overlay" onClick={handleOverlayClick}>
      <div className="logout-modal">
        <div className="logout-modal-header">
          <FontAwesomeIcon icon={faExclamationTriangle} className="modal-icon text-yellow-500" /> {/* Added color */}
          <h3 className="text-lg font-semibold">Confirm Logout</h3>
          <button className="modal-close-btn text-gray-500 hover:text-gray-700" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="logout-modal-body">
          <p className="text-sm text-gray-600">Are you sure you want to log out? You will need to log in again to continue.</p>
        </div>
        <div className="logout-modal-footer">
          <button className="modal-btn cancel-btn bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn confirm-btn bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm}>
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modalContent, document.body);
};


function Sidebar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleConfirmLogout = () => authService.logout(); // Service handles redirect
  const handleCancelLogout = () => setShowLogoutModal(false);

  // Define NavLink className function once
  const getNavLinkClass = ({ isActive }) =>
    `sidebar-nav-link ${isActive ? 'active' : ''}`;

  return (
    <>
      {/* Use consistent class name or rename if needed */}
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
          <NavLink to="/student" end className={getNavLinkClass}>
            <FontAwesomeIcon icon={faHome} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/student/subjects" className={getNavLinkClass}>
            <FontAwesomeIcon icon={faBook} />
            <span>My Subjects</span>
          </NavLink>

          {/* NEW Link */}
          <NavLink to="/student/progress" className={getNavLinkClass}>
            <FontAwesomeIcon icon={faChartLine} />
            <span>Grade Progress</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogoutClick}>
            <FontAwesomeIcon icon={faRightFromBracket} className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Render Modal via Portal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

export default Sidebar;