import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialVerificationMessage =
  "Your email address has not been verified yet. Check your inbox for the verification message or request a new one below.";

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(() =>
    Boolean(location.state?.emailVerificationRequired)
  );
  const [verificationMessage, setVerificationMessage] = useState(() =>
    location.state?.emailVerificationRequired ? initialVerificationMessage : ""
  );
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleResendVerification = async () => {
    const targetEmail = email.trim();

    if (!targetEmail) {
      setResendMessage(
        "Enter your email address to request a new verification message."
      );
      return;
    }

    setResendLoading(true);
    setResendMessage("");

    try {
      const response = await api.post("/api/auth/resend-verification", {
        email: targetEmail,
      });

      setResendMessage(
        response.data?.message ||
          "If an unverified account exists for that email, a new verification message has been sent."
      );
    } catch {
      setResendMessage(
        "If an unverified account exists for that email, a new verification message has been sent."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setVerificationRequired(false);
    setVerificationMessage("");
    setResendMessage("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationRequired(true);
        setVerificationMessage(
          responseData.message ||
            "Your email address has not been verified. Check your inbox for the verification message or request another one."
        );
      } else if (responseData?.message) {
        setError(responseData.message);
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          padding: "32px",
          borderRadius: "16px",
          boxShadow: "0 12px 30px rgba(11, 31, 58, 0.08)",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>Login</h1>
        <p style={{ marginBottom: "24px", color: "#6b7a90" }}>
          Sign in to access the estate management dashboard.
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

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              style={inputStyle}
            />
          </div>

          {verificationRequired ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "#fff4cc",
                color: "#9a6700",
              }}
            >
              <p style={{ fontWeight: "700", color: "#9a6700" }}>
                Your email address has not been verified.
              </p>
              <p style={{ marginTop: "8px", color: "#9a6700" }}>
                {verificationMessage ||
                  "Check your inbox for the verification message or request another one."}
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d9e2ec",
                  background: "#ffffff",
                  color: "#0b1f3a",
                  fontWeight: "600",
                  cursor: resendLoading ? "not-allowed" : "pointer",
                  opacity: resendLoading ? 0.7 : 1,
                }}
              >
                {resendLoading ? "Sending..." : "Resend Verification Email"}
              </button>
              {resendMessage ? (
                <p style={{ marginTop: "10px", color: "#0b1f3a" }}>
                  {resendMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              borderRadius: "10px",
              background: "#0b1f3a",
              color: "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ marginTop: "18px", textAlign: "center", color: "#6b7a90" }}>
          Do not have an account?{" "}
          <Link to="/register" style={{ color: "#0b1f3a", fontWeight: "600" }}>
            Register
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

export default Login;
