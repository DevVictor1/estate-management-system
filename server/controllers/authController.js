const jwt = require("jsonwebtoken");
const ServiceProvider = require("../models/ServiceProvider");
const User = require("../models/User");

const allowedServiceCategories = [
  "security",
  "cleaning",
  "waste_management",
  "landscaping",
  "maintenance",
  "other",
];

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      estateName,
      apartmentNumber,
      serviceCategory,
      customServiceCategory,
      address,
    } = req.body;

    // Admin accounts must never be created through the public registration flow.
    const safeRole = role === "service_provider" ? "service_provider" : "resident";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: safeRole,
      estateName,
      apartmentNumber,
    });

    if (safeRole === "service_provider") {
      try {
        const safeServiceCategory = allowedServiceCategories.includes(serviceCategory)
          ? serviceCategory
          : "other";

        // Service provider accounts start in a pending state until an admin approves them.
        await ServiceProvider.create({
          companyName: fullName,
          contactPerson: fullName,
          email,
          phone,
          serviceCategory: safeServiceCategory,
          address,
          verificationStatus: "pending",
          notes:
            safeServiceCategory === "other" && customServiceCategory
              ? customServiceCategory
              : undefined,
        });
      } catch (providerError) {
        await User.findByIdAndDelete(user._id);

        return res.status(500).json({
          success: false,
          message: "Failed to complete service provider registration",
        });
      }
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is missing. Please add it to your .env file.",
      });
    }

    const token = generateToken(user._id);

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      estateName: user.estateName,
      apartmentNumber: user.apartmentNumber,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      data: userData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is missing. Please add it to your .env file.",
      });
    }

    const token = generateToken(user._id);

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      estateName: user.estateName,
      apartmentNumber: user.apartmentNumber,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: userData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to login user",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile fetched successfully",
    data: req.user,
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
