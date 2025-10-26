// components/Login.jsx (Minor refactor: Simplified error handling, added success toast placeholder, ensured no duplicates)
import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { useNavigate } from "react-router-dom";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import logo from "../../assets/images/logo.png";
import bg from "../../assets/images/login-bg.png";
import '../Login/LoginPage.css';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(""); // Local for form-specific
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error: contextError, isLoading: contextLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    // Guard: Prevent submit if already loading
    if (isSubmitting || contextLoading) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ Submit guarded - Already processing");
      }
      return;
    }

    // Trim & validate locally
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setLocalError("Please enter email and password");
      return;
    }

    // Payload log
    if (process.env.NODE_ENV === "development") {
      console.log("📤 Login payload:", { email: trimmedEmail, password: "***" });
    }

    setIsSubmitting(true);

    try {
      // Call context login (handles service, storage, state)
      const result = await login({ email: trimmedEmail, password: trimmedPassword });

      if (result.success) {
        // Optional: Success feedback (e.g., toast)
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Login component: Redirecting for role", result.role);
        }

        // Redirect based on role
        const redirectRole = result.role || "unknown";
        if (redirectRole === "student") {
          navigate("/student", { replace: true });
        } else if (redirectRole === "teacher" || redirectRole === "superadmin") {
          navigate("/teacher", { replace: true });
        } else {
          navigate("/login", { replace: true }); // Fallback
        }
      }
    } catch (err) {
      // Context already sets error; enhance if needed
      const msg = err.message || "Invalid email or password";
      setLocalError(msg);
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Login submit error:", { message: msg, fullErr: err });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined error: Local + context (prioritize local)
  const displayError = localError || contextError;

  return (
    <div className="login-page">
      {/* Left Section - unchanged */}
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

      {/* Right Section - unchanged */}
      <div className="login-right">
        <div className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
            error={displayError}
            isSubmitting={isSubmitting || contextLoading}
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