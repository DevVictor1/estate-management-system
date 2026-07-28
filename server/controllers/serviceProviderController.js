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

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

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
    const existingServiceProvider = await ServiceProvider.findById(req.params.id);

    if (!existingServiceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    const previousVerificationStatus = existingServiceProvider.verificationStatus;

    Object.assign(existingServiceProvider, req.body);
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
