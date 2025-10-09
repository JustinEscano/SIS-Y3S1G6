import React from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../../../assets/images/logo.png";
import "../styles/Topbar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBell } from '@fortawesome/free-solid-svg-icons';

function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="teacher-topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Teacher Portal</h1>
      </div>

      <div className="topbar-right">
        <FontAwesomeIcon icon={faSearch} className="icon" />
        <FontAwesomeIcon icon={faBell} className="icon" />
        <img
          src={profilePic}
          alt="Profile"
          className="topbar-profile"
          onClick={() => navigate("/teacher/profile")}
        />
      </div>
    </header>
  );
}

export default Topbar;
