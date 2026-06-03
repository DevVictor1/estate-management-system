import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function ProtectedRoute() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);
  const [isApprovedServiceProvider, setIsApprovedServiceProvider] =
    useState(true);
  const [providerStatusError, setProviderStatusError] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const checkServiceProviderApproval = async () => {
      if (!user) {
        setProviderStatusLoading(false);
        setIsApprovedServiceProvider(true);
        setProviderStatusError("");
        return;
      }

      if (user.role !== "service_provider") {
        setProviderStatusLoading(false);
        setIsApprovedServiceProvider(true);
        setProviderStatusError("");
        return;
      }

      setProviderStatusLoading(true);
      setProviderStatusError("");

      try {
        const response = await api.get("/api/service-providers");
        const providers = response.data.data || [];
        const matchingProvider = providers.find(
          (provider) =>
            provider.email?.toLowerCase() === user.email?.toLowerCase()
        );

        setIsApprovedServiceProvider(
          matchingProvider?.verificationStatus === "approved"
        );
      } catch (error) {
        setProviderStatusError("Unable to verify your approval status right now.");
        setIsApprovedServiceProvider(false);
      } finally {
        setProviderStatusLoading(false);
      }
    };

    checkServiceProviderApproval();
  }, [user]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (providerStatusLoading) {
    return <p>Loading...</p>;
  }

  if (user.role === "service_provider" && !isApprovedServiceProvider) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "linear-gradient(180deg, #f7faff 0%, #edf3fb 100%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "36px 32px",
            borderRadius: "24px",
            background: "#ffffff",
            border: "1px solid rgba(148, 163, 184, 0.24)",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              marginBottom: "10px",
              fontSize: "0.8rem",
              fontWeight: "700",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9a6700",
            }}
          >
            Awaiting Approval
          </p>
          <h1 style={{ marginBottom: "12px", fontSize: "1.9rem" }}>
            Your service provider account is pending review
          </h1>
          <p style={{ color: "#64748b", lineHeight: 1.7 }}>
            Your registration was received successfully. Your service provider
            account is waiting for estate manager approval before you can
            access the dashboard.
          </p>
          {providerStatusError ? (
            <p style={{ marginTop: "14px", color: "#b91c1c" }}>
              {providerStatusError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginTop: "24px",
              padding: "12px 20px",
              border: "none",
              borderRadius: "12px",
              background: "#0b1f3a",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
