import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialFormData = {
  serviceProvider: "",
  contract: "",
  amount: "",
  paymentType: "final",
  paymentMethod: "bank_transfer",
  status: "pending",
  referenceNumber: "",
  notes: "",
};

const initialPaymentFilters = {
  searchTerm: "",
  paymentTypeFilter: "",
  paymentMethodFilter: "",
  statusFilter: "",
  minAmountFilter: "",
  maxAmountFilter: "",
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

const formatPaymentDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
};

const formatPaymentStatus = (status) => {
  if (!status) {
    return "-";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatPaymentType = (paymentType) => {
  const safeType = String(paymentType || "final");
  return safeType.charAt(0).toUpperCase() + safeType.slice(1);
};

function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [warning, setWarning] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const isAdmin = user?.role === "admin";
  const isServiceProvider = user?.role === "service_provider";

  const extractErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage;

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast(null);
  };

  const showToast = (message) => {
    dismissToast();
    setToast({
      title: "Payment could not be saved",
      message,
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 7000);
  };

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || contracts[0]?.serviceProvider?._id || "",
      contract: contracts[0]?._id || "",
    });
    setEditingPaymentId("");
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const clearFilters = () => {
    setSearchTerm(initialPaymentFilters.searchTerm);
    setPaymentTypeFilter(initialPaymentFilters.paymentTypeFilter);
    setPaymentMethodFilter(initialPaymentFilters.paymentMethodFilter);
    setStatusFilter(initialPaymentFilters.statusFilter);
    setMinAmountFilter(initialPaymentFilters.minAmountFilter);
    setMaxAmountFilter(initialPaymentFilters.maxAmountFilter);
  };

  const fetchPageData = async () => {
    try {
      setPageError("");

      if (isAdmin) {
        const [paymentsResponse, providersResponse, contractsResponse] =
          await Promise.all([
            api.get("/api/payments"),
            api.get("/api/service-providers"),
            api.get("/api/contracts"),
          ]);

        const fetchedPayments = paymentsResponse.data.data || [];
        const fetchedProviders = providersResponse.data.data || [];
        const fetchedContracts = contractsResponse.data.data || [];

        setPayments(fetchedPayments);
        setProviders(fetchedProviders);
        setContracts(fetchedContracts);
        setFormData((currentFormData) => ({
          ...currentFormData,
          serviceProvider:
            currentFormData.serviceProvider ||
            fetchedProviders[0]?._id ||
            fetchedContracts[0]?.serviceProvider?._id ||
            "",
          contract: currentFormData.contract || fetchedContracts[0]?._id || "",
        }));
      } else {
        const [paymentsResponse, contractsResponse] = await Promise.all([
          api.get("/api/payments"),
          api.get("/api/contracts"),
        ]);

        setPayments(paymentsResponse.data.data || []);
        setContracts(contractsResponse.data.data || []);
      }
    } catch (err) {
      setPageError(extractErrorMessage(err, "Failed to load payments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const availableContracts = useMemo(() => {
    if (!isAdmin) {
      return contracts;
    }

    return contracts.filter((contract) =>
      formData.serviceProvider
        ? contract.serviceProvider?._id === formData.serviceProvider
        : true
    );
  }, [contracts, formData.serviceProvider, isAdmin]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract._id === formData.contract),
    [contracts, formData.contract]
  );

  const selectedContractSummary = selectedContract?.financialSummary;

  const handleEdit = (payment) => {
    setPageError("");
    setFormError("");
    setWarning("");
    dismissToast();
    setEditingPaymentId(payment._id);
    setFormData({
      serviceProvider: payment.serviceProvider?._id || "",
      contract: payment.contract?._id || "",
      amount: payment.amount ?? "",
      paymentType: payment.paymentType || "final",
      paymentMethod: payment.paymentMethod || "bank_transfer",
      status: payment.status || "pending",
      referenceNumber: payment.referenceNumber || "",
      notes: payment.notes || "",
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const shouldClearValidationError = [
      "serviceProvider",
      "contract",
      "amount",
      "paymentType",
      "status",
    ].includes(name);

    if (shouldClearValidationError && formError) {
      setFormError("");
    }

    if (name === "serviceProvider") {
      setFormData((currentData) => {
        const contractStillMatches = contracts.find(
          (contract) =>
            contract._id === currentData.contract &&
            contract.serviceProvider?._id === value
        );

        return {
          ...currentData,
          serviceProvider: value,
          contract: contractStillMatches ? currentData.contract : "",
        };
      });
      return;
    }

    if (name === "contract") {
      const contract = contracts.find((item) => item._id === value);

      setFormData((currentData) => ({
        ...currentData,
        contract: value,
        serviceProvider:
          contract?.serviceProvider?._id || currentData.serviceProvider,
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError("");
      setWarning("");
      setFormError("");
      dismissToast();
      await api.delete(`/api/payments/${paymentId}`);

      if (editingPaymentId === paymentId) {
        resetForm();
      }

      await fetchPageData();
    } catch (err) {
      setPageError(extractErrorMessage(err, "Failed to delete payment."));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setWarning("");
    dismissToast();

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        paymentType: formData.paymentType || "final",
      };

      const response = editingPaymentId
        ? await api.put(`/api/payments/${editingPaymentId}`, payload)
        : await api.post("/api/payments", payload);

      const warnings = response.data?.warnings || [];

      resetForm();
      await fetchPageData();

      if (warnings.length) {
        setWarning(warnings.join(" "));
      }
    } catch (err) {
      const message = extractErrorMessage(
        err,
        `Failed to ${editingPaymentId ? "update" : "create"} payment.`
      );
      setFormError(message);
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      payment.serviceProvider?.companyName?.toLowerCase().includes(searchValue) ||
      payment.contract?.contractTitle?.toLowerCase().includes(searchValue) ||
      formatPaymentType(payment.paymentType).toLowerCase().includes(searchValue) ||
      payment.referenceNumber?.toLowerCase().includes(searchValue) ||
      payment.notes?.toLowerCase().includes(searchValue);

    const matchesType =
      !paymentTypeFilter ||
      (payment.paymentType || "final") === paymentTypeFilter;
    const matchesMethod =
      !paymentMethodFilter || payment.paymentMethod === paymentMethodFilter;
    const matchesStatus = !statusFilter || payment.status === statusFilter;

    const paymentAmount = Number(payment.amount) || 0;
    const matchesMinAmount =
      !minAmountFilter || paymentAmount >= Number(minAmountFilter);
    const matchesMaxAmount =
      !maxAmountFilter || paymentAmount <= Number(maxAmountFilter);

    return (
      matchesSearch &&
      matchesType &&
      matchesMethod &&
      matchesStatus &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

  const hasActiveFilters =
    searchTerm.trim() !== initialPaymentFilters.searchTerm ||
    paymentTypeFilter !== initialPaymentFilters.paymentTypeFilter ||
    paymentMethodFilter !== initialPaymentFilters.paymentMethodFilter ||
    statusFilter !== initialPaymentFilters.statusFilter ||
    minAmountFilter !== initialPaymentFilters.minAmountFilter ||
    maxAmountFilter !== initialPaymentFilters.maxAmountFilter;

  const providerPayments = [...payments].sort((firstPayment, secondPayment) => {
    const firstPaymentDate = firstPayment.paymentDate
      ? new Date(firstPayment.paymentDate).getTime()
      : 0;
    const secondPaymentDate = secondPayment.paymentDate
      ? new Date(secondPayment.paymentDate).getTime()
      : 0;

    return secondPaymentDate - firstPaymentDate;
  });

  const providerSummary = {
    totalPayments: providerPayments.length,
    totalAmountPaid: providerPayments.reduce((sum, payment) => {
      if (payment.status !== "paid") {
        return sum;
      }

      return sum + (Number(payment.amount) || 0);
    }, 0),
    pendingAmount: providerPayments.reduce((sum, payment) => {
      if (payment.status !== "pending") {
        return sum;
      }

      return sum + (Number(payment.amount) || 0);
    }, 0),
  };

  if (loading) {
    return <p>Loading payments...</p>;
  }

  if (isServiceProvider) {
    return (
      <section className="dashboard-page provider-payments-page">
        <div className="dashboard-hero">
          <div>
            <p className="dashboard-eyebrow">Provider Payments</p>
            <h1>My Payments</h1>
            <p className="dashboard-subtitle">
              View payments recorded for your service contracts.
            </p>
          </div>
        </div>

        {pageError ? <p style={{ color: "#c1121f" }}>{pageError}</p> : null}

        {!providerPayments.length ? (
          <section className="dashboard-section-card provider-payment-empty">
            <div className="dashboard-section-header">
              <div>
                <h2>No Payments Found</h2>
                <p>No payments have been recorded for your contracts yet.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2>Payment Summary</h2>
                  <p>
                    A quick overview of payment activity recorded for your
                    contracts.
                  </p>
                </div>
              </div>

              <div className="dashboard-stats-grid">
                <article className="dashboard-stat-card dashboard-stat-neutral">
                  <span className="dashboard-stat-label">Total Payments</span>
                  <strong className="dashboard-stat-value">
                    {providerSummary.totalPayments}
                  </strong>
                </article>
                <article className="dashboard-stat-card dashboard-stat-success">
                  <span className="dashboard-stat-label">Total Amount Paid</span>
                  <strong className="dashboard-stat-value dashboard-stat-value-currency">
                    {currencyFormatter.format(providerSummary.totalAmountPaid)}
                  </strong>
                </article>
                <article className="dashboard-stat-card dashboard-stat-warning">
                  <span className="dashboard-stat-label">Pending Amount</span>
                  <strong className="dashboard-stat-value dashboard-stat-value-currency">
                    {currencyFormatter.format(providerSummary.pendingAmount)}
                  </strong>
                </article>
              </div>
            </section>

            <section className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2>Payment Records</h2>
                  <p>
                    Payments are ordered by payment date, with the newest
                    entries shown first.
                  </p>
                </div>
              </div>

              <div className="provider-payments-table-wrap">
                <table className="provider-payments-table">
                  <thead>
                    <tr>
                      <th>Payment Date</th>
                      <th>Contract Title</th>
                      <th>Amount</th>
                      <th>Payment Type</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Reference Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td>{formatPaymentDate(payment.paymentDate)}</td>
                        <td>{payment.contract?.contractTitle || "-"}</td>
                        <td>
                          {currencyFormatter.format(Number(payment.amount) || 0)}
                        </td>
                        <td>{formatPaymentType(payment.paymentType)}</td>
                        <td>{payment.paymentMethod || "-"}</td>
                        <td>
                          <span
                            className={`provider-payment-status provider-payment-status-${payment.status}`}
                          >
                            {formatPaymentStatus(payment.status)}
                          </span>
                        </td>
                        <td>{payment.referenceNumber || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="provider-payments-card-list">
                {providerPayments.map((payment) => (
                  <article
                    key={payment._id}
                    className="provider-payments-card"
                  >
                    <div className="provider-payments-card-header">
                      <div>
                        <h3>
                          {payment.contract?.contractTitle || "Contract Payment"}
                        </h3>
                        <p>{formatPaymentDate(payment.paymentDate)}</p>
                      </div>
                      <span
                        className={`provider-payment-status provider-payment-status-${payment.status}`}
                      >
                        {formatPaymentStatus(payment.status)}
                      </span>
                    </div>

                    <div className="provider-payments-card-grid">
                      <div className="provider-payments-card-field">
                        <span className="provider-payments-card-label">
                          Amount
                        </span>
                        <strong>
                          {currencyFormatter.format(Number(payment.amount) || 0)}
                        </strong>
                      </div>
                      <div className="provider-payments-card-field">
                        <span className="provider-payments-card-label">
                          Payment Type
                        </span>
                        <strong>{formatPaymentType(payment.paymentType)}</strong>
                      </div>
                      <div className="provider-payments-card-field">
                        <span className="provider-payments-card-label">
                          Payment Method
                        </span>
                        <strong>{payment.paymentMethod || "-"}</strong>
                      </div>
                      <div className="provider-payments-card-field">
                        <span className="provider-payments-card-label">
                          Reference Number
                        </span>
                        <strong>{payment.referenceNumber || "-"}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    );
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Payments</h1>
        <p style={{ color: "#6b7a90" }}>
          Record provider payments and track contract-linked transactions.
        </p>
      </div>

      {pageError ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{pageError}</p>
      ) : null}
      {warning ? (
        <p style={{ marginBottom: "16px", color: "#9a6700" }}>{warning}</p>
      ) : null}

      {toast ? (
        <div
          className="payments-toast"
          role="alert"
          aria-live="assertive"
        >
          <div className="payments-toast-content">
            <div className="payments-toast-copy">
              <strong className="payments-toast-title">{toast.title}</strong>
              <span className="payments-toast-message">{toast.message}</span>
            </div>
            <button
              type="button"
              className="payments-toast-close"
              onClick={dismissToast}
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {editingPaymentId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing payment.
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
            <label className="filter-label" htmlFor="paymentSearch">
              Search Payments
            </label>
            <input
              id="paymentSearch"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by provider, contract, type, reference, or notes"
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="paymentTypeFilter">
              Payment Type
            </label>
            <select
              id="paymentTypeFilter"
              value={paymentTypeFilter}
              onChange={(event) => setPaymentTypeFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Types</option>
              <option value="advance">Advance</option>
              <option value="partial">Partial</option>
              <option value="final">Final</option>
              <option value="reimbursement">Reimbursement</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="paymentMethodFilter">
              Payment Method
            </label>
            <select
              id="paymentMethodFilter"
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="paymentStatusFilter">
              Status
            </label>
            <select
              id="paymentStatusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="minAmountFilter">
              Minimum Amount
            </label>
            <input
              id="minAmountFilter"
              type="number"
              min="0"
              value={minAmountFilter}
              onChange={(event) => setMinAmountFilter(event.target.value)}
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="maxAmountFilter">
              Maximum Amount
            </label>
            <input
              id="maxAmountFilter"
              type="number"
              min="0"
              value={maxAmountFilter}
              onChange={(event) => setMaxAmountFilter(event.target.value)}
              className="filter-control"
            />
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
            Showing {filteredPayments.length} of {payments.length} payments
          </span>
        </div>
      </div>

      {isAdmin ? (
        <form
          onSubmit={handleSubmit}
          className="payments-form"
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
            <div className="payments-form-header">
              <h2 className="payments-form-title">
                {editingPaymentId ? "Edit Payment" : "Create Payment"}
              </h2>
              <p className="payments-form-subtitle">
                Record provider payments and contract-linked transactions.
              </p>
            </div>
            {formError ? (
              <div className="payments-form-alert" role="alert">
                {formError}
              </div>
            ) : null}
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
              htmlFor="contract"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Contract
            </label>
            <select
              id="contract"
              name="contract"
              value={formData.contract}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">Select a contract</option>
              {availableContracts.map((contract) => (
                <option key={contract._id} value={contract._id}>
                  {contract.contractTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="amount"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="paymentType"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Payment Type
            </label>
            <select
              id="paymentType"
              name="paymentType"
              value={formData.paymentType}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="advance">Advance</option>
              <option value="partial">Partial</option>
              <option value="final">Final</option>
              <option value="reimbursement">Reimbursement</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="paymentMethod"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
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
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="referenceNumber"
              style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
            >
              Reference Number
            </label>
            <input
              id="referenceNumber"
              name="referenceNumber"
              type="text"
              value={formData.referenceNumber}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {selectedContractSummary ? (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #d9e2ec",
                background: "#f8fafc",
              }}
            >
              <strong style={{ display: "block", marginBottom: "12px" }}>
                Contract Financial Summary
              </strong>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                }}
              >
                <SummaryItem
                  label="Contract Value"
                  value={currencyFormatter.format(
                    Number(selectedContractSummary.contractValue) || 0
                  )}
                />
                <SummaryItem
                  label="Paid Toward Contract"
                  value={currencyFormatter.format(
                    Number(selectedContractSummary.contractPaymentsPaid) || 0
                  )}
                />
                <SummaryItem
                  label="Outstanding"
                  value={currencyFormatter.format(
                    Number(selectedContractSummary.outstandingBalance) || 0
                  )}
                />
                <SummaryItem
                  label="Reimbursements"
                  value={currencyFormatter.format(
                    Number(selectedContractSummary.reimbursementsPaid) || 0
                  )}
                />
              </div>
            </div>
          ) : null}

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
                ? editingPaymentId
                  ? "Updating..."
                  : "Creating..."
                : editingPaymentId
                ? "Update Payment"
                : "Create Payment"}
            </button>

            {editingPaymentId ? (
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
                "Contract",
                "Amount",
                "Payment Type",
                "Payment Method",
                "Status",
                "Reference Number",
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
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td style={cellStyle}>
                    {payment.serviceProvider?.companyName || "-"}
                  </td>
                  <td style={cellStyle}>
                    {payment.contract?.contractTitle || "-"}
                  </td>
                  <td style={cellStyle}>
                    {currencyFormatter.format(Number(payment.amount) || 0)}
                  </td>
                  <td style={cellStyle}>
                    {formatPaymentType(payment.paymentType)}
                  </td>
                  <td style={cellStyle}>{payment.paymentMethod}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        ...statusBadgeStyles.base,
                        ...(statusBadgeStyles[payment.status] ||
                          statusBadgeStyles.pending),
                      }}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td style={cellStyle}>{payment.referenceNumber || "-"}</td>
                  <td style={cellStyle}>{payment.notes || "-"}</td>
                  {isAdmin ? (
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(payment)}
                          style={actionButtonStyle}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(payment._id)}
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
                  {payments.length === 0
                    ? "No payments have been recorded yet."
                    : "No payments match your current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <span
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "0.85rem",
          color: "#6b7a90",
        }}
      >
        {label}
      </span>
      <strong style={{ color: "#14213d" }}>{value}</strong>
    </div>
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

const statusBadgeStyles = {
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
  paid: {
    background: "#dcfce7",
    color: "#166534",
  },
  failed: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
  cancelled: {
    background: "#e5e7eb",
    color: "#374151",
  },
};

export default Payments;
