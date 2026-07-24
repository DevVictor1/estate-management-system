const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const Task = require("../models/Task");

const providerAllowedStatuses = ["pending", "in_progress", "completed"];
const creatableStatuses = ["pending", "in_progress", "overdue", "cancelled"];

const applyTaskPopulates = (query, userRole) => {
  query
    .populate("serviceProvider", "companyName serviceCategory phone email")
    .populate("assignedBy", "fullName email role");

  if (userRole === "admin") {
    query.populate({
      path: "complaint",
      select: "title category priority status resident",
      populate: {
        path: "resident",
        select: "fullName email apartmentNumber",
      },
    });
  }

  return query;
};

const createTask = async (req, res) => {
  try {
    const complaintId = req.body.complaint;

    if (complaintId !== undefined && complaintId !== null && complaintId !== "") {
      if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID.",
        });
      }

      const complaint = await Complaint.findById(complaintId).select("_id");

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found.",
        });
      }

      const existingTask = await Task.findOne({ complaint: complaintId }).select("_id");

      if (existingTask) {
        return res.status(409).json({
          success: false,
          message: "A task has already been created for this complaint.",
        });
      }
    }

    if (req.body.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "A new task cannot be created with completed status.",
      });
    }

    if (
      req.body.status !== undefined &&
      req.body.status !== null &&
      req.body.status !== "" &&
      !creatableStatuses.includes(req.body.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid task status. Allowed values are pending, in_progress, overdue, and cancelled.",
      });
    }

    const taskData = {
      title: req.body.title,
      description: req.body.description,
      serviceProvider: req.body.serviceProvider,
      deadline: req.body.deadline,
      priority: req.body.priority,
      assignedBy: req.user._id,
      complaint: complaintId || null,
    };

    if (req.body.status) {
      taskData.status = req.body.status;
    }

    if (req.body.completionNote) {
      taskData.completionNote = req.body.completionNote;
    }

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      data: task,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.complaint) {
      return res.status(409).json({
        success: false,
        message: "A task has already been created for this complaint.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to assign task",
      error: error.message,
    });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await applyTaskPopulates(
      Task.find().sort({ createdAt: -1 }),
      req.user?.role
    );

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await applyTaskPopulates(
      Task.findById(req.params.id),
      req.user?.role
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.status === "completed") {
      updateData.completedAt = new Date();
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
};

const updateOwnTaskStatus = async (req, res) => {
  try {
    const requestKeys = Object.keys(req.body || {});

    if (requestKeys.length !== 1 || requestKeys[0] !== "status") {
      return res.status(400).json({
        success: false,
        message: "Only the status field can be updated on this endpoint.",
      });
    }

    const { status } = req.body;

    if (!providerAllowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed values are pending, in_progress, and completed.",
      });
    }

    const task = await Task.findById(req.params.id).populate(
      "serviceProvider",
      "companyName serviceCategory phone email"
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const assignedProviderEmail = task.serviceProvider?.email?.trim().toLowerCase();
    const loggedInUserEmail = req.user?.email?.trim().toLowerCase();

    if (!assignedProviderEmail || !loggedInUserEmail) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this task.",
      });
    }

    if (assignedProviderEmail !== loggedInUserEmail) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this task.",
      });
    }

    task.status = status;
    task.completedAt = status === "completed" ? new Date() : null;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("serviceProvider", "companyName serviceCategory phone email")
      .populate("assignedBy", "fullName email role");

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task status",
      error: error.message,
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateOwnTaskStatus,
  deleteTask,
};
