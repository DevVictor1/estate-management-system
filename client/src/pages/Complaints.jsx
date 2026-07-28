import { useEffect, useState } from "react";
import { FaClipboardCheck } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialFormData = {
  title: "",
  description: "",
  serviceProvider: "",
  category: "other",
  priority: "medium",
  status: "open",
};

const initialComplaintFilters = {
  searchTerm: "",
  categoryFilter: "",
  priorityFilter: "",
  statusFilter: "",
};

function Complaints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const clearFilters = () => {
    setSearchTerm(initialComplaintFilters.searchTerm);
    setCategoryFilter(initialComplaintFilters.categoryFilter);
    setPriorityFilter(initialComplaintFilters.priorityFilter);
    setStatusFilter(initialComplaintFilters.statusFilter);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = isResident
        ? {
            title: formData.title,
            category: formData.category,
            description: formData.description,
            priority: formData.priority,
          }
        : { ...formData };

      await api.post("/api/complaints", payload);

      resetForm();
      await fetchPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = (complaintId) => {
    navigate("/tasks", {
      state: {
        fromComplaint: true,
        complaintId,
      },
    });
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

  const hasActiveFilters =
    searchTerm.trim() !== initialComplaintFilters.searchTerm ||
    categoryFilter !== initialComplaintFilters.categoryFilter ||
    priorityFilter !== initialComplaintFilters.priorityFilter ||
    statusFilter !== initialComplaintFilters.statusFilter;

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

      {isAdmin ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          Review complaints and create linked tasks for service providers when
          action is required.
        </p>
      ) : null}

      {isServiceProvider ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          You have view-only access on this page.
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

        <div className="filter-toolbar-actions">
          <button
            type="button"
            onClick={clearFilters}
            className="clear-filters-button"
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
          <span className="filter-results-count">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </span>
        </div>
      </div>

      {isResident ? (
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
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ color: "#6b7a90" }}>
              Submit the issue and the Estate Manager will review it and assign
              the appropriate service provider.
            </p>
          </div>

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
              {submitting ? "Creating..." : "Create Complaint"}
            </button>
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
                "Title",
                "Description",
                "Service Provider",
                "Category",
                "Priority",
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
                  {isAdmin ? (
                    <td style={cellStyle}>
                      <button
                        type="button"
                        onClick={() => handleCreateTask(complaint._id)}
                        style={actionButtonStyle}
                      >
                        <span style={{ display: "inline-flex", marginRight: "8px" }}>
                          <FaClipboardCheck />
                        </span>
                        Create Task
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isAdmin ? "7" : "6"}
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  {complaints.length === 0
                    ? "No complaints have been recorded yet."
                    : "No complaints match your current filters."}
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
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  border: "1px solid #d9e2ec",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#14213d",
  cursor: "pointer",
};

export default Complaints;
