import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRotateLeft,
  FaBroom,
  FaCheck,
  FaCircleCheck,
  FaClipboardQuestion,
  FaPhone,
  FaPenToSquare,
  FaShieldHalved,
  FaScrewdriverWrench,
  FaTrash,
  FaTruck,
  FaUsersGear,
  FaWrench,
} from "react-icons/fa6";
import { Link } from "react-router-dom";
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

const initialProviderFilters = {
  searchTerm: "",
  categoryFilter: "",
  statusFilter: "",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

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
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProviderId("");
  };

  const clearFilters = () => {
    setSearchTerm(initialProviderFilters.searchTerm);
    setCategoryFilter(initialProviderFilters.categoryFilter);
    setStatusFilter(initialProviderFilters.statusFilter);
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

  const roleScopedProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (isAdmin) {
          return true;
        }

        if (isResident) {
          return provider.verificationStatus === "approved";
        }

        if (isServiceProvider) {
          return (
            provider.email &&
            user?.email &&
            provider.email.toLowerCase() === user.email.toLowerCase()
          );
        }

        return false;
      }),
    [isAdmin, isResident, isServiceProvider, providers, user?.email]
  );

  const filteredProviders = useMemo(
    () =>
      roleScopedProviders.filter((provider) => {
        const searchValue = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !searchValue ||
          provider.companyName?.toLowerCase().includes(searchValue) ||
          provider.contactPerson?.toLowerCase().includes(searchValue) ||
          provider.serviceCategory?.toLowerCase().includes(searchValue) ||
          provider.phone?.toLowerCase().includes(searchValue) ||
          ((isAdmin || isServiceProvider) &&
            provider.email?.toLowerCase().includes(searchValue));

        const matchesCategory =
          !categoryFilter || provider.serviceCategory === categoryFilter;
        const matchesStatus =
          !statusFilter ||
          (!isResident && provider.verificationStatus === statusFilter);

        return matchesSearch && matchesCategory && matchesStatus;
      }),
    [
      categoryFilter,
      isAdmin,
      isResident,
      isServiceProvider,
      roleScopedProviders,
      searchTerm,
      statusFilter,
    ]
  );

  const summaryCounts = useMemo(
    () => ({
      total: providers.length,
      pending: providers.filter(
        (provider) => provider.verificationStatus === "pending"
      ).length,
      approved: providers.filter(
        (provider) => provider.verificationStatus === "approved"
      ).length,
      rejected: providers.filter(
        (provider) => provider.verificationStatus === "rejected"
      ).length,
    }),
    [providers]
  );

  const hasActiveFilters =
    searchTerm.trim() !== initialProviderFilters.searchTerm ||
    categoryFilter !== initialProviderFilters.categoryFilter ||
    statusFilter !== initialProviderFilters.statusFilter;

  const residentResultsText = useMemo(() => {
    if (!isResident) {
      return "";
    }

    if (filteredProviders.length === roleScopedProviders.length) {
      return `${filteredProviders.length} approved provider${
        filteredProviders.length === 1 ? "" : "s"
      } available`;
    }

    return `Showing ${filteredProviders.length} of ${roleScopedProviders.length} approved providers`;
  }, [filteredProviders.length, isResident, roleScopedProviders.length]);

  if (loading) {
    return <p>Loading service providers...</p>;
  }

  return (
    <section
      className={`service-providers-page${
        isResident ? " resident-provider-directory" : ""
      }`}
    >
      <div className={isResident ? "providers-header resident-provider-header" : "providers-header"}>
        <h1>{isResident ? "Find Estate Services" : "Service Providers"}</h1>
        <p>
          {isResident
            ? "Browse approved professionals available to support your home and estate needs."
            : "Manage provider registrations, verification status, service categories, and contact information."}
        </p>
      </div>

      {error ? <p className="providers-error">{error}</p> : null}

      {editingProviderId ? (
        <p className="providers-note">
          You are editing an existing service provider.
        </p>
      ) : null}

      {!isAdmin && !isResident ? (
        <p className="providers-note">You have view-only access on this page.</p>
      ) : null}

      {isServiceProvider ? (
        <p className="providers-note">Showing your provider profile only.</p>
      ) : null}

      {isResident ? (
        <section className="resident-provider-intro">
          <div className="resident-provider-intro-copy">
            <p className="resident-provider-intro-kicker">
              Trusted services for your estate
            </p>
            <h2>Find approved support for everyday estate needs.</h2>
            <p>
              Find approved providers for cleaning, security, electrical work,
              plumbing, maintenance, and other estate services.
            </p>
          </div>
          <div className="resident-provider-intro-actions">
            <div className="resident-provider-trust-message">
              <FaCircleCheck />
              <span>
                Every provider listed here has been reviewed and approved by the
                Estate Manager.
              </span>
            </div>
            <p className="resident-provider-guidance">
              Need help with an issue in your apartment or shared area? Submit a
              complaint and the Estate Manager will assign the appropriate
              provider.
            </p>
            <Link
              to="/complaints"
              className="resident-provider-primary-action resident-provider-action resident-provider-report-action"
            >
              <FaClipboardQuestion />
              <span>Report an Issue</span>
            </Link>
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <div className="provider-summary-grid">
          <article className="provider-summary-card provider-summary-neutral">
            <span className="provider-summary-label">Total Providers</span>
            <strong className="provider-summary-value">{summaryCounts.total}</strong>
          </article>
          <article className="provider-summary-card provider-summary-warning">
            <span className="provider-summary-label">Pending Approval</span>
            <strong className="provider-summary-value">{summaryCounts.pending}</strong>
          </article>
          <article className="provider-summary-card provider-summary-success">
            <span className="provider-summary-label">Approved</span>
            <strong className="provider-summary-value">{summaryCounts.approved}</strong>
          </article>
          <article className="provider-summary-card provider-summary-danger">
            <span className="provider-summary-label">Rejected</span>
            <strong className="provider-summary-value">{summaryCounts.rejected}</strong>
          </article>
        </div>
      ) : null}

      <div
        className={`provider-toolbar${
          isResident ? " resident-provider-toolbar" : ""
        }`}
      >
        {isResident ? (
          <div className="resident-provider-toolbar-heading">
            <h2>Find a service</h2>
            <p>{residentResultsText}</p>
          </div>
        ) : null}

        <div className="provider-toolbar-group provider-toolbar-search">
          <label className="provider-toolbar-label" htmlFor="providerSearch">
            {isResident ? "Search services" : "Search"}
          </label>
          <input
            id="providerSearch"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={
              isResident
                ? "Search by company, service, or contact name"
                : isAdmin || isServiceProvider
                ? "Search company, contact, email, phone, or category"
                : "Search company, contact, phone, or category"
            }
            className="provider-toolbar-control"
          />
        </div>

        <div className="provider-toolbar-group">
          <label className="provider-toolbar-label" htmlFor="categoryFilter">
            {isResident ? "Service type" : "Service Category"}
          </label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="provider-toolbar-control"
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

        {!isResident ? (
          <div className="provider-toolbar-group">
            <label className="provider-toolbar-label" htmlFor="statusFilter">
              Verification Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="provider-toolbar-control"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        ) : null}

        <div className="provider-toolbar-actions">
          <button
            type="button"
            onClick={clearFilters}
            className="clear-filters-button"
            disabled={!hasActiveFilters}
          >
            <FaArrowRotateLeft />
            <span>Clear Filters</span>
          </button>
          {!isResident ? (
            <span className="filter-results-count">
              Showing {filteredProviders.length} of {roleScopedProviders.length} service
              providers
            </span>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <section className="provider-form-card">
          <div className="provider-form-header">
            <h2>{editingProviderId ? "Edit Service Provider" : "Add Service Provider"}</h2>
            <p>
              Capture provider contact details, service category, and verification
              status.
            </p>
          </div>

          <form className="provider-form" onSubmit={handleSubmit}>
            <div className="provider-form-grid">
              <div className="provider-form-field provider-form-group">
                <label htmlFor="companyName">Company Name</label>
                <input
                  className="provider-form-control"
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="provider-form-field provider-form-group">
                <label htmlFor="contactPerson">Contact Person</label>
                <input
                  className="provider-form-control"
                  id="contactPerson"
                  name="contactPerson"
                  type="text"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="provider-form-field provider-form-group">
                <label htmlFor="email">Email</label>
                <input
                  className="provider-form-control"
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="provider-form-field provider-form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  className="provider-form-control"
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="provider-form-field provider-form-group">
                <label htmlFor="serviceCategory">Service Category</label>
                <select
                  className="provider-form-control"
                  id="serviceCategory"
                  name="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={handleChange}
                  required
                >
                  <option value="security">Security</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="waste_management">Waste Management</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="provider-form-field provider-form-group">
                <label htmlFor="verificationStatus">Verification Status</label>
                <select
                  className="provider-form-control"
                  id="verificationStatus"
                  name="verificationStatus"
                  value={formData.verificationStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="provider-form-field provider-form-field-full provider-form-group provider-address-group">
                <label htmlFor="address">Address</label>
                <input
                  className="provider-form-control"
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="provider-form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="provider-submit-button"
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
                  className="provider-secondary-button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {isAdmin ? (
        <div className="provider-table-wrapper">
          {filteredProviders.length > 0 ? (
            <>
              <div className="provider-table-scroll">
                <table className="provider-table">
                  <thead>
                    <tr>
                      <th className="provider-company-cell">Company</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Category</th>
                      <th className="provider-address-cell">Address</th>
                      <th className="provider-email-cell">Email</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th className="provider-actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.map((provider) => (
                      <tr key={provider._id}>
                        <td
                          className="provider-company-cell"
                          title={provider.companyName || "-"}
                        >
                          <span className="provider-cell-strong">
                            {provider.companyName}
                          </span>
                        </td>
                        <td>{provider.contactPerson}</td>
                        <td>{provider.phone}</td>
                        <td>{formatProviderText(provider.serviceCategory)}</td>
                        <td
                          className="provider-address-cell"
                          title={provider.address || "-"}
                        >
                          <span className="provider-clamp provider-clamp-address">
                            {provider.address || "-"}
                          </span>
                        </td>
                        <td
                          className="provider-email-cell"
                          title={provider.email || "-"}
                        >
                          <span className="provider-clamp provider-clamp-email">
                            {provider.email || "-"}
                          </span>
                        </td>
                        <td>
                          {provider.createdAt
                            ? dateFormatter.format(new Date(provider.createdAt))
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`provider-status-badge provider-status-${provider.verificationStatus}`}
                          >
                            {formatProviderText(provider.verificationStatus)}
                          </span>
                        </td>
                        <td className="provider-actions-cell">
                          <div className="provider-action-row">
                            <button
                              type="button"
                              onClick={() => handleEdit(provider)}
                              className="provider-action-button"
                            >
                              <FaPenToSquare />
                              <span>Edit</span>
                            </button>

                            {provider.verificationStatus !== "approved" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerificationUpdate(provider._id, "approved")
                                }
                                className="provider-action-button provider-action-approve"
                              >
                                <FaCheck />
                                <span>Approve</span>
                              </button>
                            ) : null}

                            {provider.verificationStatus !== "rejected" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerificationUpdate(provider._id, "rejected")
                                }
                                className="provider-action-button provider-action-reject"
                              >
                                <span>Reject</span>
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDelete(provider._id)}
                              className="provider-action-button provider-action-delete"
                            >
                              <FaTrash />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="provider-mobile-list">
                {filteredProviders.map((provider) => (
                  <article key={provider._id} className="provider-mobile-card">
                    <div className="provider-mobile-card-top">
                      <div>
                        <h3>{provider.companyName}</h3>
                        <p>{provider.contactPerson}</p>
                      </div>
                      <span
                        className={`provider-status-badge provider-status-${provider.verificationStatus}`}
                      >
                        {formatProviderText(provider.verificationStatus)}
                      </span>
                    </div>

                    <div className="provider-mobile-meta">
                      <span>Phone: {provider.phone}</span>
                      <span>Category: {formatProviderText(provider.serviceCategory)}</span>
                      <span title={provider.email || "-"}>Email: {provider.email || "-"}</span>
                      <span title={provider.address || "-"}>Address: {provider.address || "-"}</span>
                      <span>
                        Registered:{" "}
                        {provider.createdAt
                          ? dateFormatter.format(new Date(provider.createdAt))
                          : "-"}
                      </span>
                    </div>

                    <div className="provider-action-row">
                      <button
                        type="button"
                        onClick={() => handleEdit(provider)}
                        className="provider-action-button"
                      >
                        <FaPenToSquare />
                        <span>Edit</span>
                      </button>

                      {provider.verificationStatus !== "approved" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleVerificationUpdate(provider._id, "approved")
                          }
                          className="provider-action-button provider-action-approve"
                        >
                          <FaCheck />
                          <span>Approve</span>
                        </button>
                      ) : null}

                      {provider.verificationStatus !== "rejected" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleVerificationUpdate(provider._id, "rejected")
                          }
                          className="provider-action-button provider-action-reject"
                        >
                          <span>Reject</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDelete(provider._id)}
                        className="provider-action-button provider-action-delete"
                      >
                        <FaTrash />
                        <span>Delete</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="providers-empty-state">
              <h3>
                {providers.length === 0
                  ? "No service providers have been added yet."
                  : "No providers match your current filters."}
              </h3>
              <p>
                {providers.length === 0
                  ? "Create the first service provider record to begin tracking approvals and assignments."
                  : "Try adjusting the search term or filters to view more providers."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {filteredProviders.length > 0 ? (
            <div className={isResident ? "resident-provider-grid" : "provider-public-grid"}>
              {filteredProviders.map((provider) => (
                isResident ? (
                  <article key={provider._id} className="resident-provider-card">
                    <div className="resident-provider-card-header">
                      <div className="resident-provider-card-identity">
                        <span className="resident-provider-service-icon">
                          {getResidentServiceIcon(provider.serviceCategory)}
                        </span>
                        <div>
                          <h3>{provider.companyName}</h3>
                          <p className="resident-provider-service">
                            {formatResidentServiceLabel(provider.serviceCategory)}
                          </p>
                        </div>
                      </div>
                      <span className="resident-provider-approved-badge">
                        <FaCircleCheck />
                        <span>Estate Approved</span>
                      </span>
                    </div>

                    <div className="resident-provider-contact-grid">
                      <div className="resident-provider-detail">
                        <span className="resident-provider-detail-label">
                          Contact
                        </span>
                        <strong>
                          {provider.contactPerson || "Estate service team"}
                        </strong>
                      </div>
                      <div className="resident-provider-detail">
                        <span className="resident-provider-detail-label">
                          Phone
                        </span>
                        <strong>{provider.phone || "Phone not provided"}</strong>
                      </div>
                      <div className="resident-provider-detail resident-provider-detail-full">
                        <span className="resident-provider-detail-label">
                          Location
                        </span>
                        <strong>{provider.address || "Address not provided"}</strong>
                      </div>
                    </div>

                    <div className="resident-provider-actions">
                    {(() => {
                      const dialablePhone = getDialablePhone(provider.phone);

                      return dialablePhone ? (
                        <a
                          href={`tel:${dialablePhone}`}
                          className="resident-provider-call-link resident-provider-action resident-provider-call-action"
                          aria-label={`Call ${provider.companyName}`}
                        >
                          <FaPhone />
                          <span>Call Provider</span>
                        </a>
                      ) : (
                        <span className="resident-provider-call-link resident-provider-call-link-disabled">
                          <FaPhone />
                          <span>Phone unavailable</span>
                        </span>
                      );
                    })()}
                      <Link
                        to="/complaints"
                        className="resident-provider-secondary-action resident-provider-action resident-provider-report-action"
                      >
                        <FaClipboardQuestion />
                        <span>Report an Issue</span>
                      </Link>
                    </div>
                  </article>
                ) : (
                  <article key={provider._id} className="provider-public-card">
                    <div className="provider-public-card-top">
                      <div>
                        <h3>{provider.companyName}</h3>
                        <p>{provider.contactPerson}</p>
                      </div>
                      <span
                        className={`provider-status-badge provider-status-${provider.verificationStatus}`}
                      >
                        {formatProviderText(provider.verificationStatus)}
                      </span>
                    </div>
                    <div className="provider-public-meta">
                      <span>Category: {formatProviderText(provider.serviceCategory)}</span>
                      <span>Phone: {provider.phone}</span>
                      {provider.address && isServiceProvider ? (
                        <span title={provider.address}>Address: {provider.address}</span>
                      ) : null}
                      {(isServiceProvider || isAdmin) && provider.email ? (
                        <span title={provider.email}>Email: {provider.email}</span>
                      ) : null}
                      {provider.createdAt && isServiceProvider ? (
                        <span>
                          Registered: {dateFormatter.format(new Date(provider.createdAt))}
                        </span>
                      ) : null}
                    </div>
                  </article>
                )
              ))}
            </div>
          ) : (
            <div className={isResident ? "resident-provider-empty" : "providers-empty-state"}>
              <h3>
                {isResident
                  ? "No approved service providers are currently available."
                  : "No providers match your current filters."}
              </h3>
              <p>
                {isResident
                  ? "You can still report an issue, and the Estate Manager will review it."
                  : "Try adjusting the search term or filters to view your provider profile."}
              </p>
              {isResident ? (
                <Link
                  to="/complaints"
                  className="resident-provider-secondary-action resident-provider-action resident-provider-report-action"
                >
                  <FaClipboardQuestion />
                  <span>Report an Issue</span>
                </Link>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatProviderText(value) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default ServiceProviders;

function getResidentServiceIcon(serviceCategory) {
  switch (serviceCategory) {
    case "cleaning":
      return <FaBroom />;
    case "security":
      return <FaShieldHalved />;
    case "maintenance":
      return <FaScrewdriverWrench />;
    case "waste_management":
      return <FaTruck />;
    case "landscaping":
      return <FaWrench />;
    default:
      return <FaUsersGear />;
  }
}

function formatResidentServiceLabel(serviceCategory) {
  switch (serviceCategory) {
    case "cleaning":
      return "Cleaning Services";
    case "security":
      return "Security Services";
    case "maintenance":
      return "Maintenance Services";
    case "waste_management":
      return "Waste Management";
    case "landscaping":
      return "Landscaping";
    default:
      return formatProviderText(serviceCategory);
  }
}

function getDialablePhone(phone = "") {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return "";
  }

  const hasPlusPrefix = trimmedPhone.startsWith("+");
  const digitsOnly = trimmedPhone.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
}
