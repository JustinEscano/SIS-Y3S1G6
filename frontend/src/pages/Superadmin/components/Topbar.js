// components/Topbar.jsx (Superadmin Version)
import React from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBell, faUserShield } from "@fortawesome/free-solid-svg-icons";
import '../../Teacher/styles/Topbar.css'; // Reuse teacher topbar CSS

function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="teacher-topbar top-0 left-64 right-0 z-40 h-16 bg-[#81020b] flex items-center justify-between px-6 shadow-md border-b border-gray-200">
      <div className="topbar-left flex items-center gap-3">
        <FontAwesomeIcon icon={faUserShield} className="text-yellow-400 text-xl" />
        <h1 className="topbar-title">Superadmin Portal</h1>
      </div>

      <div className="topbar-right">
        <FontAwesomeIcon
          icon={faSearch}
          className="icon"
          aria-label="Search"
        />
        <FontAwesomeIcon
          icon={faBell}
          className="icon"
          aria-label="Notifications"
        />
        <img
          src={profilePic}
          alt="Profile"
          className="topbar-profile"
          onClick={() => navigate("/superadmin/profile")}
        />
      </div>
    </header>
  );
}

export default Topbar;
