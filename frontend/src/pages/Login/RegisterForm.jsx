import React, { useState } from 'react';
import './RegisterForm.css';
import authService from '../../services/authService';

function RegisterForm({ switchMode }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    inviteCode: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Send all data including inviteCode to backend
      const res = await authService.register(formData);
      console.log('Registered successfully:', res);
      alert('Registration successful! You can now login.');
      switchMode(); // switch to login form
    } catch (err) {
      if (err.response?.data?.errors) {
        const messages = err.response.data.errors.map(e => e.msg).join(', ');
        setError(messages); // sets the <p className="error-text">* {error}</p>
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    }
  };


  return (
    <div className="register-card">
      <h2 className="register-title">Create your account</h2>
      <p className="register-subtitle">Just a few details to get you started.</p>

      <form className="register-form" onSubmit={handleSubmit}>
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

        <div className="input-group" style={{ position: 'relative' }}>
          <label>Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter your password"
            required
            value={formData.password}
            onChange={handleChange}
            style={{ paddingRight: '60px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#555',
              fontSize: '0.9rem',
              padding: 0,
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

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

        <button type="submit" className="btn-primary">Sign Up</button>
      </form>

      <p className="footer-text">
        Already have an account? <span onClick={switchMode}>Login</span>
      </p>
    </div>
  );
}

export default RegisterForm;
