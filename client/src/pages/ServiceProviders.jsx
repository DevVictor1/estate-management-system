import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialFormData = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  serviceCategory: "security",
  address: "",
  verificationStatus: "pending",
};

function ServiceProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingProviderId, setEditingProviderId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProviderId("");
  };

  const fetchProviders = async () => {
    try {
      setError("");
      const response = await api.get("/api/service-providers");
      setProviders(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load service providers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleEdit = (provider) => {
    setError("");
    setEditingProviderId(provider._id);
    setFormData({
      companyName: provider.companyName || "",
      contactPerson: provider.contactPerson || "",
      email: provider.email || "",
      phone: provider.phone || "",
      serviceCategory: provider.serviceCategory || "security",
      address: provider.address || "",
      verificationStatus: provider.verificationStatus || "pending",
    });
  };

  const handleDelete = async (providerId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service provider?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await api.delete(`/api/service-providers/${providerId}`);

      if (editingProviderId === providerId) {
        resetForm();
      }

      await fetchProviders();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete service provider."
      );
    }
  };

  const handleVerificationUpdate = async (providerId, verificationStatus) => {
    setError("");

    try {
      await api.put(`/api/service-providers/${providerId}`, {
        verificationStatus,
      });

      if (editingProviderId === providerId) {
        setFormData((currentData) => ({
          ...currentData,
          verificationStatus,
        }));
      }

      await fetchProviders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to mark provider as ${verificationStatus}.`
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editingProviderId) {
        await api.put(`/api/service-providers/${editingProviderId}`, formData);
      } else {
        await api.post("/api/service-providers", formData);
      }

      resetForm();
      await fetchProviders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${
            editingProviderId ? "update" : "create"
          } service provider.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProviders = providers.filter((provider) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      provider.companyName?.toLowerCase().includes(searchValue) ||
      provider.contactPerson?.toLowerCase().includes(searchValue) ||
      provider.email?.toLowerCase().includes(searchValue) ||
      provider.phone?.toLowerCase().includes(searchValue);

    const matchesCategory =
      !categoryFilter || provider.serviceCategory === categoryFilter;
    const matchesStatus =
      !statusFilter || provider.verificationStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return <p>Loading service providers...</p>;
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Service Providers</h1>
        <p style={{ color: "#6b7a90" }}>
          Manage registered service providers and review their verification
          status.
        </p>
      </div>

      {error ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
      ) : null}

      {editingProviderId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing service provider.
        </p>
      ) : null}

      {!isAdmin ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          You have view-only access on this page.
        </p>
      ) : null}

      <div className="provider-filters">
        <div className="provider-filter-group">
          <label className="provider-filter-label" htmlFor="providerSearch">
            Search Providers
          </label>
          <input
            id="providerSearch"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by company, contact, email, or phone"
            className="provider-filter-control"
          />
        </div>

        <div className="provider-filter-group">
          <label className="provider-filter-label" htmlFor="categoryFilter">
            Service Category
          </label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="provider-filter-control"
          >
            <option value="">All Categories</option>
            <option value="security">Security</option>
            <option value="cleaning">Cleaning</option>
            <option value="waste_management">Waste Management</option>
            <option value="landscaping">Landscaping</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="provider-filter-group">
          <label className="provider-filter-label" htmlFor="statusFilter">
            Verification Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="provider-filter-control"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
        Showing {filteredProviders.length} of {providers.length} service
        providers
      </p>

      {isAdmin ? (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            padding: "20px",
            marginBottom: "24px",
            background: "#ffffff",
            border: "1px solid #d9e2ec",
            borderRadius: "14px",
          }}
        >
        <div>
          <label
            htmlFor="companyName"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Company Name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="contactPerson"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Contact Person
          </label>
          <input
            id="contactPerson"
            name="contactPerson"
            type="text"
            value={formData.contactPerson}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            value={formData.phone}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="serviceCategory"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Service Category
          </label>
          <select
            id="serviceCategory"
            name="serviceCategory"
            value={formData.serviceCategory}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="security">Security</option>
            <option value="cleaning">Cleaning</option>
            <option value="waste_management">Waste Management</option>
            <option value="landscaping">Landscaping</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="verificationStatus"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Verification Status
          </label>
          <select
            id="verificationStatus"
            name="verificationStatus"
            value={formData.verificationStatus}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            htmlFor="address"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "10px",
              background: "#0b1f3a",
              color: "#ffffff",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? editingProviderId
                ? "Updating..."
                : "Creating..."
              : editingProviderId
              ? "Update Service Provider"
              : "Create Service Provider"}
          </button>

          {editingProviderId ? (
            <button
              type="button"
              onClick={resetForm}
              style={{
                marginLeft: "12px",
                padding: "12px 18px",
                border: "1px solid #d9e2ec",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#14213d",
                cursor: "pointer",
              }}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
        </form>
      ) : null}

      <div
        style={{
          overflowX: "auto",
          background: "#ffffff",
          border: "1px solid #d9e2ec",
          borderRadius: "14px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Company",
                "Contact Person",
                "Email",
                "Phone",
                "Category",
                "Address",
                "Status",
                ...(isAdmin ? ["Actions"] : []),
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: "14px",
                    textAlign: "left",
                    borderBottom: "1px solid #d9e2ec",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProviders.length > 0 ? (
              filteredProviders.map((provider) => (
                <tr key={provider._id}>
                  <td style={cellStyle}>{provider.companyName}</td>
                  <td style={cellStyle}>{provider.contactPerson}</td>
                  <td style={cellStyle}>{provider.email || "-"}</td>
                  <td style={cellStyle}>{provider.phone}</td>
                  <td style={cellStyle}>{provider.serviceCategory}</td>
                  <td style={cellStyle}>{provider.address || "-"}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        ...verificationBadgeStyles.base,
                        ...(verificationBadgeStyles[provider.verificationStatus] ||
                          verificationBadgeStyles.pending),
                      }}
                    >
                      {provider.verificationStatus}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td style={cellStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleEdit(provider)}
                          style={actionButtonStyle}
                        >
                          Edit
                        </button>
                        {provider.verificationStatus !== "approved" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleVerificationUpdate(provider._id, "approved")
                            }
                            style={{
                              ...actionButtonStyle,
                              background: "#dcfce7",
                              color: "#166534",
                              borderColor: "#86efac",
                            }}
                          >
                            Approve
                          </button>
                        ) : null}
                        {provider.verificationStatus !== "rejected" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleVerificationUpdate(provider._id, "rejected")
                            }
                            style={{
                              ...actionButtonStyle,
                              background: "#fee2e2",
                              color: "#b91c1c",
                              borderColor: "#fca5a5",
                            }}
                          >
                            Reject
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(provider._id)}
                          style={{
                            ...actionButtonStyle,
                            background: "#c1121f",
                            color: "#ffffff",
                            borderColor: "#c1121f",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isAdmin ? "8" : "7"}
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  No service providers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d9e2ec",
  borderRadius: "10px",
  outline: "none",
};

const cellStyle = {
  padding: "14px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
};

const actionButtonStyle = {
  padding: "8px 12px",
  border: "1px solid #d9e2ec",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#14213d",
  cursor: "pointer",
};

const verificationBadgeStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  pending: {
    background: "#fff4cc",
    color: "#9a6700",
  },
  approved: {
    background: "#dcfce7",
    color: "#166534",
  },
  rejected: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
};

export default ServiceProviders;
