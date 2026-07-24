const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const ServiceProvider = require("../models/ServiceProvider");

const createComplaint = async (req, res) => {
  try {
    const complaintData =
      req.user?.role === "resident"
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
