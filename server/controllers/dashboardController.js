const ServiceProvider = require("../models/ServiceProvider");
const Task = require("../models/Task");
const Complaint = require("../models/Complaint");
const Contract = require("../models/Contract");
const Payment = require("../models/Payment");

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

module.exports = {
  getDashboardStats,
};