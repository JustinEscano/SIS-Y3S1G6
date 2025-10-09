import React from "react";
import './LoginForm.css';
import googleLogo from '../../assets/images/google-icon.png'; 

function LoginForm({ email, setEmail, password, setPassword, handleSubmit, error, switchMode }) {
  return (
    <div className="login-card">
      <h2 className="login-title">Let's get you back on track</h2>
      <p className="login-subtitle">Login to continue where you left off.</p>

      {error && <p className="login-error">{error}</p>}

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="youremail@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <div className="label-row">
            <label>Password</label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-login">Login</button>

        <button type="button" className="btn-google">
          <img src={googleLogo} alt="Google" className="google-icon" />
          Continue with Google
        </button>
      </form>

      <p className="footer-text">
        Don’t have an account? <span onClick={switchMode}>Sign up</span>
      </p>
    </div>
  );
}

export default LoginForm;
