import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialFormData = {
  title: "",
  description: "",
  serviceProvider: "",
  deadline: "",
  priority: "medium",
  status: "pending",
};

function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  const canServiceProviderUpdateTask = (task) =>
    isServiceProvider &&
    task.serviceProvider?.email &&
    user?.email &&
    task.serviceProvider.email.toLowerCase() === user.email.toLowerCase();

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || "",
    });
    setEditingTaskId("");
  };

  const fetchPageData = async () => {
    try {
      setError("");

      const [tasksResponse, providersResponse] = await Promise.all([
        api.get("/api/tasks"),
        api.get("/api/service-providers"),
      ]);

      const fetchedTasks = tasksResponse.data.data || [];
      const fetchedProviders = providersResponse.data.data || [];

      setTasks(fetchedTasks);
      setProviders(fetchedProviders);
      setFormData((currentFormData) => ({
        ...currentFormData,
        serviceProvider:
          currentFormData.serviceProvider || fetchedProviders[0]?._id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks.");
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

  const handleEdit = (task) => {
    if (isServiceProvider && !canServiceProviderUpdateTask(task)) {
      return;
    }

    setError("");
    setEditingTaskId(task._id);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      serviceProvider: task.serviceProvider?._id || "",
      deadline: task.deadline
        ? new Date(task.deadline).toISOString().split("T")[0]
        : "",
      priority: task.priority || "medium",
      status: task.status || "pending",
    });
  };

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await api.delete(`/api/tasks/${taskId}`);

      if (editingTaskId === taskId) {
        resetForm();
      }

      await fetchPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editingTaskId) {
        await api.put(
          `/api/tasks/${editingTaskId}`,
          isServiceProvider ? { status: formData.status } : formData
        );
      } else {
        await api.post("/api/tasks", formData);
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingTaskId ? "update" : "create"} task.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      task.title?.toLowerCase().includes(searchValue) ||
      task.description?.toLowerCase().includes(searchValue) ||
      task.serviceProvider?.companyName?.toLowerCase().includes(searchValue);

    const matchesPriority =
      !priorityFilter || task.priority === priorityFilter;
    const matchesStatus = !statusFilter || task.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (loading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Tasks</h1>
        <p style={{ color: "#6b7a90" }}>
          Create tasks for service providers and track their progress.
        </p>
      </div>

      {error ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
      ) : null}

      {editingTaskId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing task.
        </p>
      ) : null}

      {isResident ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          You have view-only access on this page.
        </p>
      ) : null}

      {isServiceProvider ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          You can view tasks and update status only for tasks assigned to your
          service provider account.
        </p>
      ) : null}

      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <label className="filter-label" htmlFor="taskSearch">
              Search Tasks
            </label>
            <input
              id="taskSearch"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, description, or provider"
              className="filter-control"
            />
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
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
        Showing {filteredTasks.length} of {tasks.length} tasks
      </p>

      {isAdmin || (isServiceProvider && editingTaskId) ? (
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
          {isAdmin ? (
            <>
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
            required
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
            htmlFor="deadline"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            value={formData.deadline}
            onChange={handleChange}
            required
            style={inputStyle}
          />
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
            </>
          ) : null}

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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

          {isAdmin ? (
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
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          ) : null}

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
              ? editingTaskId
                ? "Updating..."
                : "Creating..."
              : editingTaskId
              ? isServiceProvider
                ? "Update Status"
                : "Update Task"
              : "Create Task"}
          </button>

          {editingTaskId ? (
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
                "Title",
                "Description",
                "Service Provider",
                "Deadline",
                "Priority",
                "Status",
                ...(isAdmin ||
                filteredTasks.some((task) => canServiceProviderUpdateTask(task))
                  ? ["Actions"]
                  : []),
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
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <tr key={task._id}>
                  <td style={cellStyle}>{task.title}</td>
                  <td style={cellStyle}>{task.description || "-"}</td>
                  <td style={cellStyle}>
                    {task.serviceProvider?.companyName || "-"}
                  </td>
                  <td style={cellStyle}>
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={cellStyle}>{task.priority}</td>
                  <td style={cellStyle}>{task.status}</td>
                  {isAdmin || canServiceProviderUpdateTask(task) ? (
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
                          onClick={() => handleEdit(task)}
                          style={actionButtonStyle}
                        >
                          {isServiceProvider ? "Update Status" : "Edit"}
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(task._id)}
                            style={{
                              ...actionButtonStyle,
                              background: "#c1121f",
                              color: "#ffffff",
                              borderColor: "#c1121f",
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={
                    isAdmin ||
                    filteredTasks.some((task) => canServiceProviderUpdateTask(task))
                      ? "7"
                      : "6"
                  }
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  No tasks match the current filters.
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

export default Tasks;
