const Contract = require("../models/Contract");
const ServiceProvider = require("../models/ServiceProvider");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  buildProviderContractCreatedEmail,
} = require("../emailTemplates/contractCreated");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const getContractNotificationRecipient = async (provider) => {
  const { emailContractRecipient } = getEmailConfig();
  const overrideRecipient = String(emailContractRecipient || "").trim();

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
    `contract override configured: ${overrideRecipient ? "yes" : "no"}`
  );
  console.info(`recipient source: ${recipientSource}`);
  console.info(`recipient count: ${recipients.length}`);

  return recipients;
};

const getContractsReviewUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/contracts`;
};

const createContract = async (req, res) => {
  try {
    const contract = await Contract.create(req.body);

    const serviceProvider = await ServiceProvider.findById(
      contract.serviceProvider
    ).select("contactPerson companyName email serviceCategory");

    if (!serviceProvider) {
      console.warn(
        "Contract created, but the linked service provider could not be found for email notification."
      );
    } else {
      const recipients = await getContractNotificationRecipient(serviceProvider);

      if (!recipients.length) {
        console.warn(
          "Contract created, but no valid contract email recipient was available."
        );
      } else {
        const emailPayload = buildProviderContractCreatedEmail({
          providerName: serviceProvider.contactPerson,
          companyName: serviceProvider.companyName,
          contractTitle: contract.contractTitle,
          startDate: contract.startDate,
          endDate: contract.endDate,
          contractValue: contract.contractValue,
          paymentTerms: contract.paymentTerms,
          contractStatus: contract.status,
          notes: contract.notes,
          reviewUrl: getContractsReviewUrl(),
        });

        const emailResult = await sendEmail({
          to: recipients,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        });

        if (!emailResult.success) {
          console.warn(
            "Contract created, but provider notification email failed."
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: contract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create contract",
      error: error.message,
    });
  }
};

const getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate("serviceProvider", "companyName serviceCategory phone email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contracts",
      error: error.message,
    });
  }
};

const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate(
      "serviceProvider",
      "companyName serviceCategory phone email"
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contract",
      error: error.message,
    });
  }
};

const updateContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      data: contract,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update contract",
      error: error.message,
    });
  }
};

const deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contract deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete contract",
      error: error.message,
    });
  }
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
};
