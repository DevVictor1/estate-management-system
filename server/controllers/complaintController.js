const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const ServiceProvider = require("../models/ServiceProvider");
const User = require("../models/User");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  buildComplaintSubmittedEmail,
} = require("../emailTemplates/complaintSubmitted");
const { isEmailVerified } = require("../utils/emailVerification");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getComplaintNotificationRecipients = async () => {
  const { emailAdminRecipient } = getEmailConfig();
  const overrideRecipient = String(emailAdminRecipient || "").trim();

  console.log(
    `Complaint notification recipient resolution: admin override configured: ${overrideRecipient ? "yes" : "no"}`
  );

  if (overrideRecipient) {
    if (!isValidEmail(overrideRecipient)) {
      console.warn(
        "Complaint notification recipient resolution: recipient source: environment override, recipient count: 0"
      );

      return {
        source: "environment override",
        recipients: [],
      };
    }

    console.log(
      "Complaint notification recipient resolution: recipient source: environment override, recipient count: 1"
    );

    return {
      source: "environment override",
      recipients: [overrideRecipient],
    };
  }

  const adminUsers = await User.find({
    role: "admin",
    isActive: true,
    emailVerified: { $ne: false },
  }).select("email");

  const recipients = [
    ...new Set(
      adminUsers
        .map((admin) => String(admin.email || "").trim())
        .filter(Boolean)
        .filter(isValidEmail)
    ),
  ];

  console.log(
    `Complaint notification recipient resolution: recipient source: database, recipient count: ${recipients.length}`
  );

  return {
    source: "database",
    recipients,
  };
};

const getComplaintsReviewUrl = () => {
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl || !/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/$/, "")}/complaints`;
};

const createComplaint = async (req, res) => {
  try {
    const isResidentComplaint = req.user?.role === "resident";
    const complaintData =
      isResidentComplaint
        ? {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            priority: req.body.priority,
            resident: req.user._id,
            status: "open",
          }
        : { ...req.body };

    const complaint = await Complaint.create(complaintData);

    if (isResidentComplaint) {
      try {
        const { recipients } = await getComplaintNotificationRecipients();

        if (!recipients.length) {
          console.warn(
            "Complaint created, but admin notification email was skipped because no valid recipient was configured."
          );
        } else {
          const template = buildComplaintSubmittedEmail({
            complaintTitle: complaint.title,
            description: complaint.description,
            category: complaint.category,
            priority: complaint.priority,
            residentName: req.user?.fullName,
            apartmentNumber: req.user?.apartmentNumber,
            submittedAt: complaint.createdAt,
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
              "Complaint created, but admin notification email failed."
            );
          }
        }
      } catch (emailError) {
        console.warn(
          "Complaint created, but admin notification email failed."
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create complaint",
      error: error.message,
    });
  }
};

const getComplaints = async (req, res) => {
  try {
    const complaintQuery =
      req.user?.role === "resident"
        ? { resident: req.user._id }
        : {};

    const complaints = await Complaint.find(complaintQuery)
      .populate("resident", "fullName email apartmentNumber")
      .populate("serviceProvider", "companyName serviceCategory")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaintQuery =
      req.user?.role === "resident"
        ? { _id: req.params.id, resident: req.user._id }
        : { _id: req.params.id };

    const complaint = await Complaint.findOne(complaintQuery)
      .populate("resident", "fullName email apartmentNumber")
      .populate("serviceProvider", "companyName serviceCategory");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaint",
      error: error.message,
    });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "serviceProvider",
      "category",
      "priority",
      "status",
      "resolutionNote",
    ];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.serviceProvider !== undefined && updateData.serviceProvider !== null && updateData.serviceProvider !== "") {
      if (!mongoose.Types.ObjectId.isValid(updateData.serviceProvider)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service provider ID.",
        });
      }

      const serviceProvider = await ServiceProvider.findById(
        updateData.serviceProvider
      ).select("_id");

      if (!serviceProvider) {
        return res.status(404).json({
          success: false,
          message: "Service provider not found.",
        });
      }
    }

    if (updateData.serviceProvider === "") {
      updateData.serviceProvider = null;
    }

    if (updateData.status === "resolved") {
      updateData.resolvedAt = new Date();
    } else if (updateData.status && updateData.status !== "resolved") {
      updateData.resolvedAt = null;
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update complaint",
      error: error.message,
    });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete complaint",
      error: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
};
