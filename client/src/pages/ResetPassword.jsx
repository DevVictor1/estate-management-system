import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import AuthBranding from "../components/AuthBranding";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });

      setSuccessMessage(
        response.data?.message || "Your password has been reset successfully."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset your password right now. Please request a new reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !token;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "460px" }}>
        <AuthBranding subtitle="Estate Service Provider & Contractor Management System" />
        <p style={{ marginBottom: "24px", color: "#6b7a90" }}>
          Create a new password for your EstateHub account.
        </p>

        {invalidLink ? (
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            <p style={{ fontWeight: "700" }}>
              This password reset link is invalid or incomplete.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="password"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label
                htmlFor="confirmPassword"
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                required
                style={inputStyle}
              />
            </div>

            <p style={{ marginBottom: "16px", color: "#6b7a90", fontSize: "0.95rem" }}>
              Use a password you can remember and keep it private.
            </p>

            {successMessage ? (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#dcfce7",
                  color: "#166534",
                }}
              >
                <p style={{ fontWeight: "700" }}>{successMessage}</p>
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
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "18px", textAlign: "center", color: "#6b7a90" }}>
          {successMessage ? (
            <Link to="/login" style={{ color: "#0b1f3a", fontWeight: "600" }}>
              Continue to Login
            </Link>
          ) : (
            <>
              Need a new link?{" "}
              <Link
                to="/forgot-password"
                style={{ color: "#0b1f3a", fontWeight: "600" }}
              >
                Request Password Reset
              </Link>
            </>
          )}
        </div>
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

export default ResetPassword;
