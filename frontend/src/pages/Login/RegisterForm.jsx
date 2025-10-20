import React, { useState } from "react";
import authService from "../../services/authService";

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
    <div className="w-full max-w-md bg-white/95 p-8 rounded-2xl shadow-xl font-sans">
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Just a few details to get you started.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Fullname"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
          <input
            type="email"
            name="email"
            placeholder="youremail@gmail.com"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-9 text-sm text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Invite Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Invite Code</label>
          <input
            type="text"
            name="inviteCode"
            placeholder="Enter your invite code"
            required
            value={formData.inviteCode}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        {error && <p className="text-red-600 text-sm">* {error}</p>}

        <button
          type="submit"
          className="w-full py-3 bg-[#81020B] text-white font-medium rounded-xl hover:bg-[#990000] transition"
        >
          Sign Up
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <span
          onClick={switchMode}
          className="text-[#81020B] font-semibold cursor-pointer hover:underline"
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default RegisterForm;
