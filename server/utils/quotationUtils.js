const Quotation = require("../models/Quotation");
const { getProviderIdsForUser } = require("./paymentFinancials");

const QUOTATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_requested",
];

const QUOTATION_DURATION_UNITS = ["hours", "days", "weeks"];
const PROVIDER_QUOTABLE_TASK_STATUSES = ["pending", "in_progress", "overdue"];

const formatQuotationStatusLabel = (status = "") =>
  String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getQuotationScopeMatch = async (user) => {
  if (user?.role === "admin") {
    return {
      match: {},
      providerIds: [],
    };
  }

  if (user?.role === "service_provider") {
    const providerIds = await getProviderIdsForUser(user);

    if (!providerIds.length) {
      return {
        match: { _id: null },
        providerIds,
      };
    }

    return {
      match: {
        serviceProvider: { $in: providerIds },
      },
      providerIds,
    };
  }

  return null;
};

const buildLatestQuotationSummaryMap = async ({
  tasks = [],
  providerIds = [],
} = {}) => {
  const taskIds = tasks.map((task) => task?._id).filter(Boolean);

  if (!taskIds.length) {
    return new Map();
  }

  const match = {
    task: { $in: taskIds },
  };

  if (providerIds.length) {
    match.serviceProvider = { $in: providerIds };
  }

  const quotations = await Quotation.find(match)
    .select(
      "task serviceProvider status totalAmount revisionNumber createdContract createdAt updatedAt"
    )
    .sort({ task: 1, revisionNumber: -1, createdAt: -1 });

  const summaryMap = new Map();

  quotations.forEach((quotation) => {
    const taskId = String(quotation.task);

    if (summaryMap.has(taskId)) {
      return;
    }

    summaryMap.set(taskId, {
      _id: quotation._id,
      status: quotation.status,
      totalAmount: quotation.totalAmount,
      revisionNumber: quotation.revisionNumber,
      createdContract: quotation.createdContract || null,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    });
  });

  return summaryMap;
};

const attachLatestQuotationSummaryToTasks = async ({
  tasks = [],
  includeSummary = false,
  providerIds = [],
} = {}) => {
  if (!includeSummary || !tasks.length) {
    return tasks.map((task) =>
      typeof task.toObject === "function" ? task.toObject() : { ...task }
    );
  }

  const summaryMap = await buildLatestQuotationSummaryMap({ tasks, providerIds });

  return tasks.map((task) => {
    const taskObject =
      typeof task.toObject === "function" ? task.toObject() : { ...task };

    return {
      ...taskObject,
      latestQuotation: summaryMap.get(String(taskObject._id)) || null,
    };
  });
};

module.exports = {
  QUOTATION_STATUSES,
  QUOTATION_DURATION_UNITS,
  PROVIDER_QUOTABLE_TASK_STATUSES,
  formatQuotationStatusLabel,
  getQuotationScopeMatch,
  buildLatestQuotationSummaryMap,
  attachLatestQuotationSummaryToTasks,
};
