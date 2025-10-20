import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import logo from "../../assets/images/logo.png";
import bg from "../../assets/images/login-bg.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { accessToken, role } = await authService.login({ email, password });
      login(accessToken, role);

      // Redirect based on role
      if (role === "student") navigate("/student");
      else if (role === "teacher" || role === "superadmin") navigate("/teacher");
      else navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid email or password";
      setError(msg);
    }
  };

  return (
    <div
      className="flex min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Left Section */}
      <div className="flex flex-1 flex-col justify-center items-center text-center px-6 md:px-10">
        <img src={logo} alt="School Logo" className="w-36 h-auto mb-8" />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Oakridge International High School of Young Leaders
        </h1>
        <p className="text-gray-500 text-base md:text-lg">
          A.B Fernandez East, Dagupan City, Philippines
        </p>
      </div>

      {/* Right Section */}
      <div className="flex flex-1 justify-center items-center bg-transparent p-8 md:p-12 rounded-l-3xl relative">
        <div className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
            error={error}
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