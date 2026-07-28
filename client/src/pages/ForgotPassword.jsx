import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/api/auth/forgot-password", {
        email,
      });

      setMessage(
        response.data?.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err) {
      setMessage(
        "If an account exists for that email, a password reset link has been sent."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "460px" }}>
        <h1 style={{ marginBottom: "8px" }}>Forgot Password</h1>
        <p style={{ marginBottom: "24px", color: "#6b7a90" }}>
          Enter your email address and we will send you a secure password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
              style={inputStyle}
            />
          </div>

          {message ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              <p style={{ fontWeight: "700" }}>{message}</p>
            </div>
          ) : null}

          {error ? (
            <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={submitButtonStyle(loading)}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p style={{ marginTop: "18px", textAlign: "center", color: "#6b7a90" }}>
          Remember your password?{" "}
          <Link to="/login" style={{ color: "#0b1f3a", fontWeight: "600" }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d9e2ec",
  borderRadius: "10px",
  outline: "none",
};

const submitButtonStyle = (loading) => ({
  width: "100%",
  padding: "12px 16px",
  border: "none",
  borderRadius: "10px",
  background: "#0b1f3a",
  color: "#ffffff",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
});

export default ForgotPassword;
