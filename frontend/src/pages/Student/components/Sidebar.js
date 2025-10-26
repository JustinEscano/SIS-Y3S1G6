
// components/Sidebar.jsx (Hybrid Version)
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import logo from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faRightFromBracket,
  faExclamationTriangle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import '../styles/Sidebar.css'; // Import hybrid CSS
import authService from "../../../services/authService"; // Adjust path as needed

// Modal Component (separate for clarity and portal)
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
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <NavLink
            to="."
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faHome} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="subjects"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faHome} />
            <span>Subjects</span>
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