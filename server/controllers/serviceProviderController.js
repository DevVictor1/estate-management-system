const ServiceProvider = require("../models/ServiceProvider");

const createServiceProvider = async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.create(req.body);

    res.status(201).json({
      success: true,
      message: "Service provider registered successfully",
      data: serviceProvider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register service provider",
      error: error.message,
    });
  }
};

const getServiceProviders = async (req, res) => {
  try {
    const serviceProviders = await ServiceProvider.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: serviceProviders.length,
      data: serviceProviders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch service providers",
      error: error.message,
    });
  }
};

const getServiceProviderById = async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findById(req.params.id);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    res.status(200).json({
      success: true,
      data: serviceProvider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch service provider",
      error: error.message,
    });
  }
};

const updateServiceProvider = async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service provider updated successfully",
      data: serviceProvider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update service provider",
      error: error.message,
    });
  }
};

const deleteServiceProvider = async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findByIdAndDelete(
      req.params.id
    );

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service provider deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete service provider",
      error: error.message,
    });
  }
};

module.exports = {
  createServiceProvider,
  getServiceProviders,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
};