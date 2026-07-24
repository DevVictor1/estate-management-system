import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialFormData = {
  serviceProvider: "",
  contractTitle: "",
  startDate: "",
  endDate: "",
  paymentTerms: "",
  contractValue: "",
  status: "active",
  notes: "",
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatContractDate = (value) => {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
};

const formatContractStatusLabel = (status) => {
  if (!status) {
    return "-";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getContractStatusTone = (status) => {
  if (status === "active") {
    return "success";
  }

  if (status === "terminated") {
    return "danger";
  }

  return "warning";
};

function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingContractId, setEditingContractId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const isServiceProvider = user?.role === "service_provider";

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || "",
    });
    setEditingContractId("");
  };

  const fetchPageData = async () => {
    try {
      setError("");

      const [contractsResponse, providersResponse] = await Promise.all([
        api.get("/api/contracts"),
        api.get("/api/service-providers"),
      ]);

      const fetchedContracts = contractsResponse.data.data || [];
      const fetchedProviders = providersResponse.data.data || [];

      setContracts(fetchedContracts);
      setProviders(fetchedProviders);
      setFormData((currentFormData) => ({
        ...currentFormData,
        serviceProvider:
          currentFormData.serviceProvider || fetchedProviders[0]?._id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load contracts.");
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

  const handleEdit = (contract) => {
    setError("");
    setEditingContractId(contract._id);
    setFormData({
      serviceProvider: contract.serviceProvider?._id || "",
      contractTitle: contract.contractTitle || "",
      startDate: contract.startDate
        ? new Date(contract.startDate).toISOString().split("T")[0]
        : "",
      endDate: contract.endDate
        ? new Date(contract.endDate).toISOString().split("T")[0]
        : "",
      paymentTerms: contract.paymentTerms || "",
      contractValue: contract.contractValue ?? "",
      status: contract.status || "active",
      notes: contract.notes || "",
    });
  };

  const handleDelete = async (contractId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contract?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await api.delete(`/api/contracts/${contractId}`);

      if (editingContractId === contractId) {
        resetForm();
      }

      await fetchPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete contract.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...formData,
        contractValue: Number(formData.contractValue) || 0,
      };

      if (editingContractId) {
        await api.put(`/api/contracts/${editingContractId}`, payload);
      } else {
        await api.post("/api/contracts", payload);
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingContractId ? "update" : "create"} contract.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      contract.contractTitle?.toLowerCase().includes(searchValue) ||
      contract.serviceProvider?.companyName?.toLowerCase().includes(searchValue) ||
      contract.paymentTerms?.toLowerCase().includes(searchValue) ||
      contract.notes?.toLowerCase().includes(searchValue);

    const matchesStatus = !statusFilter || contract.status === statusFilter;

    const contractStartDate = contract.startDate
      ? new Date(contract.startDate).toISOString().split("T")[0]
      : "";
    const contractEndDate = contract.endDate
      ? new Date(contract.endDate).toISOString().split("T")[0]
      : "";

    const matchesStartDate =
      !startDateFilter || (contractStartDate && contractStartDate >= startDateFilter);
    const matchesEndDate =
      !endDateFilter || (contractEndDate && contractEndDate <= endDateFilter);

    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const normalizedUserEmail = user?.email?.trim().toLowerCase();

  const providerContracts = contracts.filter(
    (contract) =>
      contract.serviceProvider?.email?.trim().toLowerCase() ===
      normalizedUserEmail
  );

  const sortedProviderContracts = [...providerContracts]
    .sort((firstContract, secondContract) => {
      const firstIsActive = firstContract.status === "active" ? 1 : 0;
      const secondIsActive = secondContract.status === "active" ? 1 : 0;

      if (firstIsActive !== secondIsActive) {
        return secondIsActive - firstIsActive;
      }

      const firstStartDate = firstContract.startDate
        ? new Date(firstContract.startDate).getTime()
        : 0;
      const secondStartDate = secondContract.startDate
        ? new Date(secondContract.startDate).getTime()
        : 0;

      return secondStartDate - firstStartDate;
    });

  const currentContract = sortedProviderContracts.at(0);
  const previousContracts = currentContract
    ? sortedProviderContracts.filter(
        (contract) => contract._id !== currentContract._id
      )
    : [];

  if (loading) {
    return <p>Loading contracts...</p>;
  }

  if (isServiceProvider) {
    return (
      <section className="dashboard-page provider-contract-page">
        <div className="dashboard-hero">
          <div>
            <p className="dashboard-eyebrow">Provider Agreement</p>
            <h1>My Contract</h1>
            <p className="dashboard-subtitle">
              Review the contract currently associated with your service
              provider account.
            </p>
          </div>
        </div>

        {error ? <p style={{ color: "#c1121f" }}>{error}</p> : null}

        {!currentContract ? (
          <section className="dashboard-section-card provider-contract-empty">
            <div className="dashboard-section-header">
              <div>
                <h2>No Contract Found</h2>
                <p>
                  You have not yet been assigned a contract. Please contact the
                  Estate Manager if you believe this is an error.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="dashboard-section-card provider-contract-banner">
              <p>
                This contract is managed by the Estate Manager and is provided
                for your reference only.
              </p>
            </section>

            <section className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2>Current Contract</h2>
                  <p>
                    Your current contract is selected by preferring active
                    agreements, then falling back to the newest contract by
                    start date.
                  </p>
                </div>
              </div>

              <article className="provider-contract-card">
                <div className="provider-contract-card-header">
                  <div>
                    <p className="provider-contract-card-kicker">
                      Current Contract
                    </p>
                    <h3 className="provider-contract-title">
                      {currentContract.contractTitle}
                    </h3>
                  </div>
                  <span
                    className={`provider-contract-status provider-contract-status-${getContractStatusTone(
                      currentContract.status
                    )}`}
                  >
                    {formatContractStatusLabel(currentContract.status)}
                  </span>
                </div>

                <div className="provider-contract-grid">
                  <div className="provider-contract-field">
                    <span className="provider-contract-label">
                      Service Provider / Company Name
                    </span>
                    <strong className="provider-contract-value">
                      {currentContract.serviceProvider?.companyName || "-"}
                    </strong>
                  </div>

                  <div className="provider-contract-field">
                    <span className="provider-contract-label">
                      Service Category
                    </span>
                    <strong className="provider-contract-value">
                      {currentContract.serviceProvider?.serviceCategory || "-"}
                    </strong>
                  </div>

                  <div className="provider-contract-field provider-contract-field-full">
                    <span className="provider-contract-label">
                      Contract Period
                    </span>
                    <div className="provider-contract-period">
                      <div className="provider-contract-period-item">
                        <span className="provider-contract-period-label">
                          Start Date
                        </span>
                        <strong className="provider-contract-value">
                          {formatContractDate(currentContract.startDate)}
                        </strong>
                      </div>
                      <div className="provider-contract-period-item">
                        <span className="provider-contract-period-label">
                          End Date
                        </span>
                        <strong className="provider-contract-value">
                          {formatContractDate(currentContract.endDate)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="provider-contract-field">
                    <span className="provider-contract-label">
                      Payment Terms
                    </span>
                    <strong className="provider-contract-value">
                      {currentContract.paymentTerms || "-"}
                    </strong>
                  </div>

                  <div className="provider-contract-field">
                    <span className="provider-contract-label">
                      Contract Value
                    </span>
                    <strong className="provider-contract-value provider-contract-value-currency">
                      {currencyFormatter.format(currentContract.contractValue || 0)}
                    </strong>
                  </div>

                  <div className="provider-contract-field provider-contract-field-full">
                    <span className="provider-contract-label">
                      Notes / Scope of Work
                    </span>
                    <p className="provider-contract-notes">
                      {currentContract.notes ||
                        "No additional notes or scope of work details were provided."}
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <section className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2>Previous Contracts</h2>
                  <p>
                    Earlier contract records linked to your provider account are
                    shown below.
                  </p>
                </div>
              </div>

              {previousContracts.length > 0 ? (
                <div className="provider-contract-history-list">
                  {previousContracts.map((contract) => (
                    <article
                      key={contract._id}
                      className="provider-contract-history-card"
                    >
                      <div className="provider-contract-history-header">
                        <div>
                          <h3 className="provider-contract-history-title">
                            {contract.contractTitle}
                          </h3>
                          <p className="provider-contract-history-period">
                            {formatContractDate(contract.startDate)} to{" "}
                            {formatContractDate(contract.endDate)}
                          </p>
                        </div>
                        <span
                          className={`provider-contract-status provider-contract-status-${getContractStatusTone(
                            contract.status
                          )}`}
                        >
                          {formatContractStatusLabel(contract.status)}
                        </span>
                      </div>

                      <div className="provider-contract-history-meta">
                        <div className="provider-contract-history-item">
                          <span className="provider-contract-label">
                            Contract Value
                          </span>
                          <strong className="provider-contract-value">
                            {currencyFormatter.format(contract.contractValue || 0)}
                          </strong>
                        </div>
                        <div className="provider-contract-history-item">
                          <span className="provider-contract-label">
                            Status
                          </span>
                          <strong className="provider-contract-value">
                            {formatContractStatusLabel(contract.status)}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="provider-contract-empty-message">
                  No previous contracts.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    );
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Contracts</h1>
        <p style={{ color: "#6b7a90" }}>
          Create and track service provider contracts across the estate.
        </p>
      </div>

      {error ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
      ) : null}

      {editingContractId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing contract.
        </p>
      ) : null}

      {!isAdmin ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
          You have view-only access on this page.
        </p>
      ) : null}

      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <label className="filter-label" htmlFor="contractSearch">
              Search Contracts
            </label>
            <input
              id="contractSearch"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, provider, terms, or notes"
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="contractStatusFilter">
              Status
            </label>
            <select
              id="contractStatusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="pending_renewal">Pending Renewal</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="contractStartDateFilter">
              Start Date From
            </label>
            <input
              id="contractStartDateFilter"
              type="date"
              value={startDateFilter}
              onChange={(event) => setStartDateFilter(event.target.value)}
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="contractEndDateFilter">
              End Date To
            </label>
            <input
              id="contractEndDateFilter"
              type="date"
              value={endDateFilter}
              onChange={(event) => setEndDateFilter(event.target.value)}
              className="filter-control"
            />
          </div>
        </div>
      </div>

      <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
        Showing {filteredContracts.length} of {contracts.length} contracts
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
            htmlFor="contractTitle"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Contract Title
          </label>
          <input
            id="contractTitle"
            name="contractTitle"
            type="text"
            value={formData.contractTitle}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="startDate"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="endDate"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            End Date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="paymentTerms"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Payment Terms
          </label>
          <input
            id="paymentTerms"
            name="paymentTerms"
            type="text"
            value={formData.paymentTerms}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="contractValue"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Contract Value
          </label>
          <input
            id="contractValue"
            name="contractValue"
            type="number"
            min="0"
            value={formData.contractValue}
            onChange={handleChange}
            style={inputStyle}
          />
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
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="pending_renewal">Pending Renewal</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            htmlFor="notes"
            style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
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
              ? editingContractId
                ? "Updating..."
                : "Creating..."
              : editingContractId
              ? "Update Contract"
              : "Create Contract"}
          </button>

          {editingContractId ? (
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
                "Service Provider",
                "Contract Title",
                "Start Date",
                "End Date",
                "Payment Terms",
                "Contract Value",
                "Status",
                "Notes",
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
            {filteredContracts.length > 0 ? (
              filteredContracts.map((contract) => (
                <tr key={contract._id}>
                  <td style={cellStyle}>
                    {contract.serviceProvider?.companyName || "-"}
                  </td>
                  <td style={cellStyle}>{contract.contractTitle}</td>
                  <td style={cellStyle}>
                    {contract.startDate
                      ? new Date(contract.startDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={cellStyle}>
                    {contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={cellStyle}>{contract.paymentTerms || "-"}</td>
                  <td style={cellStyle}>{contract.contractValue}</td>
                  <td style={cellStyle}>{contract.status}</td>
                  <td style={cellStyle}>{contract.notes || "-"}</td>
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
                          onClick={() => handleEdit(contract)}
                          style={actionButtonStyle}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(contract._id)}
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
                  colSpan={isAdmin ? "9" : "8"}
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  No contracts match the current filters.
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

export default Contracts;
