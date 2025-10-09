import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import logo from '../../assets/images/logo.png';
import bg from '../../assets/images/login-bg.png';
import './LoginPage.css';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const staticAccounts = [
      { email: "teacher@oakridge.edu", password: "teacher123", role: "teacher" },
      { email: "student@oakridge.edu", password: "student123", role: "student" },
    ];

    const foundUser = staticAccounts.find(
      (user) => user.email === email && user.password === password
    );

    if (foundUser) {
      login("static-token", foundUser.role);
      navigate(`/${foundUser.role}`);
    } else {
      setError("Invalid email or password");
    }
  };


  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="login-left">
        <div className="login-left-content">
          <img src={logo} alt="School Logo" className="school-logo" />
          <h1 className="school-name">Oakridge International High School of Young Leader</h1>
          <p className="school-address">A.B Fernandez east, Dagupan City, Philippines</p>
        </div>
      </div>

      <div className="login-right">
        {isLogin ? (
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
            error={error}
            switchMode={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm switchMode={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}

export default Login;
