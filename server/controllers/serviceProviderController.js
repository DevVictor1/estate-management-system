const ServiceProvider = require("../models/ServiceProvider");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  buildProviderApprovedEmail,
} = require("../emailTemplates/providerApproved");
const {
  buildProviderRejectedEmail,
} = require("../emailTemplates/providerRejected");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");

const paymentAccountTypes = ["savings", "current", "corporate", "other"];
const paymentMethods = [
  "bank_transfer",
  "cash",
  "cheque",
  "wallet",
  "other",
];
const adminEditableFields = [
  "companyName",
  "contactPerson",
  "email",
  "phone",
  "serviceCategory",
  "address",
  "verificationStatus",
  "notes",
];
const providerPaymentDetailFields = [
  "bankName",
  "accountName",
  "accountNumber",
  "accountType",
  "preferredPaymentMethod",
  "paystackRecipientCode",
];

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const trimStringValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const normalizeOptionalString = (value, maximumLength) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return { error: "Payment details must be provided as text values." };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length > maximumLength) {
    return {
      error: `Payment details must be no longer than ${maximumLength} characters.`,
    };
  }

  return trimmedValue;
};

const normalizeAccountNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return { error: "Account number must be provided as text." };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (!/^[\d\s-]+$/.test(trimmedValue)) {
    return {
      error:
        "Account number may contain only digits, spaces, or hyphens.",
    };
  }

  const digitsOnlyValue = trimmedValue.replace(/[^\d]/g, "");

  if (digitsOnlyValue.length < 8 || digitsOnlyValue.length > 20) {
    return {
      error: "Account number must contain between 8 and 20 digits.",
    };
  }

  return digitsOnlyValue;
};

const sanitizePaymentDetailsInput = (payload = {}, { rejectUnknownFields } = {}) => {
  const input = payload && typeof payload === "object" ? payload : {};
  const unexpectedFields = Object.keys(input).filter(
    (field) => !providerPaymentDetailFields.includes(field)
  );

  if (rejectUnknownFields && unexpectedFields.length) {
    return {
      error: `Unsupported payment details field: ${unexpectedFields[0]}.`,
    };
  }

  const bankName = normalizeOptionalString(input.bankName, 120);
  if (bankName?.error) {
    return bankName;
  }

  const accountName = normalizeOptionalString(input.accountName, 150);
  if (accountName?.error) {
    return accountName;
  }

  const accountNumber = normalizeAccountNumber(input.accountNumber);
  if (accountNumber?.error) {
    return accountNumber;
  }

  const paystackRecipientCode = normalizeOptionalString(
    input.paystackRecipientCode,
    120
  );
  if (paystackRecipientCode?.error) {
    return paystackRecipientCode;
  }

  const nextAccountType = trimStringValue(input.accountType);
  if (
    nextAccountType &&
    !paymentAccountTypes.includes(String(nextAccountType).toLowerCase())
  ) {
    return {
      error: "Please select a valid account type.",
    };
  }

  const nextPreferredPaymentMethod = trimStringValue(input.preferredPaymentMethod);
  if (
    nextPreferredPaymentMethod &&
    !paymentMethods.includes(String(nextPreferredPaymentMethod).toLowerCase())
  ) {
    return {
      error: "Please select a valid preferred payment method.",
    };
  }

  return {
    paymentDetails: {
      bankName:
        bankName === undefined ? undefined : bankName || undefined,
      accountName:
        accountName === undefined ? undefined : accountName || undefined,
      accountNumber:
        accountNumber === undefined ? undefined : accountNumber || undefined,
      accountType: nextAccountType
        ? String(nextAccountType).toLowerCase()
        : nextAccountType === ""
        ? undefined
        : undefined,
      preferredPaymentMethod: nextPreferredPaymentMethod
        ? String(nextPreferredPaymentMethod).toLowerCase()
        : nextPreferredPaymentMethod === ""
        ? undefined
        : undefined,
      paystackRecipientCode:
        paystackRecipientCode === undefined
          ? undefined
          : paystackRecipientCode || undefined,
      updatedAt: new Date(),
    },
  };
};

const serializePaymentDetails = (paymentDetails) => {
  if (!paymentDetails) {
    return undefined;
  }

  const source = paymentDetails.toObject ? paymentDetails.toObject() : paymentDetails;

  return {
    bankName: source.bankName || "",
    accountName: source.accountName || "",
    accountNumber: source.accountNumber || "",
    accountType: source.accountType || "",
    preferredPaymentMethod: source.preferredPaymentMethod || "",
    paystackRecipientCode: source.paystackRecipientCode || "",
    updatedAt: source.updatedAt || null,
  };
};

const serializeServiceProvider = (serviceProvider, { includePaymentDetails } = {}) => {
  const providerObject = serviceProvider.toObject
    ? serviceProvider.toObject()
    : serviceProvider;

  return {
    _id: providerObject._id,
    companyName: providerObject.companyName,
    contactPerson: providerObject.contactPerson,
    email: providerObject.email,
    phone: providerObject.phone,
    serviceCategory: providerObject.serviceCategory,
    address: providerObject.address,
    verificationDocuments: providerObject.verificationDocuments || [],
    verificationStatus: providerObject.verificationStatus,
    notes: providerObject.notes,
    createdAt: providerObject.createdAt,
    updatedAt: providerObject.updatedAt,
    ...(includePaymentDetails
      ? { paymentDetails: serializePaymentDetails(providerObject.paymentDetails) }
      : {}),
  };
};

const applyAdminServiceProviderUpdates = (serviceProvider, payload = {}) => {
  adminEditableFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (field === "email") {
        serviceProvider.email = normalizeEmail(payload.email);
        return;
      }

      serviceProvider[field] = payload[field];
    }
  });

  if (payload.paymentDetails !== undefined) {
    const paymentDetailsResult = sanitizePaymentDetailsInput(
      payload.paymentDetails,
      { rejectUnknownFields: true }
    );

    if (paymentDetailsResult.error) {
      return paymentDetailsResult;
    }

    serviceProvider.paymentDetails = paymentDetailsResult.paymentDetails;
  }

  return { success: true };
};

const getProviderEmailQuery = (user) => {
  const normalizedEmail = normalizeEmail(user?.email);

  if (!normalizedEmail) {
    return null;
  }

  return { email: normalizedEmail };
};

const getProviderProfileForUser = async (user) => {
  const providerEmailQuery = getProviderEmailQuery(user);

  if (!providerEmailQuery) {
    return null;
  }

  return ServiceProvider.findOne(providerEmailQuery).sort({ createdAt: -1 });
};

const getProviderStatusRecipient = async (provider) => {
  const { emailProviderStatusRecipient } = getEmailConfig();
  const overrideRecipient = String(emailProviderStatusRecipient || "").trim();

  let recipientSource = "provider database";
  const recipients = await resolveVerifiedUserEmailRecipient({
    overrideRecipient,
    databaseEmail: provider?.email,
    role: "service_provider",
  });

  if (overrideRecipient) {
    recipientSource = "environment override";
  }

  console.info(
    `provider status override configured: ${
      overrideRecipient ? "yes" : "no"
    }`
  );
  console.info(`recipient source: ${recipientSource}`);
  console.info(`recipient count: ${recipients.length}`);

  return recipients;
};

const getProviderLoginUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/login`;
};

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
    let query = {};
    let includePaymentDetails = false;

    if (req.user?.role === "resident") {
      query = { verificationStatus: "approved" };
    }

    if (req.user?.role === "service_provider") {
      const providerEmailQuery = getProviderEmailQuery(req.user);

      if (!providerEmailQuery) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      query = providerEmailQuery;
      includePaymentDetails = true;
    }

    if (req.user?.role === "admin") {
      includePaymentDetails = true;
    }

    const serviceProviders = await ServiceProvider.find(query).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: serviceProviders.length,
      data: serviceProviders.map((serviceProvider) =>
        serializeServiceProvider(serviceProvider, { includePaymentDetails })
      ),
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

    const isAdmin = req.user?.role === "admin";
    const isResident = req.user?.role === "resident";
    const isServiceProvider = req.user?.role === "service_provider";
    const ownsProviderProfile =
      isServiceProvider &&
      normalizeEmail(serviceProvider.email) === normalizeEmail(req.user?.email);

    if (isResident && serviceProvider.verificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    if (isServiceProvider && !ownsProviderProfile) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    res.status(200).json({
      success: true,
      data: serializeServiceProvider(serviceProvider, {
        includePaymentDetails: isAdmin || ownsProviderProfile,
      }),
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
    const existingServiceProvider = await ServiceProvider.findById(req.params.id);

    if (!existingServiceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    const previousVerificationStatus = existingServiceProvider.verificationStatus;

    const applyUpdateResult = applyAdminServiceProviderUpdates(
      existingServiceProvider,
      req.body
    );

    if (applyUpdateResult.error) {
      return res.status(400).json({
        success: false,
        message: applyUpdateResult.error,
      });
    }

    const serviceProvider = await existingServiceProvider.save();

    const nextVerificationStatus = serviceProvider.verificationStatus;
    const shouldSendApprovedEmail =
      previousVerificationStatus !== nextVerificationStatus &&
      nextVerificationStatus === "approved";
    const shouldSendRejectedEmail =
      previousVerificationStatus !== nextVerificationStatus &&
      nextVerificationStatus === "rejected";

    if (shouldSendApprovedEmail || shouldSendRejectedEmail) {
      const recipients = await getProviderStatusRecipient(serviceProvider);

      if (!recipients.length) {
        console.warn(
          "Service provider status changed, but no valid provider status email recipient was available."
        );
      } else {
        const emailPayload = shouldSendApprovedEmail
          ? buildProviderApprovedEmail({
              providerName: serviceProvider.contactPerson,
              companyName: serviceProvider.companyName,
              serviceCategory: serviceProvider.serviceCategory,
              approvedAt: serviceProvider.updatedAt || new Date(),
              loginUrl: getProviderLoginUrl(),
            })
          : buildProviderRejectedEmail({
              providerName: serviceProvider.contactPerson,
              companyName: serviceProvider.companyName,
              serviceCategory: serviceProvider.serviceCategory,
              rejectedAt: serviceProvider.updatedAt || new Date(),
            });

        const emailResult = await sendEmail({
          to: recipients,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        });

        if (!emailResult.success) {
          console.warn(
            shouldSendApprovedEmail
              ? "Provider approved, but approval email failed."
              : "Provider rejected, but rejection email failed."
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Service provider updated successfully",
      data: serializeServiceProvider(serviceProvider, {
        includePaymentDetails: true,
      }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update service provider",
      error: error.message,
    });
  }
};

const getMyPaymentDetails = async (req, res) => {
  try {
    const serviceProvider = await getProviderProfileForUser(req.user);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        serviceProviderId: serviceProvider._id,
        paymentDetails: serializePaymentDetails(serviceProvider.paymentDetails),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment details.",
    });
  }
};

const updateMyPaymentDetails = async (req, res) => {
  try {
    const allowedInput = req.body && typeof req.body === "object" ? req.body : {};
    const unexpectedFields = Object.keys(allowedInput).filter(
      (field) => !providerPaymentDetailFields.includes(field)
    );

    if (unexpectedFields.length) {
      return res.status(400).json({
        success: false,
        message: `Unsupported payment details field: ${unexpectedFields[0]}.`,
      });
    }

    const serviceProvider = await getProviderProfileForUser(req.user);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider profile not found.",
      });
    }

    const paymentDetailsResult = sanitizePaymentDetailsInput(allowedInput, {
      rejectUnknownFields: true,
    });

    if (paymentDetailsResult.error) {
      return res.status(400).json({
        success: false,
        message: paymentDetailsResult.error,
      });
    }

    serviceProvider.paymentDetails = paymentDetailsResult.paymentDetails;
    await serviceProvider.save();

    return res.status(200).json({
      success: true,
      message: "Payment details updated successfully.",
      data: {
        serviceProviderId: serviceProvider._id,
        paymentDetails: serializePaymentDetails(serviceProvider.paymentDetails),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update payment details.",
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
  getMyPaymentDetails,
  updateMyPaymentDetails,
  deleteServiceProvider,
};
