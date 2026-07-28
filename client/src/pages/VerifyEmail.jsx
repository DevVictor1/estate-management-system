import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const hasRequestedRef = useRef(false);
  const [status, setStatus] = useState(token ? "verifying" : "invalid");
  const [message, setMessage] = useState(
    token
      ? "We are verifying your email address now."
      : "This verification link is invalid or incomplete."
  );

  useEffect(() => {
    if (!token || hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;

    const verifyAccountEmail = async () => {
      try {
        const response = await api.get("/api/auth/verify-email", {
          params: { token },
        });

        setStatus("success");
        setMessage(
          response.data?.message || "Your email has been verified successfully."
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "This verification link is invalid or has expired."
        );
      }
    };

    verifyAccountEmail();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "520px" }}>
        <h1 style={{ marginBottom: "8px" }}>Verify Email</h1>
        <p style={{ marginBottom: "24px", color: "#6b7a90" }}>
          Confirm your email address to finish setting up your account.
        </p>

        {status === "verifying" ? (
          <div>
            <p style={{ color: "#0b1f3a", fontWeight: "600" }}>Verifying...</p>
            <p style={{ marginTop: "10px", color: "#6b7a90" }}>{message}</p>
          </div>
        ) : null}

        {status === "success" ? (
          <div
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            <p style={{ fontWeight: "700" }}>{message}</p>
          </div>
        ) : null}

        {(status === "error" || status === "invalid") ? (
          <div
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            <p style={{ fontWeight: "700" }}>{message}</p>
          </div>
        ) : null}

        <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#0b1f3a",
              color: "#ffffff",
              fontWeight: "600",
            }}
          >
            Continue to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
