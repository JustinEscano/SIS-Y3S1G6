import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import "./PasswordPages.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await authService.forgotPassword(email.trim());
      setSuccess(response.message || "If an account exists, a reset link has been sent to your email.");
    } catch (err) {
      setError(err.message || "Unable to process your request. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          Enter the email associated with your account and we will send you instructions to reset your password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="youremail@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Instructions"}
          </button>
        </form>

        <button type="button" className="auth-link" onClick={() => navigate("/login")}>Return to login</button>
      </div>
    </div>
  );
};

export default ForgotPassword;
