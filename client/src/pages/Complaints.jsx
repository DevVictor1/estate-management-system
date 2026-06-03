import { useEffect, useState } from "react";
import api from "../services/api";

const initialFormData = {
  title: "",
  description: "",
  serviceProvider: "",
  category: "other",
  priority: "medium",
  status: "open",
};

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingComplaintId, setEditingComplaintId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || "",
    });
    setEditingComplaintId("");
  };

  const fetchPageData = async () => {
    try {
      setError("");

      const [complaintsResponse, providersResponse] = await Promise.all([
        api.get("/api/complaints"),
        api.get("/api/service-providers"),
      ]);

      const fetchedComplaints = complaintsResponse.data.data || [];
      const fetchedProviders = providersResponse.data.data || [];

      setComplaints(fetchedComplaints);
      setProviders(fetchedProviders);
      setFormData((currentFormData) => ({
        ...currentFormData,
        serviceProvider:
          currentFormData.serviceProvider || fetchedProviders[0]?._id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleEdit = (complaint) => {
    setError("");
    setEditingComplaintId(complaint._id);
    setFormData({
      title: complaint.title || "",
      description: complaint.description || "",
      serviceProvider: complaint.serviceProvider?._id || "",
      category: complaint.category || "other",
      priority: complaint.priority || "medium",
      status: complaint.status || "open",
    });
  };

  const handleDelete = async (complaintId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this complaint?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await api.delete(`/api/complaints/${complaintId}`);

      if (editingComplaintId === complaintId) {
        resetForm();
      }

      await fetchPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete complaint.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editingComplaintId) {
        await api.put(`/api/complaints/${editingComplaintId}`, formData);
      } else {
        await api.post("/api/complaints", formData);
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingComplaintId ? "update" : "create"} complaint.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      complaint.title?.toLowerCase().includes(searchValue) ||
      complaint.description?.toLowerCase().includes(searchValue) ||
      complaint.serviceProvider?.companyName?.toLowerCase().includes(searchValue);

    const matchesCategory =
      !categoryFilter || complaint.category === categoryFilter;
    const matchesPriority =
      !priorityFilter || complaint.priority === priorityFilter;
    const matchesStatus = !statusFilter || complaint.status === statusFilter;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  if (loading) {
    return <p>Loading complaints...</p>;
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Complaints</h1>
        <p style={{ color: "#6b7a90" }}>
          Log complaints, assign service providers, and monitor resolution
          status.
        </p>
      </div>

      {error ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
      ) : null}

      {editingComplaintId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing complaint.
        </p>
      ) : null}

      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <label className="filter-label" htmlFor="complaintSearch">
              Search Complaints
            </label>
            <input
              id="complaintSearch"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, description, or provider"
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="categoryFilter">
              Category
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Categories</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="waste_management">Waste Management</option>
              <option value="landscaping">Landscaping</option>
              <option value="maintenance">Maintenance</option>
              <option value="payment">Payment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="priorityFilter">
              Priority
            </label>
            <select
              id="priorityFilter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
        Showing {filteredComplaints.length} of {complaints.length} complaints
      </p>

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
            htmlFor="title"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="serviceProvider"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Service Provider
          </label>
          <select
            id="serviceProvider"
            name="serviceProvider"
            value={formData.serviceProvider}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Select a provider</option>
            {providers.map((provider) => (
              <option key={provider._id} value={provider._id}>
                {provider.companyName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="category"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="security">Security</option>
            <option value="cleaning">Cleaning</option>
            <option value="waste_management">Waste Management</option>
            <option value="landscaping">Landscaping</option>
            <option value="maintenance">Maintenance</option>
            <option value="payment">Payment</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="priority"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            htmlFor="description"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
            style={{ ...inputStyle, resize: "vertical" }}
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
              ? editingComplaintId
                ? "Updating..."
                : "Creating..."
              : editingComplaintId
              ? "Update Complaint"
              : "Create Complaint"}
          </button>

          {editingComplaintId ? (
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
                "Title",
                "Description",
                "Service Provider",
                "Category",
                "Priority",
                "Status",
                "Actions",
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
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((complaint) => (
                <tr key={complaint._id}>
                  <td style={cellStyle}>{complaint.title}</td>
                  <td style={cellStyle}>{complaint.description}</td>
                  <td style={cellStyle}>
                    {complaint.serviceProvider?.companyName || "-"}
                  </td>
                  <td style={cellStyle}>{complaint.category}</td>
                  <td style={cellStyle}>{complaint.priority}</td>
                  <td style={cellStyle}>{complaint.status}</td>
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
                        onClick={() => handleEdit(complaint)}
                        style={actionButtonStyle}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(complaint._id)}
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
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  No complaints match the current filters.
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

export default Complaints;
