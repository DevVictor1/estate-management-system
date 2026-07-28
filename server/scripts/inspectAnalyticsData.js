require("dotenv").config();

const mongoose = require("mongoose");

const Complaint = require("../models/Complaint");
const Task = require("../models/Task");
const Payment = require("../models/Payment");

const getRecentSixMonthRange = () => {
  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const rangeStart = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 5,
      1,
      0,
      0,
      0,
      0
    )
  );
  const rangeEnd = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0
    )
  );

  return { rangeStart, rangeEnd };
};

const formatDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "none";
  }

  return value.toISOString();
};

const printSection = (title, lines) => {
  console.log(`\n${title}`);
  lines.forEach((line) => console.log(`- ${line}`));
};

const inspectComplaints = async (rangeStart, rangeEnd) => {
  const [totals] = await Complaint.aggregate([
    {
      $facet: {
        total: [{ $count: "value" }],
        withCreatedAt: [
          { $match: { createdAt: { $type: "date" } } },
          { $count: "value" },
        ],
        withoutCreatedAt: [
          {
            $match: {
              $or: [
                { createdAt: { $exists: false } },
                { createdAt: null },
                { createdAt: { $not: { $type: "date" } } },
              ],
            },
          },
          { $count: "value" },
        ],
        withinRange: [
          {
            $match: {
              createdAt: {
                $type: "date",
                $gte: rangeStart,
                $lt: rangeEnd,
              },
            },
          },
          { $count: "value" },
        ],
        oldest: [
          { $match: { createdAt: { $type: "date" } } },
          { $sort: { createdAt: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, createdAt: 1 } },
        ],
        newest: [
          { $match: { createdAt: { $type: "date" } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, createdAt: 1 } },
        ],
      },
    },
  ]);

  return {
    total: totals.total[0]?.value || 0,
    withCreatedAt: totals.withCreatedAt[0]?.value || 0,
    withoutCreatedAt: totals.withoutCreatedAt[0]?.value || 0,
    withinRange: totals.withinRange[0]?.value || 0,
    oldest: totals.oldest[0]?.createdAt || null,
    newest: totals.newest[0]?.createdAt || null,
  };
};

const inspectTasks = async (rangeStart, rangeEnd) => {
  const [totals] = await Task.aggregate([
    {
      $match: {
        status: "completed",
      },
    },
    {
      $facet: {
        total: [{ $count: "value" }],
        withCompletedAt: [
          { $match: { completedAt: { $type: "date" } } },
          { $count: "value" },
        ],
        withoutCompletedAt: [
          {
            $match: {
              $or: [
                { completedAt: { $exists: false } },
                { completedAt: null },
                { completedAt: { $not: { $type: "date" } } },
              ],
            },
          },
          { $count: "value" },
        ],
        withinRange: [
          {
            $match: {
              completedAt: {
                $type: "date",
                $gte: rangeStart,
                $lt: rangeEnd,
              },
            },
          },
          { $count: "value" },
        ],
      },
    },
  ]);

  return {
    total: totals.total[0]?.value || 0,
    withCompletedAt: totals.withCompletedAt[0]?.value || 0,
    withoutCompletedAt: totals.withoutCompletedAt[0]?.value || 0,
    withinRange: totals.withinRange[0]?.value || 0,
  };
};

const inspectPayments = async (rangeStart, rangeEnd) => {
  const [totals] = await Payment.aggregate([
    {
      $facet: {
        total: [{ $count: "value" }],
        withPaymentDate: [
          { $match: { paymentDate: { $type: "date" } } },
          { $count: "value" },
        ],
        withoutPaymentDate: [
          {
            $match: {
              $or: [
                { paymentDate: { $exists: false } },
                { paymentDate: null },
                { paymentDate: { $not: { $type: "date" } } },
              ],
            },
          },
          { $count: "value" },
        ],
        statusCounts: [
          {
            $group: {
              _id: "$status",
              value: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        linkedToServiceProvider: [
          {
            $match: {
              serviceProvider: { $type: "objectId" },
            },
          },
          { $count: "value" },
        ],
        withinRange: [
          {
            $match: {
              paymentDate: {
                $type: "date",
                $gte: rangeStart,
                $lt: rangeEnd,
              },
            },
          },
          { $count: "value" },
        ],
      },
    },
  ]);

  return {
    total: totals.total[0]?.value || 0,
    withPaymentDate: totals.withPaymentDate[0]?.value || 0,
    withoutPaymentDate: totals.withoutPaymentDate[0]?.value || 0,
    statusCounts: totals.statusCounts || [],
    linkedToServiceProvider: totals.linkedToServiceProvider[0]?.value || 0,
    withinRange: totals.withinRange[0]?.value || 0,
  };
};

const main = async () => {
  const { rangeStart, rangeEnd } = getRecentSixMonthRange();

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const [complaints, tasks, payments] = await Promise.all([
    inspectComplaints(rangeStart, rangeEnd),
    inspectTasks(rangeStart, rangeEnd),
    inspectPayments(rangeStart, rangeEnd),
  ]);

  printSection("Complaints", [
    `total complaint count: ${complaints.total}`,
    `count with createdAt: ${complaints.withCreatedAt}`,
    `count without createdAt: ${complaints.withoutCreatedAt}`,
    `count within current six-month range: ${complaints.withinRange}`,
    `oldest createdAt: ${formatDate(complaints.oldest)}`,
    `newest createdAt: ${formatDate(complaints.newest)}`,
  ]);

  printSection("Tasks", [
    `total completed task count: ${tasks.total}`,
    `completed tasks with completedAt: ${tasks.withCompletedAt}`,
    `completed tasks without completedAt: ${tasks.withoutCompletedAt}`,
    `completed tasks within current six-month range: ${tasks.withinRange}`,
  ]);

  printSection("Payments", [
    `total payment count: ${payments.total}`,
    `count with paymentDate: ${payments.withPaymentDate}`,
    `count without paymentDate: ${payments.withoutPaymentDate}`,
    `count linked to serviceProvider: ${payments.linkedToServiceProvider}`,
    `count within current six-month range: ${payments.withinRange}`,
    `counts grouped by status: ${
      payments.statusCounts.length
        ? payments.statusCounts
            .map((row) => `${row._id || "unknown"}=${row.value}`)
            .join(", ")
        : "none"
    }`,
  ]);
};

main()
  .catch((error) => {
    console.error(`Analytics inspection failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
