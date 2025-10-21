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
      className="flex w-full min-h-screen font-inter bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Left Section */}
      <div className="flex flex-1 justify-center items-center min-h-screen box-border">
        <div className="flex flex-col items-center text-center w-full max-w-[450px] px-5 md:px-8">
          <img src={logo} alt="School Logo" className="w-[150px] h-auto mb-10" />
          <h1 className="text-[32px] md:text-[36px] font-bold leading-tight mb-3 text-black">
            Oakridge International High School of Young Leaders
          </h1>
          <p className="text-[16px] text-[#b2b2b3]">
            A.B Fernandez East, Dagupan City, Philippines
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-1 justify-center items-center p-10 md:p-20 min-h-screen box-border relative">
        {/* Login Form */}
        <div
          className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${
            isLogin
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-full"
          }`}
        >
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

        {/* Register Form */}
        <div
          className={`absolute inset-0 flex justify-center items-center transition-all duration-500 ease-in-out transform ${
            !isLogin
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-full"
          }`}
        >
          <RegisterForm switchMode={() => setIsLogin(true)} />
        </div>
      </div>
    </div>
  );
}

export default Login;
