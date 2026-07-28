import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClipboardCheck,
  FaImage,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
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

const maxComplaintPhotos = 5;
const maxComplaintPhotoSizeBytes = 5 * 1024 * 1024;
const allowedComplaintPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const formatFileSize = (sizeInBytes = 0) => {
  if (!sizeInBytes) {
    return "0 KB";
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
};

const getComplaintAttachments = (complaint) =>
  Array.isArray(complaint?.attachments) ? complaint.attachments : [];

function Complaints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const { role } = user || {};
  const [complaints, setComplaints] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [lightboxState, setLightboxState] = useState({
    complaintTitle: "",
    attachments: [],
    index: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const isAdmin = role === "admin";
  const isResident = role === "resident";
  const isServiceProvider = role === "service_provider";

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedPhotos([]);
    setPhotoPreviews([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFilters = () => {
    setSearchTerm(initialComplaintFilters.searchTerm);
    setCategoryFilter(initialComplaintFilters.categoryFilter);
    setPriorityFilter(initialComplaintFilters.priorityFilter);
    setStatusFilter(initialComplaintFilters.statusFilter);
  };

  const fetchPageData = async () => {
    try {
      setLoadError("");

      const [complaintsResponse, providersResponse] = await Promise.all([
        api.get("/api/complaints"),
        api.get("/api/service-providers"),
      ]);

      setComplaints(complaintsResponse.data.data || []);
      setProviders(providersResponse.data.data || []);
    } catch (err) {
      setLoadError(
        err.response?.data?.message || "Failed to load complaints."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  useEffect(() => {
    const previews = selectedPhotos.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotoPreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedPhotos]);

  const activeLightboxAttachments = lightboxState.attachments || [];
  const activeLightboxAttachment =
    activeLightboxAttachments[lightboxState.index] || null;

  useEffect(() => {
    if (!activeLightboxAttachment) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightboxState({
          complaintTitle: "",
          attachments: [],
          index: 0,
        });
        return;
      }

      if (event.key === "ArrowRight" && activeLightboxAttachments.length > 1) {
        setLightboxState((currentState) => ({
          ...currentState,
          index: (currentState.index + 1) % currentState.attachments.length,
        }));
      }

      if (event.key === "ArrowLeft" && activeLightboxAttachments.length > 1) {
        setLightboxState((currentState) => ({
          ...currentState,
          index:
            (currentState.index - 1 + currentState.attachments.length) %
            currentState.attachments.length,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLightboxAttachment, activeLightboxAttachments.length]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const validateSelectedPhotos = (files) => {
    if (!files.length) {
      return "";
    }

    if (selectedPhotos.length + files.length > maxComplaintPhotos) {
      return "You can attach up to 5 complaint photos.";
    }

    for (const file of files) {
      if (!file.size) {
        return "One of the selected files is empty.";
      }

      if (!allowedComplaintPhotoTypes.has(file.type)) {
        return "Only JPG, PNG, and WebP images can be attached.";
      }

      if (file.size > maxComplaintPhotoSizeBytes) {
        return "Each complaint photo must be 5 MB or smaller.";
      }
    }

    return "";
  };

  const handlePhotoSelection = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const validationMessage = validateSelectedPhotos(files);

    if (validationMessage) {
      setFormError(validationMessage);
      event.target.value = "";
      return;
    }

    setFormError("");
    setSelectedPhotos((currentPhotos) => [...currentPhotos, ...files]);
    event.target.value = "";
  };

  const handleRemoveSelectedPhoto = (photoIndex) => {
    setSelectedPhotos((currentPhotos) =>
      currentPhotos.filter((_, index) => index !== photoIndex)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      if (isResident) {
        const payload = new FormData();
        payload.append("title", formData.title);
        payload.append("category", formData.category);
        payload.append("description", formData.description);
        payload.append("priority", formData.priority);

        selectedPhotos.forEach((photo) => {
          payload.append("photos", photo);
        });

        await api.post("/api/complaints", payload);
      } else {
        await api.post("/api/complaints", { ...formData });
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to create complaint."
      );
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

  const openAttachmentLightbox = (complaint, startingIndex = 0) => {
    const attachments = getComplaintAttachments(complaint);

    if (!attachments.length) {
      return;
    }

    setLightboxState({
      complaintTitle: complaint.title || "Complaint photo",
      attachments,
      index: startingIndex,
    });
  };

  const closeAttachmentLightbox = () => {
    setLightboxState({
      complaintTitle: "",
      attachments: [],
      index: 0,
    });
  };

  const goToPreviousLightboxImage = () => {
    setLightboxState((currentState) => ({
      ...currentState,
      index:
        (currentState.index - 1 + currentState.attachments.length) %
        currentState.attachments.length,
    }));
  };

  const goToNextLightboxImage = () => {
    setLightboxState((currentState) => ({
      ...currentState,
      index: (currentState.index + 1) % currentState.attachments.length,
    }));
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

  const complaintsTableHeadings = useMemo(
    () => [
      "Title",
      "Description",
      "Service Provider",
      "Category",
      "Priority",
      "Status",
      "Photos",
      ...(isAdmin ? ["Actions"] : []),
    ],
    [isAdmin]
  );

  if (loading) {
    return <p>Loading complaints...</p>;
  }

  return (
    <section className="complaints-page">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Complaints</h1>
        <p style={{ color: "#6b7a90" }}>
          Log complaints, assign service providers, and monitor resolution
          status.
        </p>
      </div>

      {loadError ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{loadError}</p>
      ) : null}

      {formError ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{formError}</p>
      ) : null}

      {isAdmin ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          Review complaints, inspect attached photos, and create linked tasks
          for service providers when action is required.
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
        <form onSubmit={handleSubmit} className="complaint-form">
          <div className="complaint-form-grid">
            <div className="complaint-form-note">
              <p>
                Submit the issue and the Estate Manager will review it and
                assign the appropriate service provider.
              </p>
            </div>

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
                htmlFor="category"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
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
                required
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div
              style={{ gridColumn: "1 / -1" }}
              className="complaint-photo-picker"
            >
              <div className="complaint-photo-picker-header">
                <div>
                  <label
                    htmlFor="complaintPhotos"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                    }}
                  >
                    Attach photos
                  </label>
                  <p className="complaint-photo-picker-hint">
                    Up to 5 JPG, PNG, or WebP images. Maximum 5 MB each.
                  </p>
                </div>
                <span className="complaint-photo-count">
                  {selectedPhotos.length}/{maxComplaintPhotos}
                </span>
              </div>

              <input
                ref={fileInputRef}
                id="complaintPhotos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelection}
                className="complaint-photo-input"
              />
            </div>

            {photoPreviews.length ? (
              <div
                style={{ gridColumn: "1 / -1" }}
                className="complaint-selected-photo-grid"
              >
                {photoPreviews.map((preview, index) => (
                  <article
                    key={preview.key}
                    className="complaint-selected-photo-card"
                  >
                    <img
                      src={preview.url}
                      alt={`Selected complaint photo ${index + 1}`}
                      className="complaint-selected-photo-image"
                    />
                    <div className="complaint-selected-photo-meta">
                      <strong>{preview.file.name}</strong>
                      <span>{formatFileSize(preview.file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedPhoto(index)}
                      className="complaint-selected-photo-remove"
                    >
                      <FaTrash />
                      <span>Remove</span>
                    </button>
                  </article>
                ))}
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
                {submitting ? "Creating..." : "Create Complaint"}
              </button>
            </div>
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
              {complaintsTableHeadings.map((heading) => (
                <th
                  key={heading}
                  className={heading === "Photos" ? "complaint-photos-column" : undefined}
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
              filteredComplaints.map((complaint) => {
                const attachments = getComplaintAttachments(complaint);

                return (
                  <tr key={complaint._id}>
                    <td style={cellStyle}>{complaint.title}</td>
                    <td style={cellStyle}>{complaint.description}</td>
                    <td style={cellStyle}>
                      {complaint.serviceProvider?.companyName || "-"}
                    </td>
                    <td style={cellStyle}>{complaint.category}</td>
                    <td style={cellStyle}>{complaint.priority}</td>
                    <td style={cellStyle}>{complaint.status}</td>
                    <td style={cellStyle} className="complaint-attachment-cell">
                      {attachments.length ? (
                        <div className="complaint-attachment-stack">
                          <div className="complaint-attachment-thumb-row">
                            {attachments.slice(0, 3).map((attachment, index) => (
                              <button
                                key={`${complaint._id}-attachment-${index}`}
                                type="button"
                                className="complaint-attachment-thumb"
                                onClick={() =>
                                  openAttachmentLightbox(complaint, index)
                                }
                              >
                                <img
                                  src={attachment.url}
                                  alt={`${complaint.title} photo ${index + 1}`}
                                />
                              </button>
                            ))}
                            {attachments.length > 3 ? (
                              <span className="complaint-attachment-more">
                                +{attachments.length - 3}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="complaint-attachment-trigger"
                            onClick={() => openAttachmentLightbox(complaint, 0)}
                          >
                            <FaImage />
                            <span>
                              {attachments.length === 1
                                ? "View photo"
                                : `View ${attachments.length} photos`}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="complaint-attachment-empty">-</span>
                      )}
                    </td>
                    {isAdmin ? (
                      <td style={cellStyle}>
                        <button
                          type="button"
                          onClick={() => handleCreateTask(complaint._id)}
                          style={actionButtonStyle}
                        >
                          <span
                            style={{ display: "inline-flex", marginRight: "8px" }}
                          >
                            <FaClipboardCheck />
                          </span>
                          Create Task
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
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
                  {complaints.length === 0
                    ? "No complaints have been recorded yet."
                    : "No complaints match your current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeLightboxAttachment ? (
        <div
          className="complaint-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Complaint photo preview"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAttachmentLightbox();
            }
          }}
        >
          <div className="complaint-photo-lightbox-dialog">
            <button
              type="button"
              className="complaint-photo-lightbox-close"
              onClick={closeAttachmentLightbox}
            >
              <FaXmark />
              <span>Close</span>
            </button>

            <div className="complaint-photo-lightbox-header">
              <div>
                <p className="complaint-photo-lightbox-label">
                  Complaint photo
                </p>
                <h2>{lightboxState.complaintTitle || "Complaint"}</h2>
              </div>
              <span className="complaint-photo-lightbox-count">
                {lightboxState.index + 1} of {activeLightboxAttachments.length}
              </span>
            </div>

            <div className="complaint-photo-lightbox-stage">
              {activeLightboxAttachments.length > 1 ? (
                <button
                  type="button"
                  className="complaint-photo-lightbox-nav"
                  onClick={goToPreviousLightboxImage}
                  aria-label="View previous complaint photo"
                >
                  <FaChevronLeft />
                </button>
              ) : null}

              <img
                src={activeLightboxAttachment.url}
                alt={`${lightboxState.complaintTitle} photo ${
                  lightboxState.index + 1
                }`}
                className="complaint-photo-lightbox-image"
              />

              {activeLightboxAttachments.length > 1 ? (
                <button
                  type="button"
                  className="complaint-photo-lightbox-nav"
                  onClick={goToNextLightboxImage}
                  aria-label="View next complaint photo"
                >
                  <FaChevronRight />
                </button>
              ) : null}
            </div>

            <div className="complaint-photo-lightbox-footer">
              <span>{activeLightboxAttachment.originalName || "Complaint image"}</span>
              <span>{formatFileSize(activeLightboxAttachment.size)}</span>
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
