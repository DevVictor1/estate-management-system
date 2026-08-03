import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialQuotationForm = {
  task: "",
  labourCost: "",
  materialsCost: "",
  otherCost: "",
  estimatedDurationValue: "",
  estimatedDurationUnit: "days",
  notes: "",
};

const initialContractForm = {
  contractTitle: "",
  startDate: "",
  endDate: "",
  paymentTerms: "",
  status: "active",
  notes: "",
};

const initialFilters = {
  searchTerm: "",
  statusFilter: "",
  providerFilter: "",
  dateFromFilter: "",
  dateToFilter: "",
};

const quotableTaskStatuses = ["pending", "in_progress", "overdue"];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const formatDate = (value, includeTime = false) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};

const formatStatusLabel = (status = "") =>
  String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDurationLabel = (value, unit) => {
  const safeValue = Number(value) || 0;
  const safeUnit = String(unit || "").trim().toLowerCase();

  if (!safeValue || !safeUnit) {
    return "-";
  }

  const unitLabel = safeValue === 1 ? safeUnit.replace(/s$/, "") : safeUnit;
  return `${safeValue} ${unitLabel}`;
};

const getStatusTone = (status) => {
  if (status === "approved") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  if (status === "revision_requested") {
    return "warning";
  }

  if (status === "under_review") {
    return "info";
  }

  return "neutral";
};

function Quotations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isServiceProvider = user?.role === "service_provider";
  const [quotations, setQuotations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quotationForm, setQuotationForm] = useState(initialQuotationForm);
  const [contractForm, setContractForm] = useState(initialContractForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submittingQuotation, setSubmittingQuotation] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

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
    setToast({ title, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 7000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const resetQuotationForm = () => {
    setQuotationForm({
      ...initialQuotationForm,
      task: "",
    });
  };

  const clearFilters = () => {
    setSearchTerm(initialFilters.searchTerm);
    setStatusFilter(initialFilters.statusFilter);
    setProviderFilter(initialFilters.providerFilter);
    setDateFromFilter(initialFilters.dateFromFilter);
    setDateToFilter(initialFilters.dateToFilter);
  };

  const fetchPageData = async () => {
    try {
      setPageError("");

      if (isServiceProvider) {
        const [quotationsResponse, tasksResponse] = await Promise.all([
          api.get("/api/quotations"),
          api.get("/api/tasks"),
        ]);

        const fetchedQuotations = quotationsResponse.data.data || [];
        const fetchedTasks = tasksResponse.data.data || [];

        setQuotations(fetchedQuotations);
        setTasks(fetchedTasks);
        setSelectedQuotationId((currentId) =>
          fetchedQuotations.some((quotation) => quotation._id === currentId)
            ? currentId
            : fetchedQuotations[0]?._id || ""
        );
      } else {
        const response = await api.get("/api/quotations");
        const fetchedQuotations = response.data.data || [];

        setQuotations(fetchedQuotations);
        setSelectedQuotationId((currentId) =>
          fetchedQuotations.some((quotation) => quotation._id === currentId)
            ? currentId
            : fetchedQuotations[0]?._id || ""
        );
      }
    } catch (error) {
      setPageError(extractErrorMessage(error, "Failed to load quotations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  useEffect(() => {
    if (!selectedQuotationId) {
      setSelectedQuotation(null);
      setReviewComment("");
      setContractForm(initialContractForm);
      return;
    }

    let isMounted = true;

    const fetchQuotationDetail = async () => {
      setDetailLoading(true);
      setDetailError("");

      try {
        const response = await api.get(`/api/quotations/${selectedQuotationId}`);

        if (!isMounted) {
          return;
        }

        setSelectedQuotation(response.data.data || null);
        setReviewComment(response.data.data?.adminComment || "");
        setContractForm({
          ...initialContractForm,
          contractTitle:
            response.data.data?.createdContract?.contractTitle ||
            `${response.data.data?.task?.title || "Task"} Contract`,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDetailError(
          extractErrorMessage(error, "Failed to load quotation details.")
        );
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    fetchQuotationDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedQuotationId]);

  const latestQuotationByTask = useMemo(() => {
    const sortedQuotations = [...quotations].sort((firstQuotation, secondQuotation) => {
      const firstRevision = Number(firstQuotation.revisionNumber || 0);
      const secondRevision = Number(secondQuotation.revisionNumber || 0);

      if (firstRevision !== secondRevision) {
        return secondRevision - firstRevision;
      }

      return (
        new Date(secondQuotation.createdAt || 0).getTime() -
        new Date(firstQuotation.createdAt || 0).getTime()
      );
    });

    return sortedQuotations.reduce((map, quotation) => {
      const taskId = quotation.task?._id || quotation.task;

      if (!taskId || map.has(taskId)) {
        return map;
      }

      map.set(taskId, quotation);
      return map;
    }, new Map());
  }, [quotations]);

  const eligibleProviderTasks = useMemo(() => {
    if (!isServiceProvider) {
      return [];
    }

    return tasks.filter((task) => {
      const latestQuotation = task.latestQuotation || latestQuotationByTask.get(task._id);
      const hasAllowedTaskStatus = quotableTaskStatuses.includes(task.status);
      const hasNoQuotation = !latestQuotation;
      const needsRevision = latestQuotation?.status === "revision_requested";
      const hasCreatedContract = Boolean(latestQuotation?.createdContract);

      return (
        hasAllowedTaskStatus &&
        !hasCreatedContract &&
        (hasNoQuotation || needsRevision)
      );
    });
  }, [isServiceProvider, latestQuotationByTask, tasks]);

  const providerOptions = useMemo(() => {
    const providerMap = new Map();

    quotations.forEach((quotation) => {
      if (quotation.serviceProvider?._id && !providerMap.has(quotation.serviceProvider._id)) {
        providerMap.set(quotation.serviceProvider._id, quotation.serviceProvider.companyName);
      }
    });

    return [...providerMap.entries()].map(([value, label]) => ({
      value,
      label,
    }));
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((quotation) => {
      const searchValue = searchTerm.trim().toLowerCase();
      const createdDate = quotation.createdAt
        ? new Date(quotation.createdAt).toISOString().split("T")[0]
        : "";

      const matchesSearch =
        !searchValue ||
        quotation.task?.title?.toLowerCase().includes(searchValue) ||
        quotation.task?.description?.toLowerCase().includes(searchValue) ||
        quotation.serviceProvider?.companyName?.toLowerCase().includes(searchValue) ||
        quotation.serviceProvider?.contactPerson?.toLowerCase().includes(searchValue) ||
        quotation.notes?.toLowerCase().includes(searchValue) ||
        quotation.adminComment?.toLowerCase().includes(searchValue);

      const matchesStatus =
        !statusFilter || quotation.status === statusFilter;
      const matchesProvider =
        !providerFilter || quotation.serviceProvider?._id === providerFilter;
      const matchesDateFrom =
        !dateFromFilter || (createdDate && createdDate >= dateFromFilter);
      const matchesDateTo =
        !dateToFilter || (createdDate && createdDate <= dateToFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProvider &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [dateFromFilter, dateToFilter, providerFilter, quotations, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== initialFilters.searchTerm ||
    statusFilter !== initialFilters.statusFilter ||
    providerFilter !== initialFilters.providerFilter ||
    dateFromFilter !== initialFilters.dateFromFilter ||
    dateToFilter !== initialFilters.dateToFilter;

  const liveQuotationTotal = useMemo(() => {
    const labourCost = Number(quotationForm.labourCost) || 0;
    const materialsCost = Number(quotationForm.materialsCost) || 0;
    const otherCost = Number(quotationForm.otherCost) || 0;

    return labourCost + materialsCost + otherCost;
  }, [quotationForm.labourCost, quotationForm.materialsCost, quotationForm.otherCost]);

  const applyQuotationPrefill = (quotation) => {
    if (!quotation) {
      return;
    }

    setQuotationForm({
      task: quotation.task?._id || quotation.task || "",
      labourCost: quotation.labourCost ?? "",
      materialsCost: quotation.materialsCost ?? "",
      otherCost: quotation.otherCost ?? "",
      estimatedDurationValue: quotation.estimatedDurationValue ?? "",
      estimatedDurationUnit: quotation.estimatedDurationUnit || "days",
      notes: quotation.notes || "",
    });
  };

  const handleQuotationFieldChange = (event) => {
    const { name, value } = event.target;

    if (
      ["task", "labourCost", "materialsCost", "otherCost", "estimatedDurationValue", "estimatedDurationUnit"].includes(
        name
      )
    ) {
      setFormError("");
    }

    if (name === "task") {
      const revisionSource = latestQuotationByTask.get(value);

      if (revisionSource?.status === "revision_requested") {
        applyQuotationPrefill({
          ...revisionSource,
          task: value,
        });
      } else {
        setQuotationForm((currentForm) => ({
          ...currentForm,
          task: value,
        }));
      }

      return;
    }

    setQuotationForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCreateQuotation = async (event) => {
    event.preventDefault();
    setSubmittingQuotation(true);
    setFormError("");
    setFeedback(null);
    dismissToast();

    try {
      const response = await api.post("/api/quotations", {
        task: quotationForm.task,
        labourCost: Number(quotationForm.labourCost),
        materialsCost: Number(quotationForm.materialsCost),
        otherCost: Number(quotationForm.otherCost || 0),
        estimatedDurationValue: Number(quotationForm.estimatedDurationValue),
        estimatedDurationUnit: quotationForm.estimatedDurationUnit,
        notes: quotationForm.notes,
      });

      await fetchPageData();
      const createdQuotationId = response.data?.data?._id;

      if (createdQuotationId) {
        setSelectedQuotationId(createdQuotationId);
      }

      resetQuotationForm();
      setFeedback({
        type: "success",
        text: "Quotation submitted successfully.",
      });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Failed to submit quotation."
      );
      setFormError(message);
      showToast("Quotation could not be submitted", message);
    } finally {
      setSubmittingQuotation(false);
    }
  };

  const handleOpenDetails = (quotationId) => {
    setDetailError("");
    setSelectedQuotationId(quotationId);
  };

  const handleStartRevision = (quotation) => {
    applyQuotationPrefill(quotation);
    setFeedback({
      type: "warning",
      text: `Revision ${Number(quotation.revisionNumber || 1) + 1} is ready to prepare. Update the pricing details and submit the new quotation when you're ready.`,
    });
  };

  const handleReview = async (action) => {
    setSubmittingReview(true);
    setDetailError("");
    setFeedback(null);
    dismissToast();

    try {
      const response = await api.patch(
        `/api/quotations/${selectedQuotationId}/review`,
        {
          action,
          adminComment: reviewComment,
        }
      );

      setSelectedQuotation(response.data.data || null);
      setReviewComment(response.data.data?.adminComment || "");
      await fetchPageData();
      setFeedback({
        type: "success",
        text: "Quotation review saved successfully.",
      });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Failed to review quotation."
      );
      setDetailError(message);
      showToast("Quotation review failed", message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContractFieldChange = (event) => {
    const { name, value } = event.target;

    setContractForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCreateContractFromQuotation = async (event) => {
    event.preventDefault();
    setCreatingContract(true);
    setDetailError("");
    setFeedback(null);
    dismissToast();

    try {
      const response = await api.post(
        `/api/quotations/${selectedQuotationId}/create-contract`,
        contractForm
      );

      setSelectedQuotation(response.data.data || null);
      await fetchPageData();
      setFeedback({
        type: "success",
        text: "Contract created successfully from the approved quotation.",
      });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Failed to create a contract from the approved quotation."
      );
      setDetailError(message);
      showToast("Contract could not be created", message);
    } finally {
      setCreatingContract(false);
    }
  };

  if (loading) {
    return <p>Loading quotations...</p>;
  }

  return (
    <section className="quotations-page">
      <div className="quotations-header">
        <div>
          <h1>{isAdmin ? "Quotations" : "My Quotations"}</h1>
          <p>
            {isAdmin
              ? "Review submitted provider pricing, request revisions, and create contracts from approved quotations."
              : "Submit quotations for your assigned tasks, track review status, and respond to revision requests."}
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          className={`quotation-feedback quotation-feedback-${feedback.type || "success"}`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      {pageError ? (
        <p className="quotation-page-error" role="alert">
          {pageError}
        </p>
      ) : null}

      {toast ? (
        <div className="quotations-toast" role="alert" aria-live="assertive">
          <div className="quotations-toast-content">
            <div className="quotations-toast-copy">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              type="button"
              className="quotations-toast-close"
              onClick={dismissToast}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {isServiceProvider ? (
        <section className="quotation-form-card">
          <div className="quotation-form-inner">
            <div className="quotation-form-header">
              <div>
                <h2>Submit a Quotation</h2>
                <p>
                  Choose one of your assigned tasks that still needs a quotation
                  or has a revision request pending.
                </p>
              </div>
              <div className="quotation-total-pill">
                <span>Total</span>
                <strong>{formatCurrency(liveQuotationTotal)}</strong>
              </div>
            </div>

            {formError ? (
              <div className="quotation-form-alert" role="alert">
                {formError}
              </div>
            ) : null}

            <form className="quotation-form-grid" onSubmit={handleCreateQuotation}>
              <div className="quotation-form-group quotation-form-group-wide">
                <label htmlFor="quotationTask">Task</label>
                <select
                  id="quotationTask"
                  name="task"
                  value={quotationForm.task}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                  required
                >
                  <option value="">Select an assigned task</option>
                  {eligibleProviderTasks.map((task) => {
                    const latestQuotation =
                      task.latestQuotation || latestQuotationByTask.get(task._id);
                    const suffix =
                      latestQuotation?.status === "revision_requested"
                        ? " (Revision requested)"
                        : "";

                    return (
                      <option key={task._id} value={task._id}>
                        {task.title}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="quotation-form-group">
                <label htmlFor="labourCost">Labour Cost</label>
                <input
                  id="labourCost"
                  name="labourCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationForm.labourCost}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                  required
                />
              </div>

              <div className="quotation-form-group">
                <label htmlFor="materialsCost">Materials Cost</label>
                <input
                  id="materialsCost"
                  name="materialsCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationForm.materialsCost}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                  required
                />
              </div>

              <div className="quotation-form-group">
                <label htmlFor="otherCost">Other Cost</label>
                <input
                  id="otherCost"
                  name="otherCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationForm.otherCost}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                />
              </div>

              <div className="quotation-form-group">
                <label htmlFor="estimatedDurationValue">Estimated Duration</label>
                <input
                  id="estimatedDurationValue"
                  name="estimatedDurationValue"
                  type="number"
                  min="1"
                  step="1"
                  value={quotationForm.estimatedDurationValue}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                  required
                />
              </div>

              <div className="quotation-form-group">
                <label htmlFor="estimatedDurationUnit">Duration Unit</label>
                <select
                  id="estimatedDurationUnit"
                  name="estimatedDurationUnit"
                  value={quotationForm.estimatedDurationUnit}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control"
                  required
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>

              <div className="quotation-form-group quotation-form-group-wide">
                <label htmlFor="quotationNotes">Notes</label>
                <textarea
                  id="quotationNotes"
                  name="notes"
                  rows="4"
                  value={quotationForm.notes}
                  onChange={handleQuotationFieldChange}
                  className="quotation-form-control quotation-form-textarea"
                  placeholder="Add supporting pricing details, scope notes, or material assumptions."
                />
              </div>

              <div className="quotation-form-actions quotation-form-group-wide">
                <button
                  type="submit"
                  className="quotation-primary-button"
                  disabled={submittingQuotation}
                >
                  {submittingQuotation ? "Submitting..." : "Submit Quotation"}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section className="quotation-list-card">
        <div className="quotation-list-toolbar">
          <div className="filter-group">
            <label className="filter-label" htmlFor="quotationSearch">
              Search
            </label>
            <input
              id="quotationSearch"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="filter-control"
              placeholder={
                isAdmin
                  ? "Search by task, provider, notes, or comment"
                  : "Search by task, notes, or comment"
              }
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="quotationStatusFilter">
              Status
            </label>
            <select
              id="quotationStatusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="filter-control"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="revision_requested">Revision Requested</option>
            </select>
          </div>

          {isAdmin ? (
            <div className="filter-group">
              <label className="filter-label" htmlFor="quotationProviderFilter">
                Provider
              </label>
              <select
                id="quotationProviderFilter"
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="filter-control"
              >
                <option value="">All Providers</option>
                {providerOptions.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="filter-group">
            <label className="filter-label" htmlFor="quotationDateFromFilter">
              From
            </label>
            <input
              id="quotationDateFromFilter"
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="filter-control"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="quotationDateToFilter">
              To
            </label>
            <input
              id="quotationDateToFilter"
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="filter-control"
            />
          </div>
        </div>

        <div className="quotation-toolbar-actions">
          <button
            type="button"
            onClick={clearFilters}
            className="clear-filters-button"
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
          <span className="filter-results-count">
            Showing {filteredQuotations.length} of {quotations.length} quotations
          </span>
        </div>

        <div className="quotation-table-wrapper">
          <table className="quotation-table">
            <thead>
              <tr>
                <th>Task</th>
                {isAdmin ? <th>Provider</th> : null}
                <th>Total</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Revision</th>
                <th>Submitted</th>
                <th className="quotation-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length > 0 ? (
                filteredQuotations.map((quotation) => (
                  <tr key={quotation._id}>
                    <td>
                      <div className="quotation-task-cell">
                        <strong>{quotation.task?.title || "Untitled task"}</strong>
                        <span>{quotation.task?.description || "No task description"}</span>
                      </div>
                    </td>
                    {isAdmin ? (
                      <td className="quotation-provider-cell">
                        <strong>
                          {quotation.serviceProvider?.companyName || "-"}
                        </strong>
                        <span>
                          {quotation.serviceProvider?.contactPerson || "No contact"}
                        </span>
                      </td>
                    ) : null}
                    <td>{formatCurrency(quotation.totalAmount)}</td>
                    <td>
                      {formatDurationLabel(
                        quotation.estimatedDurationValue,
                        quotation.estimatedDurationUnit
                      )}
                    </td>
                    <td>
                      <span
                        className={`quotation-status-badge quotation-status-${getStatusTone(
                          quotation.status
                        )}`}
                      >
                        {formatStatusLabel(quotation.status)}
                      </span>
                    </td>
                    <td>Revision {quotation.revisionNumber || 1}</td>
                    <td>{formatDate(quotation.createdAt, true)}</td>
                    <td className="quotation-actions-cell">
                      <div className="quotation-action-row">
                        <button
                          type="button"
                          className="quotation-secondary-button"
                          onClick={() => handleOpenDetails(quotation._id)}
                        >
                          {isAdmin ? "Review" : "View"}
                        </button>
                        {isServiceProvider &&
                        quotation.status === "revision_requested" ? (
                          <button
                            type="button"
                            className="quotation-secondary-button"
                            onClick={() => handleStartRevision(quotation)}
                          >
                            Revise
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="quotation-empty-cell">
                    {quotations.length === 0
                      ? isAdmin
                        ? "No quotations have been submitted yet."
                        : "No quotations have been submitted from your provider account yet."
                      : "No quotations match your current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="quotation-detail-card">
        <div className="quotation-detail-header">
          <div>
            <h2>Quotation Details</h2>
            <p>
              Review pricing, revision history, and any contract that was created
              from the approved quotation.
            </p>
          </div>
        </div>

        {detailLoading ? (
          <p>Loading quotation details...</p>
        ) : detailError ? (
          <p className="quotation-page-error" role="alert">
            {detailError}
          </p>
        ) : selectedQuotation ? (
          <>
            <div className="quotation-detail-summary">
              <div className="quotation-detail-cardlet">
                <span>Task</span>
                <strong>{selectedQuotation.task?.title || "Untitled task"}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Provider</span>
                <strong>
                  {selectedQuotation.serviceProvider?.companyName || "-"}
                </strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Total</span>
                <strong>{formatCurrency(selectedQuotation.totalAmount)}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Status</span>
                <strong>{formatStatusLabel(selectedQuotation.status)}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Revision</span>
                <strong>Revision {selectedQuotation.revisionNumber || 1}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Duration</span>
                <strong>
                  {formatDurationLabel(
                    selectedQuotation.estimatedDurationValue,
                    selectedQuotation.estimatedDurationUnit
                  )}
                </strong>
              </div>
            </div>

            <div className="quotation-cost-grid">
              <div className="quotation-detail-cardlet">
                <span>Labour Cost</span>
                <strong>{formatCurrency(selectedQuotation.labourCost)}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Materials Cost</span>
                <strong>{formatCurrency(selectedQuotation.materialsCost)}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Other Cost</span>
                <strong>{formatCurrency(selectedQuotation.otherCost)}</strong>
              </div>
              <div className="quotation-detail-cardlet">
                <span>Submitted</span>
                <strong>{formatDate(selectedQuotation.createdAt, true)}</strong>
              </div>
            </div>

            <div className="quotation-notes-card">
              <h3>Quotation Notes</h3>
              <p>{selectedQuotation.notes || "No additional quotation notes were provided."}</p>
            </div>

            {selectedQuotation.adminComment ? (
              <div className="quotation-admin-comment">
                <h3>Admin Comment</h3>
                <p>{selectedQuotation.adminComment}</p>
              </div>
            ) : null}

            <div className="quotation-history-section">
              <div className="quotation-history-header">
                <h3>Revision History</h3>
                <p>
                  Each submitted quotation revision is preserved. Historical prices
                  and comments are never overwritten.
                </p>
              </div>

              <div className="quotation-history-list">
                {(selectedQuotation.revisionHistory || []).map((revision) => (
                  <article key={revision._id} className="quotation-history-item">
                    <div className="quotation-history-item-top">
                      <strong>Revision {revision.revisionNumber || 1}</strong>
                      <span
                        className={`quotation-status-badge quotation-status-${getStatusTone(
                          revision.status
                        )}`}
                      >
                        {formatStatusLabel(revision.status)}
                      </span>
                    </div>
                    <div className="quotation-history-meta">
                      <span>Total: {formatCurrency(revision.totalAmount)}</span>
                      <span>
                        Duration:{" "}
                        {formatDurationLabel(
                          revision.estimatedDurationValue,
                          revision.estimatedDurationUnit
                        )}
                      </span>
                      <span>Submitted: {formatDate(revision.createdAt, true)}</span>
                    </div>
                    {revision.adminComment ? (
                      <p className="quotation-history-comment">
                        <strong>Admin comment:</strong> {revision.adminComment}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            {isAdmin ? (
              <div className="quotation-review-panel">
                <div className="quotation-review-header">
                  <h3>Review Actions</h3>
                  <p>
                    Move the quotation into review, approve it, reject it, or
                    request a new revision from the provider.
                  </p>
                </div>

                <label className="quotation-review-label" htmlFor="reviewComment">
                  Admin Comment
                </label>
                <textarea
                  id="reviewComment"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows="4"
                  className="quotation-form-control quotation-form-textarea"
                  placeholder="Add optional guidance for approval or a required comment for rejection or revision requests."
                />

                <div className="quotation-action-row quotation-review-actions">
                  <button
                    type="button"
                    className="quotation-secondary-button"
                    disabled={submittingReview}
                    onClick={() => handleReview("under_review")}
                  >
                    Mark Under Review
                  </button>
                  <button
                    type="button"
                    className="quotation-primary-button"
                    disabled={submittingReview}
                    onClick={() => handleReview("approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="quotation-secondary-button quotation-danger-button"
                    disabled={submittingReview}
                    onClick={() => handleReview("reject")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="quotation-secondary-button quotation-warning-button"
                    disabled={submittingReview}
                    onClick={() => handleReview("request_revision")}
                  >
                    Request Revision
                  </button>
                </div>
              </div>
            ) : null}

            {isAdmin && selectedQuotation.status === "approved" ? (
              <div className="quotation-contract-panel">
                <div className="quotation-contract-inner">
                  <div className="quotation-review-header">
                    <h3>Create Contract from Approved Quotation</h3>
                    <p>
                      This creates a contract only after explicit admin confirmation.
                      Payments are not created automatically.
                    </p>
                  </div>

                  {selectedQuotation.createdContract ? (
                    <div className="quotation-existing-contract">
                      <strong>Contract created:</strong>{" "}
                      {selectedQuotation.createdContract.contractTitle ||
                        "Contract available"}
                    </div>
                  ) : (
                    <form
                      className="quotation-contract-grid"
                      onSubmit={handleCreateContractFromQuotation}
                    >
                      <div className="quotation-form-group">
                        <label htmlFor="contractTitle">Contract Title</label>
                        <input
                          id="contractTitle"
                          name="contractTitle"
                          value={contractForm.contractTitle}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control"
                          required
                        />
                      </div>

                      <div className="quotation-form-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={contractForm.startDate}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control"
                          required
                        />
                      </div>

                      <div className="quotation-form-group">
                        <label htmlFor="endDate">End Date</label>
                        <input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={contractForm.endDate}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control"
                          required
                        />
                      </div>

                      <div className="quotation-form-group">
                        <label htmlFor="contractStatus">Contract Status</label>
                        <select
                          id="contractStatus"
                          name="status"
                          value={contractForm.status}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control"
                        >
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="terminated">Terminated</option>
                          <option value="pending_renewal">Pending Renewal</option>
                        </select>
                      </div>

                      <div className="quotation-form-group quotation-form-group-wide">
                        <label htmlFor="paymentTerms">Payment Terms</label>
                        <textarea
                          id="paymentTerms"
                          name="paymentTerms"
                          rows="3"
                          value={contractForm.paymentTerms}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control quotation-form-textarea"
                          required
                        />
                      </div>

                      <div className="quotation-form-group quotation-form-group-wide">
                        <label htmlFor="contractNotes">Additional Notes</label>
                        <textarea
                          id="contractNotes"
                          name="notes"
                          rows="3"
                          value={contractForm.notes}
                          onChange={handleContractFieldChange}
                          className="quotation-form-control quotation-form-textarea"
                        />
                      </div>

                      <div className="quotation-form-actions quotation-form-group-wide">
                        <button
                          type="submit"
                          className="quotation-primary-button"
                          disabled={creatingContract}
                        >
                          {creatingContract
                            ? "Creating Contract..."
                            : "Create Contract"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="quotation-empty-detail">
            Select a quotation to review its pricing details and history.
          </p>
        )}
      </section>
    </section>
  );
}

export default Quotations;
