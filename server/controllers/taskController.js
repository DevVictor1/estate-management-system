const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const ServiceProvider = require("../models/ServiceProvider");
const Task = require("../models/Task");
const User = require("../models/User");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const { buildTaskAssignedEmail } = require("../emailTemplates/taskAssigned");
const { buildTaskCompletedEmail } = require("../emailTemplates/taskCompleted");
const { isEmailVerified } = require("../utils/emailVerification");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");

const providerAllowedStatuses = ["pending", "in_progress", "completed"];
const creatableStatuses = ["pending", "in_progress", "overdue", "cancelled"];
const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getNormalizedEmail = (value = "") => String(value || "").trim().toLowerCase();

const buildProviderTaskQuery = async (user) => {
  const providerEmail = getNormalizedEmail(user?.email);

  if (!providerEmail) {
    return { _id: null };
  }

  const providerRecords = await ServiceProvider.find({
    email: providerEmail,
  }).select("_id");

  if (!providerRecords.length) {
    return { _id: null };
  }

  return {
    serviceProvider: {
      $in: providerRecords.map((provider) => provider._id),
    },
  };
};

const getTaskQueryForUser = async (user) => {
  if (user?.role === "admin") {
    return {};
  }

  if (user?.role === "resident") {
    return {};
  }

  if (user?.role === "service_provider") {
    return buildProviderTaskQuery(user);
  }

  return null;
};

const buildComplaintSelect = (fields = []) => [
  ...new Set(fields.filter(Boolean)),
].join(" ");

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
  } else if (userRole === "service_provider") {
    query.populate({
      path: "complaint",
      select: buildComplaintSelect(["title", "attachments"]),
    });
  }

  return query;
};

const getTasksReviewUrl = () => {
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl || !/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/$/, "")}/tasks`;
};

const getComplaintsReviewUrl = () => {
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl || !/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/$/, "")}/complaints`;
};

const getTaskAssignmentRecipient = (providerEmail) => {
  const { emailProviderRecipient } = getEmailConfig();
  return resolveVerifiedUserEmailRecipient({
    overrideRecipient: emailProviderRecipient,
    databaseEmail: providerEmail,
    role: "service_provider",
  }).then((recipients) => {
    const source = emailProviderRecipient ? "environment override" : "provider database";

    console.log(
      `Task assignment recipient resolution: provider override configured: ${
        emailProviderRecipient ? "yes" : "no"
      }`
    );
    console.log(
      `Task assignment recipient resolution: recipient source: ${source}, recipient count: ${recipients.length}`
    );

    return {
      source,
      recipients,
    };
  });
};

const getTaskCompletionRecipient = (residentEmail) => {
  const { emailResidentRecipient } = getEmailConfig();
  const source = emailResidentRecipient ? "environment override" : "resident database";

  console.log(
    `Task completion recipient resolution: resident override configured: ${emailResidentRecipient ? "yes" : "no"}`
  );

  if (emailResidentRecipient) {
    const recipients = isValidEmail(String(emailResidentRecipient || "").trim())
      ? [String(emailResidentRecipient || "").trim()]
      : [];

    console.log(
      `Task completion recipient resolution: recipient source: ${source}, recipient count: ${recipients.length}`
    );

    return {
      source,
      recipients,
    };
  }

  const normalizedResidentEmail = String(residentEmail || "").trim();
  const recipients = isValidEmail(normalizedResidentEmail)
    ? [normalizedResidentEmail]
    : [];

  console.log(
    `Task completion recipient resolution: recipient source: ${source}, recipient count: ${recipients.length}`
  );

  return {
    source,
    recipients,
  };
};

const createTask = async (req, res) => {
  try {
    const complaintId = req.body.complaint;
    let linkedComplaint = null;

    if (complaintId !== undefined && complaintId !== null && complaintId !== "") {
      if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID.",
        });
      }

      linkedComplaint = await Complaint.findById(complaintId)
        .select("title category resident")
        .populate("resident", "apartmentNumber");

      if (!linkedComplaint) {
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

    try {
      const provider = await ServiceProvider.findById(task.serviceProvider).select(
        "companyName contactPerson email phone serviceCategory"
      );

      if (!provider) {
        console.warn(
          "Task created, but provider assignment email was skipped because the provider record could not be found."
        );
      } else {
        const { recipients } = await getTaskAssignmentRecipient(provider.email);

        if (!recipients.length) {
          console.warn(
            "Task created, but provider assignment email was skipped because no valid recipient was configured."
          );
        } else {
          const template = buildTaskAssignedEmail({
            providerName: provider.contactPerson || provider.companyName,
            taskTitle: task.title,
            taskDescription: task.description,
            priority: task.priority,
            deadline: task.deadline,
            taskStatus: task.status,
            complaintTitle: linkedComplaint?.title,
            complaintCategory: linkedComplaint?.category,
            apartmentNumber: linkedComplaint?.resident?.apartmentNumber,
            reviewUrl: getTasksReviewUrl(),
          });

          const emailResult = await sendEmail({
            to: recipients,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });

          if (!emailResult.success) {
            console.warn("Task created, but provider assignment email failed.");
          }
        }
      }
    } catch (emailError) {
      console.warn("Task created, but provider assignment email failed.");
    }

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
    const taskQuery = await getTaskQueryForUser(req.user);

    if (taskQuery === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    const tasks = await applyTaskPopulates(
      Task.find(taskQuery).sort({ createdAt: -1 }),
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
    const taskQuery = await getTaskQueryForUser(req.user);

    if (taskQuery === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    const task = await applyTaskPopulates(
      Task.findOne({ ...taskQuery, _id: req.params.id }),
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

    const previousStatus = task.status;

    task.status = status;
    task.completedAt = status === "completed" ? new Date() : null;

    await task.save();

    if (previousStatus !== "completed" && status === "completed") {
      try {
        if (!task.complaint) {
          console.warn(
            "Task completed, but resident notification email was skipped because the task has no linked complaint."
          );
        } else {
          const linkedComplaint = await Complaint.findById(task.complaint)
            .select("title resident")
            .populate("resident", "fullName email apartmentNumber emailVerified");

          if (!linkedComplaint) {
            console.warn(
              "Task completed, but resident notification email was skipped because the linked complaint could not be found."
            );
          } else if (!linkedComplaint.resident) {
            console.warn(
              "Task completed, but resident notification email was skipped because the linked resident could not be found."
            );
          } else {
            const { recipients } = getTaskCompletionRecipient(
              isEmailVerified(linkedComplaint.resident)
                ? linkedComplaint.resident.email
                : ""
            );

            if (!recipients.length) {
              console.warn(
                "Task completed, but resident notification email was skipped because no valid recipient was configured."
              );
            } else {
              const template = buildTaskCompletedEmail({
                residentName: linkedComplaint.resident.fullName,
                taskTitle: task.title,
                taskDescription: task.description,
                complaintTitle: linkedComplaint.title,
                serviceProviderName:
                  task.serviceProvider?.companyName || "Assigned service provider",
                completionNote: task.completionNote,
                completedAt: task.completedAt,
                reviewUrl: getComplaintsReviewUrl(),
              });

              const emailResult = await sendEmail({
                to: recipients,
                subject: template.subject,
                html: template.html,
                text: template.text,
              });

              if (!emailResult.success) {
                console.warn(
                  "Task completed, but resident notification email failed."
                );
              }
            }
          }
        }
      } catch (emailError) {
        console.warn("Task completed, but resident notification email failed.");
      }
    }

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
