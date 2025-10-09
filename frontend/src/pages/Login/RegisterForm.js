import React from 'react';
import './RegisterForm.css';

function RegisterForm({ switchMode }) {
  return (
    <div className="register-card">
      <h2 className="register-title">Create your account</h2>
      <p className="register-subtitle">Just a few details to get you started.</p>

      <form className="register-form">
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" placeholder="Fullname" required />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="youremail@gmail.com" required />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" required />
        </div>

        <div className="input-group">
          <label>Access Code</label>
          <input type="text" placeholder="Enter access code" required />
        </div>

        <button type="submit" className="btn-primary">Sign Up</button>
      </form>

      <p className="footer-text">
        Already have an account? <span onClick={switchMode}>Login</span>
      </p>
    </div>
  );
}

export default RegisterForm;
