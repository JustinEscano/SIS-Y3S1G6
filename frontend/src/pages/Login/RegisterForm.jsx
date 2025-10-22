// components/RegisterForm.jsx (Hybrid Version)
import React, { useState } from "react";
import authService from "../../services/authService";
import './RegisterForm.css'; // Import hybrid CSS

function RegisterForm({ switchMode }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await authService.register(formData);
      console.log("Registered successfully:", res);
      alert("Registration successful! You can now login.");
      switchMode();
    } catch (err) {
      if (err.response?.data?.errors) {
        const messages = err.response.data.errors
          .map((e) => (typeof e === "string" ? e : e.msg))
          .join(", ");
        setError(messages);
      } else {
        setError(err.response?.data?.message || "Registration failed");
      }
    }
  };

  return (
    <div className="register-card">
      <h2 className="register-title">Create your account</h2>
      <p className="register-subtitle">Just a few details to get you started.</p>

      <form onSubmit={handleSubmit} className="register-form">
        {/* Name */}
        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Fullname"
            required
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        {/* Email */}
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="youremail@gmail.com"
            required
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        {/* Password */}
        <div className="input-group relative">
          <label>Password</label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            required
            value={formData.password}
            onChange={handleChange}
            className="pr-16" /* Extra padding for toggle button */
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Invite Code */}
        <div className="input-group">
          <label>Invite Code</label>
          <input
            type="text"
            name="inviteCode"
            placeholder="Enter your invite code"
            required
            value={formData.inviteCode}
            onChange={handleChange}
          />
        </div>

        {error && <p className="error-text">* {error}</p>}

        <button
          type="submit"
          className="btn-primary bg-[#81020b]"
        >
          Sign Up
        </button>
      </form>

      <p className="footer-text">
        Already have an account?{" "}
        <span
          onClick={switchMode}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default RegisterForm;