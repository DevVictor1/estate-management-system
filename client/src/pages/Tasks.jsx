import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaXmark,
} from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
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

const providerAllowedStatuses = ["pending", "in_progress", "completed"];
const adminAllowedStatuses = [
  "pending",
  "in_progress",
  "completed",
  "overdue",
  "cancelled",
];

const initialTaskFilters = {
  searchTerm: "",
  priorityFilter: "",
  statusFilter: "",
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const formatQuotationStatusLabel = (status = "") =>
  String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatFileSize = (sizeInBytes = 0) => {
  if (!sizeInBytes) {
    return "0 KB";
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
};

const getTaskComplaintAttachments = (task) =>
  Array.isArray(task?.complaint?.attachments) ? task.complaint.attachments : [];

const formatTaskStatusLabel = (status = "") =>
  String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function Tasks() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [complaintContext, setComplaintContext] = useState(null);
  const [complaintPhotoPreview, setComplaintPhotoPreview] = useState({
    attachments: [],
    index: 0,
    title: "",
  });
  const [loadingComplaint, setLoadingComplaint] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const isAdmin = user?.role === "admin";
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  const clearTaskFilters = () => {
    setSearchTerm(initialTaskFilters.searchTerm);
    setPriorityFilter(initialTaskFilters.priorityFilter);
    setStatusFilter(initialTaskFilters.statusFilter);
  };

  const complaintPrefillRequestId =
    isAdmin &&
    !editingTaskId &&
    location.state?.fromComplaint === true &&
    location.state?.complaintId
      ? location.state.complaintId
      : "";

  const isComplaintPrefillMode =
    isAdmin && !editingTaskId && Boolean(complaintContext?._id);

  const canServiceProviderUpdateTask = (task) =>
    isServiceProvider &&
    task.serviceProvider?.email &&
    user?.email &&
    task.serviceProvider.email.toLowerCase() === user.email.toLowerCase();

  const serviceProviderTasks = tasks.filter((task) =>
    canServiceProviderUpdateTask(task)
  );

  const visibleTasks = isServiceProvider ? serviceProviderTasks : tasks;
  const editableStatusOptions = isAdmin
    ? adminAllowedStatuses
    : providerAllowedStatuses;

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || "",
    });
    setEditingTaskId("");
  };

  const clearComplaintPrefillState = ({ resetTaskForm = true } = {}) => {
    setComplaintContext(null);
    setComplaintPhotoPreview({
      attachments: [],
      index: 0,
      title: "",
    });
    setLoadingComplaint(false);

    if (resetTaskForm) {
      resetForm();
    }

    if (location.state?.fromComplaint) {
      navigate("/tasks", { replace: true });
    }
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

  useEffect(() => {
    if (!complaintPrefillRequestId) {
      return;
    }

    let isMounted = true;

    const loadComplaint = async () => {
      setLoadingComplaint(true);
      setError("");
      setFeedback(null);

      try {
        const response = await api.get(
          `/api/complaints/${complaintPrefillRequestId}`
        );
        const complaint = response.data.data;

        if (!isMounted) {
          return;
        }

        setEditingTaskId("");
        setComplaintContext(complaint);
        setFormData({
          ...initialFormData,
          title: complaint.title || "",
          description: complaint.description || "",
          serviceProvider: "",
          deadline: "",
          priority: complaint.priority || "medium",
          status: "pending",
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const statusCode = err.response?.status;
        const message =
          statusCode === 404
            ? "The selected complaint could not be found."
            : statusCode === 400
            ? "The complaint reference is invalid."
            : statusCode === 401 || statusCode === 403
            ? "You are not authorized to load this complaint."
            : "We couldn't load the complaint details for task creation. Please try again.";

        setComplaintContext(null);
        setError(message);
        navigate("/tasks", { replace: true });
      } finally {
        if (isMounted) {
          setLoadingComplaint(false);
        }
      }
    };

    loadComplaint();

    return () => {
      isMounted = false;
    };
  }, [complaintPrefillRequestId, navigate]);

  const activeComplaintPhoto = complaintPhotoPreview.attachments?.[
    complaintPhotoPreview.index
  ];

  useEffect(() => {
    if (!activeComplaintPhoto) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setComplaintPhotoPreview({
          attachments: [],
          index: 0,
          title: "",
        });
        return;
      }

      if (
        event.key === "ArrowRight" &&
        complaintPhotoPreview.attachments.length > 1
      ) {
        setComplaintPhotoPreview((currentPreview) => ({
          ...currentPreview,
          index: (currentPreview.index + 1) % currentPreview.attachments.length,
        }));
      }

      if (
        event.key === "ArrowLeft" &&
        complaintPhotoPreview.attachments.length > 1
      ) {
        setComplaintPhotoPreview((currentPreview) => ({
          ...currentPreview,
          index:
            (currentPreview.index - 1 + currentPreview.attachments.length) %
            currentPreview.attachments.length,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeComplaintPhoto, complaintPhotoPreview.attachments.length]);

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
    setFeedback(null);

    if (complaintContext || location.state?.fromComplaint) {
      clearComplaintPrefillState({ resetTaskForm: false });
    }

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
    setFeedback(null);

    try {
      await api.delete(`/api/tasks/${taskId}`);

      if (editingTaskId === taskId) {
        resetForm();
      }

      await fetchPageData();
      setFeedback({
        type: "success",
        text: "Task deleted successfully.",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFeedback(null);

    try {
      if (editingTaskId) {
        if (
          isServiceProvider &&
          !providerAllowedStatuses.includes(formData.status)
        ) {
          setError(
            "You can only update your task status to pending, in progress, or completed."
          );
          return;
        }

        if (isServiceProvider) {
          await api.patch(`/api/tasks/${editingTaskId}/status`, {
            status: formData.status,
          });
        } else {
          await api.put(`/api/tasks/${editingTaskId}`, formData);
        }

        resetForm();
        await fetchPageData();
        setFeedback({
          type: "success",
          text: "Task updated successfully.",
        });
      } else {
        const payload = isComplaintPrefillMode
          ? {
              ...formData,
              complaint: complaintContext._id,
            }
          : { ...formData };

        await api.post("/api/tasks", payload);
        await fetchPageData();

        if (isComplaintPrefillMode) {
          if (formData.serviceProvider) {
            try {
              await api.put(`/api/complaints/${complaintContext._id}`, {
                status: "assigned",
                serviceProvider: formData.serviceProvider,
              });

              setFeedback({
                type: "success",
                text: "Task created successfully and the complaint assignment was updated.",
              });
            } catch (statusUpdateError) {
              setFeedback({
                type: "warning",
                text: "The task was created, but the complaint assignment details could not be updated.",
              });
            }
          } else {
            setFeedback({
              type: "success",
              text: "Task created successfully.",
            });
          }

          clearComplaintPrefillState();
        } else {
          resetForm();
          setFeedback({
            type: "success",
            text: "Task created successfully.",
          });
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError("A task has already been created for this complaint.");
      } else {
        setError(
          err.response?.data?.message ||
            `Failed to ${editingTaskId ? "update" : "create"} task.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setError("");
    setFeedback(null);
    resetForm();
  };

  const handleCancelComplaintPrefill = () => {
    setError("");
    setFeedback(null);
    clearComplaintPrefillState();
  };

  const openComplaintPhotoPreview = (startingIndex = 0) => {
    const attachments = Array.isArray(complaintContext?.attachments)
      ? complaintContext.attachments
      : [];

    if (!attachments.length) {
      return;
    }

    setComplaintPhotoPreview({
      attachments,
      index: startingIndex,
      title: complaintContext?.title || "Complaint photo",
    });
  };

  const openTaskComplaintPhotoPreview = (task, startingIndex = 0) => {
    const attachments = getTaskComplaintAttachments(task);

    if (!attachments.length) {
      return;
    }

    setComplaintPhotoPreview({
      attachments,
      index: startingIndex,
      title: task.complaint?.title || task.title || "Complaint photo",
    });
  };

  const closeComplaintPhotoPreview = () => {
    setComplaintPhotoPreview({
      attachments: [],
      index: 0,
      title: "",
    });
  };

  const filteredTasks = visibleTasks.filter((task) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      task.title?.toLowerCase().includes(searchValue) ||
      task.description?.toLowerCase().includes(searchValue) ||
      (!isServiceProvider &&
        task.serviceProvider?.companyName?.toLowerCase().includes(searchValue));

    const matchesPriority =
      !priorityFilter || task.priority === priorityFilter;
    const matchesStatus = !statusFilter || task.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const hasActiveFilters =
    searchTerm.trim() !== initialTaskFilters.searchTerm ||
    priorityFilter !== initialTaskFilters.priorityFilter ||
    statusFilter !== initialTaskFilters.statusFilter;

  const serviceProviderSummary = {
    total: serviceProviderTasks.length,
    pending: serviceProviderTasks.filter((task) => task.status === "pending")
      .length,
    inProgress: serviceProviderTasks.filter(
      (task) => task.status === "in_progress"
    ).length,
    completed: serviceProviderTasks.filter(
      (task) => task.status === "completed"
    ).length,
  };

  const showActionsColumn =
    isAdmin ||
    (isServiceProvider &&
      filteredTasks.some((task) => canServiceProviderUpdateTask(task)));

  const residentName =
    complaintContext?.resident?.fullName?.trim() || "Not provided";
  const residentEmail =
    complaintContext?.resident?.email?.trim() || "Not provided";
  const apartmentNumber =
    complaintContext?.resident?.apartmentNumber?.trim() || "Not provided";
  const complaintAttachments = Array.isArray(complaintContext?.attachments)
    ? complaintContext.attachments
    : [];

  if (loading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <section className="tasks-page">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>
          {isServiceProvider ? "My Assigned Tasks" : "Tasks"}
        </h1>
        <p style={{ color: "#6b7a90" }}>
          {isServiceProvider
            ? "Review the work assigned to your provider account and keep task progress up to date."
            : "Create tasks for service providers and track their progress."}
        </p>
      </div>

      {feedback ? (
        <div
          className={`task-feedback ${
            feedback.type === "warning"
              ? "task-feedback-warning"
              : "task-feedback-success"
          }`}
        >
          <p>{feedback.text}</p>
        </div>
      ) : null}

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

      {isAdmin && loadingComplaint ? (
        <div className="complaint-task-banner">
          <p className="complaint-task-banner-label">
            Creating Task from Complaint
          </p>
          <h2>Loading complaint details...</h2>
          <p>
            We are loading the complaint information you selected so the task
            form can be prepared safely.
          </p>
        </div>
      ) : null}

      {isComplaintPrefillMode ? (
        <div className="complaint-task-banner">
          <p className="complaint-task-banner-label">
            Creating Task from Complaint
          </p>
          <h2>
            Review the complaint details, select a service provider, and set
            the deadline.
          </h2>

          <div className="complaint-task-actions">
            <button
              type="button"
              onClick={() => navigate("/complaints")}
              className="complaint-task-button complaint-task-button-secondary"
            >
              <FaArrowLeft />
              <span>Back to Complaints</span>
            </button>
            <button
              type="button"
              onClick={handleCancelComplaintPrefill}
              className="complaint-task-button complaint-task-button-secondary"
            >
              Cancel Complaint Prefill
            </button>
          </div>

          <div className="complaint-task-context">
            <div className="complaint-task-context-grid">
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">
                  Complaint Title
                </span>
                <strong>{complaintContext.title || "Not provided"}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">Category</span>
                <strong>{complaintContext.category || "Not provided"}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">Priority</span>
                <strong>{complaintContext.priority || "Not provided"}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">
                  Complaint Status
                </span>
                <strong>{complaintContext.status || "Not provided"}</strong>
              </div>
              <div className="complaint-task-context-item complaint-task-context-item-full">
                <span className="complaint-task-context-label">
                  Complaint Description
                </span>
                <strong>{complaintContext.description || "Not provided"}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">
                  Resident Name
                </span>
                <strong>{residentName}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">
                  Resident Email
                </span>
                <strong>{residentEmail}</strong>
              </div>
              <div className="complaint-task-context-item">
                <span className="complaint-task-context-label">
                  Apartment Number
                </span>
                <strong>{apartmentNumber}</strong>
              </div>
            </div>

            {complaintAttachments.length ? (
              <div className="complaint-task-attachments">
                <div className="complaint-task-attachments-header">
                  <span className="complaint-task-context-label">
                    Complaint Photos
                  </span>
                  <strong>
                    {complaintAttachments.length}{" "}
                    {complaintAttachments.length === 1 ? "photo" : "photos"}
                  </strong>
                </div>
                <div className="complaint-task-attachment-grid">
                  {complaintAttachments.map((attachment, index) => (
                    <button
                      key={`${complaintContext._id}-attachment-${index}`}
                      type="button"
                      className="complaint-task-attachment-button"
                      onClick={() => openComplaintPhotoPreview(index)}
                    >
                      <img
                        src={attachment.url}
                        alt={`${complaintContext.title} photo ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isServiceProvider ? (
        <div className="task-summary-grid">
          <article className="task-summary-card task-summary-total">
            <span className="task-summary-label">Total Assigned</span>
            <strong className="task-summary-value">
              {serviceProviderSummary.total}
            </strong>
          </article>
          <article className="task-summary-card task-summary-pending">
            <span className="task-summary-label">Pending</span>
            <strong className="task-summary-value">
              {serviceProviderSummary.pending}
            </strong>
          </article>
          <article className="task-summary-card task-summary-progress">
            <span className="task-summary-label">In Progress</span>
            <strong className="task-summary-value">
              {serviceProviderSummary.inProgress}
            </strong>
          </article>
          <article className="task-summary-card task-summary-completed">
            <span className="task-summary-label">Completed</span>
            <strong className="task-summary-value">
              {serviceProviderSummary.completed}
            </strong>
          </article>
        </div>
      ) : null}

      <div className="filter-card task-filter-toolbar">
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
              placeholder={
                isServiceProvider
                  ? "Search by title or description"
                  : "Search by title, description, or provider"
              }
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
              {!isServiceProvider ? (
                <>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </>
              ) : null}
            </select>
          </div>
        </div>

        <div className="task-filter-toolbar-actions">
          <button
            type="button"
            onClick={clearTaskFilters}
            className="clear-filters-button"
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
          <span className="filter-results-count">
            Showing {filteredTasks.length} of {visibleTasks.length} tasks
          </span>
        </div>
      </div>

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
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
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
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
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
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
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
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
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

          <fieldset className="task-status-fieldset">
            <legend className="task-status-legend">Status</legend>
            <div className="task-status-radio-group">
              {editableStatusOptions.map((statusOption) => {
                const inputId = `task-status-${statusOption}`;

                return (
                  <label
                    key={statusOption}
                    htmlFor={inputId}
                    className="task-status-radio-option"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="status"
                      value={statusOption}
                      checked={formData.status === statusOption}
                      onChange={handleChange}
                      className="task-status-radio-input"
                    />
                    <span className="task-status-radio-label">
                      {formatTaskStatusLabel(statusOption)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {isAdmin ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="description"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
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
              disabled={submitting || loadingComplaint}
              style={{
                padding: "12px 18px",
                border: "none",
                borderRadius: "10px",
                background: "#0b1f3a",
                color: "#ffffff",
                cursor: submitting || loadingComplaint ? "not-allowed" : "pointer",
                opacity: submitting || loadingComplaint ? 0.7 : 1,
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
                onClick={handleCancelEdit}
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

      <div className="task-table-wrapper">
        <table className="task-table">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Title",
                "Description",
                "Deadline",
                "Priority",
                "Status",
                ...(!isServiceProvider ? ["Service Provider"] : []),
                ...(showActionsColumn ? ["Actions"] : []),
              ].map((heading) => (
                <th
                  key={heading}
                  className={
                    heading === "Description"
                      ? "task-description-cell"
                      : heading === "Service Provider"
                      ? "task-provider-cell"
                      : heading === "Actions"
                      ? "task-actions-cell"
                      : undefined
                  }
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
                  <td
                    style={cellStyle}
                    className="task-description-cell"
                    title={task.description || "-"}
                  >
                    <span className="task-description-text">
                      {task.description || "-"}
                    </span>
                    {!isResident && task.latestQuotation ? (
                      <div className="task-quotation-summary">
                        <span className="task-quotation-summary-label">
                          Latest quotation
                        </span>
                        <div className="task-quotation-summary-meta">
                          <span>
                            {formatQuotationStatusLabel(task.latestQuotation.status)}
                          </span>
                          <span>
                            {currencyFormatter.format(
                              Number(task.latestQuotation.totalAmount) || 0
                            )}
                          </span>
                          <span>
                            Revision {task.latestQuotation.revisionNumber || 1}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {isServiceProvider &&
                    getTaskComplaintAttachments(task).length ? (
                      <div className="task-complaint-attachments">
                        <div className="task-complaint-attachment-row">
                          {getTaskComplaintAttachments(task)
                            .slice(0, 3)
                            .map((attachment, index) => (
                              <button
                                key={`${task._id}-complaint-attachment-${index}`}
                                type="button"
                                className="task-complaint-attachment-thumb"
                                onClick={() =>
                                  openTaskComplaintPhotoPreview(task, index)
                                }
                              >
                                <img
                                  src={attachment.url}
                                  alt={`${task.title} complaint photo ${
                                    index + 1
                                  }`}
                                />
                              </button>
                            ))}
                          {getTaskComplaintAttachments(task).length > 3 ? (
                            <span className="task-complaint-attachment-more">
                              +{getTaskComplaintAttachments(task).length - 3}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="task-complaint-attachment-trigger"
                          onClick={() => openTaskComplaintPhotoPreview(task, 0)}
                        >
                          {getTaskComplaintAttachments(task).length === 1
                            ? "View complaint photo"
                            : `View ${getTaskComplaintAttachments(task).length} complaint photos`}
                        </button>
                      </div>
                    ) : null}
                  </td>
                  <td style={cellStyle}>
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={cellStyle}>{task.priority}</td>
                  <td style={cellStyle}>{task.status}</td>
                  {!isServiceProvider ? (
                    <td
                      style={cellStyle}
                      className="task-provider-cell"
                      title={task.serviceProvider?.companyName || "-"}
                    >
                      <span className="task-provider-text">
                        {task.serviceProvider?.companyName || "-"}
                      </span>
                    </td>
                  ) : null}
                  {showActionsColumn ? (
                    <td style={cellStyle} className="task-actions-cell">
                      <div className="task-action-row">
                        {isAdmin || canServiceProviderUpdateTask(task) ? (
                          <button
                            type="button"
                            onClick={() => handleEdit(task)}
                            style={actionButtonStyle}
                            className="task-action-button"
                          >
                            {isServiceProvider ? "Update Status" : "Edit"}
                          </button>
                        ) : null}
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
                            className="task-action-button task-action-button-delete"
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
                  colSpan={isAdmin ? "7" : showActionsColumn ? "6" : "5"}
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  {visibleTasks.length === 0
                    ? isServiceProvider
                      ? "No tasks have been assigned to your provider account yet."
                      : "No tasks have been created yet."
                    : isServiceProvider
                    ? "No assigned tasks match the current filters."
                    : "No tasks match your current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeComplaintPhoto ? (
        <div
          className="complaint-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Complaint photo preview"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeComplaintPhotoPreview();
            }
          }}
        >
          <div className="complaint-photo-lightbox-dialog">
            <button
              type="button"
              className="complaint-photo-lightbox-close"
              onClick={closeComplaintPhotoPreview}
            >
              <FaXmark />
              <span>Close</span>
            </button>

            <div className="complaint-photo-lightbox-header">
              <div>
                <p className="complaint-photo-lightbox-label">
                  Complaint photo
                </p>
                <h2>{complaintPhotoPreview.title || "Complaint"}</h2>
              </div>
              <span className="complaint-photo-lightbox-count">
                {complaintPhotoPreview.index + 1} of{" "}
                {complaintPhotoPreview.attachments.length}
              </span>
            </div>

            <div className="complaint-photo-lightbox-stage">
              {complaintPhotoPreview.attachments.length > 1 ? (
                <button
                  type="button"
                  className="complaint-photo-lightbox-nav"
                  onClick={() =>
                    setComplaintPhotoPreview((currentPreview) => ({
                      ...currentPreview,
                      index:
                        (currentPreview.index - 1 +
                          currentPreview.attachments.length) %
                        currentPreview.attachments.length,
                    }))
                  }
                  aria-label="View previous complaint photo"
                >
                  <FaChevronLeft />
                </button>
              ) : null}

              <img
                src={activeComplaintPhoto.url}
                alt={`${complaintPhotoPreview.title} photo ${
                  complaintPhotoPreview.index + 1
                }`}
                className="complaint-photo-lightbox-image"
              />

              {complaintPhotoPreview.attachments.length > 1 ? (
                <button
                  type="button"
                  className="complaint-photo-lightbox-nav"
                  onClick={() =>
                    setComplaintPhotoPreview((currentPreview) => ({
                      ...currentPreview,
                      index:
                        (currentPreview.index + 1) %
                        currentPreview.attachments.length,
                    }))
                  }
                  aria-label="View next complaint photo"
                >
                  <FaChevronRight />
                </button>
              ) : null}
            </div>

            <div className="complaint-photo-lightbox-footer">
              <span>{activeComplaintPhoto.originalName || "Complaint image"}</span>
              <span>{formatFileSize(activeComplaintPhoto.size)}</span>
            </div>
          </div>
        </div>
      ) : null}
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
