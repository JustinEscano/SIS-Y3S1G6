// components/Sidebar.jsx (Superadmin Version)
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import logo from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUsers,
  faBook,
  faChartLine,
  faCog,
  faRightFromBracket,
  faExclamationTriangle,
  faTimes,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import '../../Teacher/styles/Sidebar.css'; // Reuse teacher sidebar CSS
import authService from "../../../services/authService";

// Modal Component
const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalContent = (
    <div className="logout-modal-overlay" onClick={handleOverlayClick}>
      <div className="logout-modal">
        <div className="logout-modal-header">
          <FontAwesomeIcon icon={faExclamationTriangle} className="modal-icon" />
          <h3>Confirm Logout</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="logout-modal-body">
          <p>Are you sure you want to log out? You will need to log in again to continue.</p>
        </div>
        <div className="logout-modal-footer">
          <button className="modal-btn cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn confirm-btn" onClick={handleConfirm}>
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

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    authService.logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
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
            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
              <FontAwesomeIcon icon={faUserShield} />
              <span className="font-semibold">SUPERADMIN</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <NavLink
            to="/superadmin"
            end
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faHome} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/superadmin/users"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faUsers} />
            <span>User Management</span>
          </NavLink>

          <NavLink
            to="/superadmin/subjects"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faBook} />
            <span>All Subjects</span>
          </NavLink>

          <NavLink
            to="/superadmin/analytics"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faChartLine} />
            <span>System Analytics</span>
          </NavLink>

          <NavLink
            to="/superadmin/settings"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faCog} />
            <span>System Settings</span>
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
