const ServiceProvider = require("../models/ServiceProvider");
const Task = require("../models/Task");
const Complaint = require("../models/Complaint");
const Contract = require("../models/Contract");
const Payment = require("../models/Payment");
const Quotation = require("../models/Quotation");

const complaintStatuses = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

const taskStatuses = [
  "pending",
  "in_progress",
  "completed",
  "overdue",
  "cancelled",
];

const providerVerificationStatuses = ["pending", "approved", "rejected"];

const formatStatusLabel = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getUtcMonthStart = (year, monthIndex) =>
  new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));

const getRecentSixMonthBuckets = () => {
  const now = new Date();
  const currentMonthStart = getUtcMonthStart(
    now.getUTCFullYear(),
    now.getUTCMonth()
  );
  const buckets = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const start = getUtcMonthStart(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - offset
    );

    buckets.push({
      key: `${start.getUTCFullYear()}-${String(
        start.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      month: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(start),
      start,
      end: getUtcMonthStart(
        start.getUTCFullYear(),
        start.getUTCMonth() + 1
      ),
    });
  }

  return buckets;
};

const getMonthlyBounds = () => {
  const buckets = getRecentSixMonthBuckets();

  return {
    buckets,
    start: buckets[0].start,
    end: buckets[buckets.length - 1].end,
  };
};

const mergeMonthlyCounts = (buckets, groupedRows, valueKey) => {
  const rowMap = new Map(
    groupedRows.map((row) => [row._id, Number(row.total) || 0])
  );

  return buckets.map((bucket) => ({
    key: bucket.key,
    month: bucket.month,
    [valueKey]: rowMap.get(bucket.key) || 0,
  }));
};

const buildStatusChartData = (statuses, groupedRows) => {
  const rowMap = new Map(
    groupedRows.map((row) => [row._id, Number(row.value) || 0])
  );

  return statuses
    .map((status) => ({
      key: status,
      name: formatStatusLabel(status),
      value: rowMap.get(status) || 0,
    }))
    .filter((item) => item.value > 0);
};

const aggregateStatusCounts = (Model, match, statuses) =>
  Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        value: { $sum: 1 },
      },
    },
    {
      $match: {
        _id: { $in: statuses },
      },
    },
  ]);

const aggregateMonthlyCounts = (Model, match, dateField, valueExpression = 1) => {
  const { start, end } = getMonthlyBounds();

  return Model.aggregate([
    {
      $match: {
        ...match,
        [dateField]: {
          $gte: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: `$${dateField}`,
            timezone: "UTC",
          },
        },
        total: {
          $sum: valueExpression,
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const buildMonthlyCountChart = async (Model, match, dateField, responseKey) => {
  const { buckets } = getMonthlyBounds();
  const groupedRows = await aggregateMonthlyCounts(Model, match, dateField);

  return mergeMonthlyCounts(buckets, groupedRows, responseKey);
};

const buildMonthlyAmountChart = async (Model, match, dateField) => {
  const { buckets } = getMonthlyBounds();
  const groupedRows = await aggregateMonthlyCounts(
    Model,
    match,
    dateField,
    "$amount"
  );

  return mergeMonthlyCounts(buckets, groupedRows, "amount");
};

const resolveProviderIdsForUser = async (user) => {
  const providerEmail = String(user?.email || "").trim().toLowerCase();

  if (!providerEmail) {
    return [];
  }

  const providers = await ServiceProvider.find({
    email: providerEmail,
  }).select("_id");

  return providers.map((provider) => provider._id);
};

const getDashboardStats = async (req, res) => {
  try {
    const totalProviders = await ServiceProvider.countDocuments();
    const approvedProviders = await ServiceProvider.countDocuments({
      verificationStatus: "approved",
    });

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "pending" });
    const completedTasks = await Task.countDocuments({ status: "completed" });
    const overdueTasks = await Task.countDocuments({ status: "overdue" });

    const totalComplaints = await Complaint.countDocuments();
    const openComplaints = await Complaint.countDocuments({ status: "open" });
    const resolvedComplaints = await Complaint.countDocuments({
      status: "resolved",
    });

    const activeContracts = await Contract.countDocuments({
      status: "active",
    });

    const totalPayments = await Payment.aggregate([
      {
        $match: {
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$amount",
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        providers: {
          total: totalProviders,
          approved: approvedProviders,
        },
        tasks: {
          total: totalTasks,
          pending: pendingTasks,
          completed: completedTasks,
          overdue: overdueTasks,
        },
        complaints: {
          total: totalComplaints,
          open: openComplaints,
          resolved: resolvedComplaints,
        },
        contracts: {
          active: activeContracts,
        },
        payments: {
          totalPaid: totalPayments[0]?.totalAmount || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

const getDashboardAnalytics = async (req, res) => {
  try {
    if (req.user?.role === "admin") {
      const [
        complaintsByStatusRows,
        tasksByStatusRows,
        complaintsTrend,
        paymentsTrend,
        pendingQuotations,
        revisionRequestedQuotations,
        approvedQuotations,
      ] = await Promise.all([
        aggregateStatusCounts(Complaint, {}, complaintStatuses),
        aggregateStatusCounts(Task, {}, taskStatuses),
        buildMonthlyCountChart(Complaint, {}, "createdAt", "count"),
        buildMonthlyAmountChart(Payment, { status: "paid" }, "paymentDate"),
        Quotation.countDocuments({
          status: { $in: ["submitted", "under_review"] },
        }),
        Quotation.countDocuments({ status: "revision_requested" }),
        Quotation.countDocuments({ status: "approved" }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role: "admin",
          summaries: {
            quotations: {
              pendingReview: pendingQuotations,
              revisionRequested: revisionRequestedQuotations,
              approved: approvedQuotations,
            },
          },
          charts: {
            complaintsByStatus: buildStatusChartData(
              complaintStatuses,
              complaintsByStatusRows
            ),
            complaintsTrend,
            tasksByStatus: buildStatusChartData(taskStatuses, tasksByStatusRows),
            paymentsTrend,
          },
        },
      });
    }

    if (req.user?.role === "resident") {
      const residentMatch = { resident: req.user._id };
      const [complaintsByStatusRows, complaintsTrend] = await Promise.all([
        aggregateStatusCounts(Complaint, residentMatch, complaintStatuses),
        buildMonthlyCountChart(
          Complaint,
          residentMatch,
          "createdAt",
          "count"
        ),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role: "resident",
          summaries: {},
          charts: {
            complaintsByStatus: buildStatusChartData(
              complaintStatuses,
              complaintsByStatusRows
            ),
            complaintsTrend,
          },
        },
      });
    }

    if (req.user?.role === "service_provider") {
      const providerIds = await resolveProviderIdsForUser(req.user);

      if (!providerIds.length) {
        const { buckets } = getMonthlyBounds();

        return res.status(200).json({
          success: true,
          data: {
            role: "service_provider",
            summaries: {
              quotations: {
                submitted: 0,
                revisionRequested: 0,
                approved: 0,
              },
            },
            charts: {
              tasksByStatus: [],
              completedTasksTrend: buckets.map((bucket) => ({
                key: bucket.key,
                month: bucket.month,
                count: 0,
              })),
              paymentsTrend: buckets.map((bucket) => ({
                key: bucket.key,
                month: bucket.month,
                amount: 0,
              })),
            },
          },
        });
      }

      const providerMatch = {
        serviceProvider: { $in: providerIds },
      };

      const [
        providerSubmittedQuotations,
        providerRevisionRequestedQuotations,
        providerApprovedQuotations,
      ] = await Promise.all([
        Quotation.countDocuments({
          ...providerMatch,
          status: "submitted",
        }),
        Quotation.countDocuments({
          ...providerMatch,
          status: "revision_requested",
        }),
        Quotation.countDocuments({
          ...providerMatch,
          status: "approved",
        }),
      ]);

      const [tasksByStatusRows, completedTasksTrend, paymentsTrend] =
        await Promise.all([
          aggregateStatusCounts(Task, providerMatch, taskStatuses),
          buildMonthlyCountChart(
            Task,
            {
              ...providerMatch,
              status: "completed",
              completedAt: { $type: "date" },
            },
            "completedAt",
            "count"
          ),
          buildMonthlyAmountChart(
            Payment,
            {
              ...providerMatch,
              status: "paid",
            },
            "paymentDate"
          ),
        ]);

      return res.status(200).json({
        success: true,
        data: {
          role: "service_provider",
          summaries: {
            quotations: {
              submitted: providerSubmittedQuotations,
              revisionRequested: providerRevisionRequestedQuotations,
              approved: providerApprovedQuotations,
            },
          },
          charts: {
            tasksByStatus: buildStatusChartData(taskStatuses, tasksByStatusRows),
            completedTasksTrend,
            paymentsTrend,
          },
        },
      });
    }

    return res.status(403).json({
      success: false,
      message: "You are not authorized to access dashboard analytics.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardAnalytics,
};
