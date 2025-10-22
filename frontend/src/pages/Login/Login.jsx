// components/Login.jsx (Refactored: Handles refreshToken, adds loading state, fixes destructuring)
import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import logo from "../../assets/images/logo.png";
import bg from "../../assets/images/login-bg.png";
import '../Login/LoginPage.css'; // Import hybrid CSS

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // New: Local loading for form submit

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Destructure refreshToken too (from authService)
      const { accessToken, refreshToken, role } = await authService.login({ email, password });
      login(accessToken, role, refreshToken); // Pass refreshToken to context

      // Redirect based on role
      if (role === "student") {
        navigate("/student");
      } else if (role === "teacher" || role === "superadmin") {
        navigate("/teacher");
      } else {
        navigate("/login");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid email or password";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Section */}
      <div className="login-left">
        <div className="login-left-content">
          <img src={logo} alt="School Logo" className="school-logo" />
          <h1 className="school-name">
            Oakridge International High School of Young Leaders
          </h1>
          <p className="school-address">
            A.B Fernandez East, Dagupan City, Philippines
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="login-right">
        <div className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
            error={error}
            isSubmitting={isSubmitting} // Pass to form for button disable/spinner
            switchMode={() => setIsLogin(false)}
          />
        </div>
        <div className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
          <RegisterForm switchMode={() => setIsLogin(true)} />
        </div>
      </div>
    </div>
  );
}

export default Login;