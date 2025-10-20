import React from "react";
import googleLogo from "../../assets/images/google-icon.png";

function LoginForm({ email, setEmail, password, setPassword, handleSubmit, error, switchMode }) {
  return (
    <div className="w-full max-w-md bg-white/95 p-8 rounded-2xl shadow-xl font-sans">
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Let's get you back on track</h2>
      <p className="text-sm text-gray-500 mb-6">Login to continue where you left off.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
          <input
            type="email"
            placeholder="youremail@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold text-gray-800">Password</label>
            <a href="#" className="text-[#81020B] text-xs font-semibold hover:text-blue-700">
              Forgot Password?
            </a>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-[#81020B] rounded-xl text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        {error && <p className="text-red-600 text-sm">* {error}</p>}

        {/* Buttons */}
        <button
          type="submit"
          className="w-full py-3 bg-[#81020B] text-white font-medium rounded-xl hover:bg-[#990000] transition"
        >
          Login
        </button>

        <button
          type="button"
          className="w-full py-3 bg-white text-gray-800 font-medium rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <img src={googleLogo} alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Don’t have an account?{" "}
        <span
          onClick={switchMode}
          className="text-[#81020B] font-semibold cursor-pointer hover:underline"
        >
          Sign up
        </span>
      </p>
    </div>
  );
}

export default LoginForm;
