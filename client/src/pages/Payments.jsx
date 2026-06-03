import { useEffect, useState } from "react";
import api from "../services/api";

const initialFormData = {
  serviceProvider: "",
  contract: "",
  amount: "",
  paymentMethod: "bank_transfer",
  status: "pending",
  referenceNumber: "",
  notes: "",
};

function Payments() {
  const [payments, setPayments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      serviceProvider: providers[0]?._id || "",
      contract: contracts[0]?._id || "",
    });
    setEditingPaymentId("");
  };

  const fetchPageData = async () => {
    try {
      setError("");

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
          currentFormData.serviceProvider || fetchedProviders[0]?._id || "",
        contract: currentFormData.contract || fetchedContracts[0]?._id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleEdit = (payment) => {
    setError("");
    setEditingPaymentId(payment._id);
    setFormData({
      serviceProvider: payment.serviceProvider?._id || "",
      contract: payment.contract?._id || "",
      amount: payment.amount ?? "",
      paymentMethod: payment.paymentMethod || "bank_transfer",
      status: payment.status || "pending",
      referenceNumber: payment.referenceNumber || "",
      notes: payment.notes || "",
    });
  };

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
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        contract: formData.contract || undefined,
      };

      if (editingPaymentId) {
        await api.put(`/api/payments/${editingPaymentId}`, payload);
      } else {
        await api.post("/api/payments", payload);
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingPaymentId ? "update" : "create"} payment.`
      );
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
      payment.referenceNumber?.toLowerCase().includes(searchValue) ||
      payment.notes?.toLowerCase().includes(searchValue);

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
      matchesMethod &&
      matchesStatus &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

  if (loading) {
    return <p>Loading payments...</p>;
  }

  return (
    <section>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>Payments</h1>
        <p style={{ color: "#6b7a90" }}>
          Record provider payments and track contract-linked transactions.
        </p>
      </div>

      {error ? (
        <p style={{ marginBottom: "16px", color: "#c1121f" }}>{error}</p>
      ) : null}

      {editingPaymentId ? (
        <p style={{ marginBottom: "16px", color: "#6b7a90" }}>
          You are editing an existing payment.
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
              placeholder="Search by provider, contract, reference, or notes"
              className="filter-control"
            />
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
      </div>

      <p style={{ marginBottom: "16px", color: "#6b7a90", fontWeight: "600" }}>
        Showing {filteredPayments.length} of {payments.length} payments
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
            style={inputStyle}
          >
            <option value="">Select a contract</option>
            {contracts.map((contract) => (
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
                "Payment Method",
                "Status",
                "Reference Number",
                "Notes",
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
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td style={cellStyle}>
                    {payment.serviceProvider?.companyName || "-"}
                  </td>
                  <td style={cellStyle}>
                    {payment.contract?.contractTitle || "-"}
                  </td>
                  <td style={cellStyle}>{payment.amount}</td>
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
                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => handleEdit(payment)}
                      style={actionButtonStyle}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    padding: "18px",
                    textAlign: "center",
                    color: "#6b7a90",
                  }}
                >
                  No payments match the current filters.
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
