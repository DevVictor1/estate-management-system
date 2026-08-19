import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const allowedEvidenceMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const maxEvidenceSizeBytes = 8 * 1024 * 1024;

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

const providerReceiptIssueReasonLabels = {
  not_received: "Payment not received",
  bank_delay: "Bank processing delay",
  transaction_reversed: "Transaction reversed",
  incorrect_amount: "Incorrect amount",
  other: "Other",
};

const getProviderReceiptStatus = (payment) => {
  const status = String(payment?.providerReceipt?.status || "")
    .trim()
    .toLowerCase();

  return ["confirmed", "issue_reported"].includes(status) ? status : "pending";
};

const isProviderReceiptConfirmed = (payment) =>
  getProviderReceiptStatus(payment) === "confirmed";

const isProviderReceiptIssueReported = (payment) =>
  getProviderReceiptStatus(payment) === "issue_reported";

const formatProviderReceiptIssueReason = (reason) =>
  providerReceiptIssueReasonLabels[
    String(reason || "").trim().toLowerCase()
  ] || "Payment issue reported";

const getAdminReceiptConfirmationLabel = (payment) => {
  if (payment?.status !== "paid") {
    return "Unavailable until paid";
  }

  if (isProviderReceiptIssueReported(payment)) {
    return "Issue reported";
  }

  return isProviderReceiptConfirmed(payment)
    ? "Confirmed by provider"
    : "Awaiting provider confirmation";
};

const getProviderReceiptPrompt = (payment) => {
  if (payment?.status !== "paid") {
    return "Receipt confirmation becomes available after the payment is marked as paid.";
  }

  if (isProviderReceiptIssueReported(payment)) {
    return "Payment issue reported. You can confirm receipt later once the funds arrive.";
  }

  return isProviderReceiptConfirmed(payment)
    ? "Payment received confirmed"
    : "Payment marked as paid. Please confirm once you have received the funds.";
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
  const [statusUpdating, setStatusUpdating] = useState({
    paymentId: "",
    status: "",
  });
  const [receiptConfirmingPaymentId, setReceiptConfirmingPaymentId] = useState("");
  const [receiptIssuePaymentId, setReceiptIssuePaymentId] = useState("");
  const [receiptIssueReason, setReceiptIssueReason] = useState("not_received");
  const [receiptIssueNote, setReceiptIssueNote] = useState("");
  const [receiptIssueError, setReceiptIssueError] = useState("");
  const [receiptIssueSubmitting, setReceiptIssueSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [warning, setWarning] = useState("");
  const [feedback, setFeedback] = useState("");
  const [copiedProviderAccountFeedback, setCopiedProviderAccountFeedback] =
    useState("");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [evidenceModalPaymentId, setEvidenceModalPaymentId] = useState("");
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState(null);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);
  const [evidenceDeleting, setEvidenceDeleting] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState(null);
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

  const showToast = (title, message) => {
    dismissToast();
    setToast({
      title,
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
    setFeedback("");
  };

  const closeEvidenceModal = () => {
    setEvidenceModalPaymentId("");
    setSelectedEvidenceFile(null);
    setEvidenceError("");
  };

  const closeReceiptIssueModal = () => {
    setReceiptIssuePaymentId("");
    setReceiptIssueReason("not_received");
    setReceiptIssueNote("");
    setReceiptIssueError("");
    setReceiptIssueSubmitting(false);
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
      setFeedback("");

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

  const selectedProvider = useMemo(
    () =>
      providers.find((provider) => provider._id === formData.serviceProvider) ||
      null,
    [providers, formData.serviceProvider]
  );

  const selectedProviderPaymentDetails = selectedProvider?.paymentDetails || null;
  const selectedProviderHasPaymentDetails = Boolean(
    selectedProviderPaymentDetails &&
      (
        selectedProviderPaymentDetails.bankName ||
        selectedProviderPaymentDetails.accountName ||
        selectedProviderPaymentDetails.accountNumber ||
        selectedProviderPaymentDetails.accountType ||
        selectedProviderPaymentDetails.preferredPaymentMethod ||
        selectedProviderPaymentDetails.paystackRecipientCode ||
        selectedProviderPaymentDetails.updatedAt
      )
  );

  const selectedContractSummary = selectedContract?.financialSummary;
  const selectedReceiptIssuePayment = useMemo(
    () =>
      payments.find((payment) => payment._id === receiptIssuePaymentId) || null,
    [payments, receiptIssuePaymentId]
  );

  const handleEdit = (payment) => {
    setPageError("");
    setFormError("");
    setWarning("");
    setFeedback("");
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
      if (copiedProviderAccountFeedback) {
        setCopiedProviderAccountFeedback("");
      }

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

  const handleCopyProviderAccountNumber = async (accountNumber) => {
    if (!accountNumber) {
      setCopiedProviderAccountFeedback("No account number available to copy.");
      return;
    }

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(accountNumber);
      setCopiedProviderAccountFeedback("Account number copied.");
    } catch (copyError) {
      setCopiedProviderAccountFeedback(
        "Unable to copy the account number right now."
      );
    }
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
      setFeedback("");
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

  const handleStatusUpdate = async (payment, nextStatus) => {
    const confirmationMessage =
      nextStatus === "paid"
        ? payment.paymentEvidence?.url
          ? "Are you sure you want to mark this payment as paid?"
          : "No payment evidence has been uploaded. Are you sure you want to mark this payment as paid?"
        : "Are you sure you want to cancel this pending payment?";
    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    setStatusUpdating({
      paymentId: payment._id,
      status: nextStatus,
    });
    setPageError("");
    setFormError("");
    setWarning("");
    setFeedback("");
    dismissToast();

    try {
      const response = await api.patch(`/api/payments/${payment._id}/status`, {
        status: nextStatus,
      });

      if (editingPaymentId === payment._id) {
        setFormData((currentData) => ({
          ...currentData,
          status: response.data?.data?.status || nextStatus,
        }));
      }

      await fetchPageData();
      setFeedback(
        nextStatus === "paid"
          ? "Payment marked as paid successfully."
          : "Pending payment cancelled successfully."
      );
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to update payment status."
      );
      setPageError(message);
      showToast("Payment status could not be updated", message);
    } finally {
      setStatusUpdating({
        paymentId: "",
        status: "",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setWarning("");
    setFeedback("");
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

      await fetchPageData();
      resetForm();
      setFeedback(
        editingPaymentId ? "Payment updated successfully." : "Payment created successfully."
      );

      if (warnings.length) {
        setWarning(warnings.join(" "));
      }
    } catch (err) {
      const message = extractErrorMessage(
        err,
        `Failed to ${editingPaymentId ? "update" : "create"} payment.`
      );
      setFormError(message);
      showToast("Payment could not be saved", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceipt = async (payment) => {
    if (!payment?._id || payment.status !== "paid") {
      return;
    }

    setReceiptConfirmingPaymentId(payment._id);
    setPageError("");
    setFormError("");
    setWarning("");
    setFeedback("");
    dismissToast();

    try {
      await api.patch(`/api/payments/${payment._id}/confirm-receipt`);
      await fetchPageData();
      setFeedback("Payment receipt confirmed successfully.");
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to confirm payment receipt."
      );
      setPageError(message);
      showToast("Payment receipt could not be confirmed", message);
    } finally {
      setReceiptConfirmingPaymentId("");
    }
  };

  const openReceiptIssueModal = (payment) => {
    if (!payment?._id || payment.status !== "paid") {
      return;
    }

    setReceiptIssuePaymentId(payment._id);
    setReceiptIssueReason("not_received");
    setReceiptIssueNote("");
    setReceiptIssueError("");
    dismissToast();
  };

  const handleReceiptIssueSubmit = async (event) => {
    event.preventDefault();

    if (!receiptIssuePaymentId) {
      return;
    }

    setReceiptIssueSubmitting(true);
    setReceiptIssueError("");
    setPageError("");
    setFormError("");
    setWarning("");
    setFeedback("");
    dismissToast();

    try {
      await api.patch(`/api/payments/${receiptIssuePaymentId}/report-receipt-issue`, {
        issueReason: receiptIssueReason,
        issueNote: receiptIssueNote,
      });
      await fetchPageData();
      closeReceiptIssueModal();
      setFeedback("Payment issue reported successfully.");
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to report the payment issue."
      );
      setReceiptIssueError(message);
      showToast("Payment issue could not be reported", message);
    } finally {
      setReceiptIssueSubmitting(false);
    }
  };

  const openEvidenceModal = (payment) => {
    setEvidenceModalPaymentId(payment._id);
    setSelectedEvidenceFile(null);
    setEvidenceError("");
    dismissToast();
  };

  const handleEvidenceFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedEvidenceFile(null);
      setEvidenceError("");
      return;
    }

    if (!allowedEvidenceMimeTypes.has(file.type)) {
      setSelectedEvidenceFile(null);
      setEvidenceError(
        "Only JPG, PNG, WebP images, or PDF files can be uploaded as payment evidence."
      );
      event.target.value = "";
      return;
    }

    if (!file.size) {
      setSelectedEvidenceFile(null);
      setEvidenceError("The selected payment evidence file is empty.");
      event.target.value = "";
      return;
    }

    if (file.size > maxEvidenceSizeBytes) {
      setSelectedEvidenceFile(null);
      setEvidenceError("Payment evidence must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    setSelectedEvidenceFile(file);
    setEvidenceError("");
  };

  const handleEvidenceUpload = async () => {
    if (!evidenceModalPaymentId || !selectedEvidenceFile) {
      setEvidenceError("Please choose one payment evidence file to upload.");
      return;
    }

    setEvidenceSubmitting(true);
    setEvidenceError("");
    setPageError("");
    setFeedback("");
    dismissToast();

    const formData = new FormData();
    formData.append("evidence", selectedEvidenceFile);

    try {
      await api.post(`/api/payments/${evidenceModalPaymentId}/evidence`, formData);
      await fetchPageData();
      closeEvidenceModal();
      setFeedback("Payment evidence saved successfully.");
      showToast("Payment evidence saved", "The payment evidence was updated successfully.");
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to upload payment evidence."
      );
      setEvidenceError(message);
      showToast("Payment evidence could not be saved", message);
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const handleEvidenceDelete = async () => {
    if (!evidenceModalPaymentId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove the payment evidence from this payment?"
    );

    if (!confirmed) {
      return;
    }

    setEvidenceDeleting(true);
    setEvidenceError("");
    setPageError("");
    setFeedback("");
    dismissToast();

    try {
      await api.delete(`/api/payments/${evidenceModalPaymentId}/evidence`);
      await fetchPageData();
      closeEvidenceModal();
      setFeedback("Payment evidence removed successfully.");
      showToast("Payment evidence removed", "The payment evidence was removed successfully.");
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to remove payment evidence."
      );
      setEvidenceError(message);
      showToast("Payment evidence could not be removed", message);
    } finally {
      setEvidenceDeleting(false);
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

  const selectedEvidencePayment = useMemo(
    () =>
      payments.find((payment) => payment._id === evidenceModalPaymentId) || null,
    [evidenceModalPaymentId, payments]
  );

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
        {feedback ? (
          <p className="payments-feedback payments-feedback-success" role="status">
            {feedback}
          </p>
        ) : null}

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
                      <th>Receipt Confirmation</th>
                      <th>Payment Evidence</th>
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
                        <td>
                          <PaymentReceiptSummary
                            payment={payment}
                            mode="provider"
                            confirmingPaymentId={receiptConfirmingPaymentId}
                            onConfirm={handleConfirmReceipt}
                            onReportIssue={openReceiptIssueModal}
                          />
                        </td>
                        <td>
                          {renderProviderEvidenceCell(payment, {
                            onPreviewImage: setEvidencePreview,
                          })}
                        </td>
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
                      <div className="provider-payments-card-field provider-payments-card-field-wide">
                        <span className="provider-payments-card-label">
                          Receipt Confirmation
                        </span>
                        <PaymentReceiptSummary
                          payment={payment}
                          mode="provider"
                          confirmingPaymentId={receiptConfirmingPaymentId}
                          onConfirm={handleConfirmReceipt}
                          onReportIssue={openReceiptIssueModal}
                        />
                      </div>
                      <div className="provider-payments-card-field">
                        <span className="provider-payments-card-label">
                          Payment Evidence
                        </span>
                        <div className="payments-evidence-inline">
                          {renderProviderEvidenceCell(payment, {
                            onPreviewImage: setEvidencePreview,
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {selectedReceiptIssuePayment ? (
              <div
                className="payments-receipt-issue-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="paymentReceiptIssueTitle"
                onClick={closeReceiptIssueModal}
              >
                <div
                  className="payments-receipt-issue-dialog"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="payments-receipt-issue-header">
                    <div>
                      <p className="payments-evidence-eyebrow">Payment Receipt</p>
                      <h2 id="paymentReceiptIssueTitle">Report Payment Issue</h2>
                      <p>
                        {selectedReceiptIssuePayment.contract?.contractTitle ||
                          "Contract Payment"}{" "}
                        •{" "}
                        {currencyFormatter.format(
                          Number(selectedReceiptIssuePayment.amount) || 0
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="payments-evidence-close"
                      onClick={closeReceiptIssueModal}
                    >
                      Close
                    </button>
                  </div>

                  <form
                    className="payments-receipt-issue-form"
                    onSubmit={handleReceiptIssueSubmit}
                  >
                    <div className="payments-receipt-issue-panel">
                      <label
                        className="payments-evidence-label"
                        htmlFor="paymentIssueReason"
                      >
                        Issue Reason
                      </label>
                      <select
                        id="paymentIssueReason"
                        value={receiptIssueReason}
                        onChange={(event) =>
                          setReceiptIssueReason(event.target.value)
                        }
                        className="payments-receipt-issue-input"
                        disabled={receiptIssueSubmitting}
                      >
                        {Object.entries(providerReceiptIssueReasonLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="payments-receipt-issue-panel">
                      <label
                        className="payments-evidence-label"
                        htmlFor="paymentIssueNote"
                      >
                        Short Note{" "}
                        <span className="payments-receipt-issue-optional">
                          (Optional)
                        </span>
                      </label>
                      <textarea
                        id="paymentIssueNote"
                        value={receiptIssueNote}
                        onChange={(event) => setReceiptIssueNote(event.target.value)}
                        className="payments-receipt-issue-textarea"
                        rows={4}
                        maxLength={1000}
                        disabled={receiptIssueSubmitting}
                        placeholder="Add any brief context about the payment issue."
                      />
                    </div>

                    {receiptIssueError ? (
                      <div
                        className="payments-form-alert payments-receipt-issue-alert"
                        role="alert"
                      >
                        {receiptIssueError}
                      </div>
                    ) : null}

                    <div className="payments-receipt-issue-actions">
                      <button
                        type="submit"
                        className="payments-evidence-primary"
                        disabled={receiptIssueSubmitting}
                      >
                        {receiptIssueSubmitting
                          ? "Reporting..."
                          : "Submit Issue"}
                      </button>
                      <button
                        type="button"
                        className="payments-evidence-secondary"
                        onClick={closeReceiptIssueModal}
                        disabled={receiptIssueSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
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
      {feedback ? (
        <p className="payments-feedback payments-feedback-success" role="status">
          {feedback}
        </p>
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

          {selectedProvider ? (
            <div className="payments-provider-details" style={{ gridColumn: "1 / -1" }}>
              <div className="payments-provider-details-header">
                <div>
                  <strong className="payments-provider-details-title">
                    Provider Payment Details
                  </strong>
                  <p className="payments-provider-details-subtitle">
                    Saved account information for {selectedProvider.companyName}.
                  </p>
                </div>

                {selectedProviderPaymentDetails?.accountNumber ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyProviderAccountNumber(
                        selectedProviderPaymentDetails.accountNumber
                      )
                    }
                    className="payments-provider-copy-button"
                  >
                    Copy Account Number
                  </button>
                ) : null}
              </div>

              {copiedProviderAccountFeedback ? (
                <p className="payments-provider-copy-feedback" role="status">
                  {copiedProviderAccountFeedback}
                </p>
              ) : null}

              {selectedProviderHasPaymentDetails ? (
                <div className="payments-provider-details-grid">
                  <SummaryItem
                    label="Bank Name"
                    value={selectedProviderPaymentDetails.bankName || "Not provided"}
                  />
                  <SummaryItem
                    label="Account Name"
                    value={
                      selectedProviderPaymentDetails.accountName || "Not provided"
                    }
                  />
                  <SummaryItem
                    label="Account Number"
                    value={
                      selectedProviderPaymentDetails.accountNumber || "Not provided"
                    }
                  />
                  <SummaryItem
                    label="Account Type"
                    value={
                      formatPaymentDetailLabel(
                        selectedProviderPaymentDetails.accountType
                      ) || "Not provided"
                    }
                  />
                  <SummaryItem
                    label="Preferred Payment Method"
                    value={
                      formatPaymentDetailLabel(
                        selectedProviderPaymentDetails.preferredPaymentMethod
                      ) || "Not provided"
                    }
                  />
                  <SummaryItem
                    label="Paystack Recipient Code"
                    value={
                      selectedProviderPaymentDetails.paystackRecipientCode ||
                      "Not provided"
                    }
                  />
                  <SummaryItem
                    label="Last Updated"
                    value={
                      selectedProviderPaymentDetails.updatedAt
                        ? formatPaymentDate(selectedProviderPaymentDetails.updatedAt)
                        : "Not provided"
                    }
                  />
                </div>
              ) : (
                <div className="payments-provider-details-empty">
                  Payment details unavailable. This service provider has not
                  added their payment information yet.
                </div>
              )}
            </div>
          ) : null}

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
                "Provider Confirmation",
                "Reference Number",
                "Notes",
                "Evidence",
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
                  <td style={cellStyle}>
                    <PaymentReceiptSummary payment={payment} mode="admin" />
                  </td>
                  <td style={cellStyle}>{payment.referenceNumber || "-"}</td>
                  <td style={cellStyle}>{payment.notes || "-"}</td>
                  <td style={cellStyle}>
                    <div className="payments-evidence-inline">
                      {payment.paymentEvidence?.url ? (
                        <button
                          type="button"
                          onClick={() => openEvidenceModal(payment)}
                          className="payments-evidence-link-button"
                        >
                          View Evidence
                        </button>
                      ) : (
                        <span className="payments-evidence-empty">
                          No evidence
                        </span>
                      )}
                    </div>
                  </td>
                  {isAdmin ? (
                    <td style={paymentActionsCellStyle}>
                      <div className="payments-action-row">
                        {payment.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(payment, "paid")}
                            style={{
                              ...actionButtonStyle,
                              ...actionButtonToneStyles.success,
                              opacity:
                                statusUpdating.paymentId === payment._id ? 0.7 : 1,
                              cursor:
                                statusUpdating.paymentId === payment._id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                            disabled={statusUpdating.paymentId === payment._id}
                          >
                            {statusUpdating.paymentId === payment._id &&
                            statusUpdating.status === "paid"
                              ? "Updating..."
                              : "Mark Paid"}
                          </button>
                        ) : null}
                        {payment.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(payment, "cancelled")}
                            style={{
                              ...actionButtonStyle,
                              ...actionButtonToneStyles.neutral,
                              opacity:
                                statusUpdating.paymentId === payment._id ? 0.7 : 1,
                              cursor:
                                statusUpdating.paymentId === payment._id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                            disabled={statusUpdating.paymentId === payment._id}
                          >
                            {statusUpdating.paymentId === payment._id &&
                            statusUpdating.status === "cancelled"
                              ? "Updating..."
                              : "Cancel"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEvidenceModal(payment)}
                          style={actionButtonStyle}
                        >
                          {payment.paymentEvidence?.url
                            ? "Manage Evidence"
                            : "Upload Evidence"}
                        </button>
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
                            ...actionButtonToneStyles.danger,
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
                  colSpan={isAdmin ? "11" : "10"}
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

      {isAdmin && selectedEvidencePayment ? (
        <div
          className="payments-evidence-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Payment evidence manager"
          onClick={closeEvidenceModal}
        >
          <div
            className="payments-evidence-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payments-evidence-header">
              <div>
                <p className="payments-evidence-eyebrow">Payment Evidence</p>
                <h2>
                  {selectedEvidencePayment.contract?.contractTitle ||
                    "Contract Payment"}
                </h2>
                <p>
                  {selectedEvidencePayment.serviceProvider?.companyName || "-"} •{" "}
                  {currencyFormatter.format(
                    Number(selectedEvidencePayment.amount) || 0
                  )}
                </p>
              </div>
              <button
                type="button"
                className="payments-evidence-close"
                onClick={closeEvidenceModal}
              >
                Close
              </button>
            </div>

            {selectedEvidencePayment.paymentEvidence?.url ? (
              <div className="payments-evidence-current">
                <div className="payments-evidence-current-copy">
                  <strong>Current evidence</strong>
                  <p>{selectedEvidencePayment.paymentEvidence.originalName || "Payment evidence"}</p>
                  <span>
                    {selectedEvidencePayment.paymentEvidence.mimeType || "File"} •{" "}
                    {formatFileSize(selectedEvidencePayment.paymentEvidence.size)}
                  </span>
                </div>
                {isImageEvidence(selectedEvidencePayment.paymentEvidence) ? (
                  <button
                    type="button"
                    className="payments-evidence-thumbnail-button"
                    onClick={() =>
                      setEvidencePreview({
                        url: selectedEvidencePayment.paymentEvidence.url,
                        originalName:
                          selectedEvidencePayment.paymentEvidence.originalName ||
                          "Payment evidence",
                      })
                    }
                  >
                    <img
                      src={selectedEvidencePayment.paymentEvidence.url}
                      alt={
                        selectedEvidencePayment.paymentEvidence.originalName ||
                        "Payment evidence preview"
                      }
                      className="payments-evidence-thumbnail"
                    />
                  </button>
                ) : (
                  <div className="payments-evidence-pdf-card">
                    <strong>PDF evidence available</strong>
                  </div>
                )}
                <div className="payments-evidence-link-row">
                  <a
                    href={selectedEvidencePayment.paymentEvidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="payments-evidence-link-button"
                  >
                    View
                  </a>
                  <a
                    href={selectedEvidencePayment.paymentEvidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={selectedEvidencePayment.paymentEvidence.originalName || "payment-evidence"}
                    className="payments-evidence-link-button"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="payments-evidence-empty-card">
                No payment evidence has been uploaded for this payment yet.
              </div>
            )}

            <div className="payments-evidence-upload">
              <label className="payments-evidence-label" htmlFor="paymentEvidenceFile">
                {selectedEvidencePayment.paymentEvidence?.url
                  ? "Replace evidence"
                  : "Upload evidence"}
              </label>
              <p className="payments-evidence-hint">
                Upload one JPG, PNG, WebP image, or PDF file up to 8 MB.
              </p>
              <input
                id="paymentEvidenceFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleEvidenceFileChange}
                className="payments-evidence-input"
              />
              {selectedEvidenceFile ? (
                <div className="payments-evidence-selected">
                  <strong>{selectedEvidenceFile.name}</strong>
                  <span>{formatFileSize(selectedEvidenceFile.size)}</span>
                </div>
              ) : null}
              {evidenceError ? (
                <div className="payments-form-alert payments-evidence-alert" role="alert">
                  {evidenceError}
                </div>
              ) : null}
            </div>

            <div className="payments-evidence-actions">
              <button
                type="button"
                onClick={handleEvidenceUpload}
                disabled={evidenceSubmitting || evidenceDeleting}
                className="payments-evidence-primary"
              >
                {evidenceSubmitting
                  ? selectedEvidencePayment.paymentEvidence?.url
                    ? "Replacing..."
                    : "Uploading..."
                  : selectedEvidencePayment.paymentEvidence?.url
                  ? "Replace Evidence"
                  : "Upload Evidence"}
              </button>
              {selectedEvidencePayment.paymentEvidence?.url ? (
                <button
                  type="button"
                  onClick={handleEvidenceDelete}
                  disabled={evidenceSubmitting || evidenceDeleting}
                  className="payments-evidence-secondary"
                >
                  {evidenceDeleting ? "Removing..." : "Remove Evidence"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {evidencePreview ? (
        <div
          className="payments-evidence-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Payment evidence preview"
          onClick={() => setEvidencePreview(null)}
        >
          <div
            className="payments-evidence-lightbox-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payments-evidence-lightbox-header">
              <div>
                <p className="payments-evidence-eyebrow">Payment Evidence</p>
                <h2>{evidencePreview.originalName || "Evidence preview"}</h2>
              </div>
              <button
                type="button"
                className="payments-evidence-close"
                onClick={() => setEvidencePreview(null)}
              >
                Close
              </button>
            </div>
            <img
              src={evidencePreview.url}
              alt={evidencePreview.originalName || "Payment evidence preview"}
              className="payments-evidence-lightbox-image"
            />
          </div>
        </div>
      ) : null}
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

const paymentActionsCellStyle = {
  ...cellStyle,
  minWidth: "460px",
  whiteSpace: "nowrap",
};

const actionButtonStyle = {
  padding: "8px 12px",
  border: "1px solid #d9e2ec",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#14213d",
  cursor: "pointer",
};

const actionButtonToneStyles = {
  success: {
    background: "#dcfce7",
    color: "#166534",
    borderColor: "rgba(22, 101, 52, 0.18)",
  },
  neutral: {
    background: "#f8fafc",
    color: "#374151",
    borderColor: "rgba(148, 163, 184, 0.22)",
  },
  danger: {
    background: "#c1121f",
    color: "#ffffff",
    borderColor: "#c1121f",
  },
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

function PaymentReceiptSummary({
  payment,
  mode = "provider",
  confirmingPaymentId = "",
  onConfirm,
  onReportIssue,
}) {
  const receiptStatus = getProviderReceiptStatus(payment);
  const receiptConfirmed = receiptStatus === "confirmed";
  const receiptIssueReported = receiptStatus === "issue_reported";
  const canConfirmReceipt =
    mode === "provider" && payment?.status === "paid" && !receiptConfirmed;
  const canReportIssue =
    mode === "provider" && payment?.status === "paid" && receiptStatus === "pending";
  const issueReasonLabel = formatProviderReceiptIssueReason(
    payment?.providerReceipt?.issueReason
  );
  const hasProviderActions = canConfirmReceipt || canReportIssue;

  return (
    <div
      className={`payment-receipt-summary${
        mode === "admin" ? " payment-receipt-summary-admin" : ""
      }`}
    >
      <span
        className={`payment-receipt-summary-badge payment-receipt-summary-badge-${receiptStatus}`}
      >
        {receiptConfirmed
          ? "Confirmed"
          : receiptIssueReported
          ? "Issue Reported"
          : "Pending"}
      </span>
      <p className="payment-receipt-summary-text">
        {mode === "admin"
          ? getAdminReceiptConfirmationLabel(payment)
          : getProviderReceiptPrompt(payment)}
      </p>

      {receiptIssueReported ? (
        <div className="payment-receipt-summary-meta">
          <span className="payment-receipt-summary-detail">
            Reason: {issueReasonLabel}
          </span>
          {payment?.providerReceipt?.issueNote ? (
            <span className="payment-receipt-summary-detail">
              Note: {payment.providerReceipt.issueNote}
            </span>
          ) : null}
          {payment?.providerReceipt?.issueReportedAt ? (
            <span className="payment-receipt-summary-date">
              Reported on{" "}
              {formatPaymentDate(payment.providerReceipt.issueReportedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      {receiptConfirmed && payment?.providerReceipt?.confirmedAt ? (
        <span className="payment-receipt-summary-date">
          Confirmed on {formatPaymentDate(payment.providerReceipt.confirmedAt)}
        </span>
      ) : null}

      {hasProviderActions ? (
        <div className="payment-receipt-summary-actions">
          {canConfirmReceipt ? (
            <button
              type="button"
              className="payment-receipt-confirm-button"
              onClick={() => onConfirm?.(payment)}
              disabled={confirmingPaymentId === payment?._id}
            >
              {confirmingPaymentId === payment?._id
                ? "Confirming..."
                : "Confirm Payment Received"}
            </button>
          ) : null}

          {canReportIssue ? (
            <button
              type="button"
              className="payment-receipt-issue-button"
              onClick={() => onReportIssue?.(payment)}
            >
              Report Payment Issue
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function isImageEvidence(paymentEvidence) {
  return Boolean(paymentEvidence?.mimeType?.startsWith("image/"));
}

function formatFileSize(size) {
  const safeSize = Number(size) || 0;

  if (safeSize >= 1024 * 1024) {
    return `${(safeSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (safeSize >= 1024) {
    return `${Math.round(safeSize / 1024)} KB`;
  }

  return `${safeSize} B`;
}

function formatPaymentDetailLabel(value = "") {
  if (!value) {
    return "";
  }

  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderProviderEvidenceCell(payment, { onPreviewImage }) {
  if (!payment.paymentEvidence?.url) {
    return (
      <span className="payments-evidence-empty">
        No payment evidence uploaded.
      </span>
    );
  }

  if (isImageEvidence(payment.paymentEvidence)) {
    return (
      <>
        <button
          type="button"
          onClick={() =>
            onPreviewImage({
              url: payment.paymentEvidence.url,
              originalName:
                payment.paymentEvidence.originalName || "Payment evidence",
            })
          }
          className="payments-evidence-link-button"
        >
          View Image
        </button>
        <a
          href={payment.paymentEvidence.url}
          target="_blank"
          rel="noopener noreferrer"
          download={payment.paymentEvidence.originalName || "payment-evidence"}
          className="payments-evidence-link-button"
        >
          Download
        </a>
      </>
    );
  }

  return (
    <>
      <a
        href={payment.paymentEvidence.url}
        target="_blank"
        rel="noopener noreferrer"
        className="payments-evidence-link-button"
      >
        View PDF
      </a>
      <a
        href={payment.paymentEvidence.url}
        target="_blank"
        rel="noopener noreferrer"
        download={payment.paymentEvidence.originalName || "payment-evidence.pdf"}
        className="payments-evidence-link-button"
      >
        Download
      </a>
    </>
  );
}
