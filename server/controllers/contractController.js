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
const {
  attachFinancialSummaryToContract,
  attachFinancialSummariesToContracts,
  getProviderIdsForUser,
} = require("../utils/paymentFinancials");

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

const getContractScopeMatch = async (user) => {
  if (user?.role === "admin") {
    return {};
  }

  if (user?.role === "service_provider") {
    const providerIds = await getProviderIdsForUser(user);

    if (!providerIds.length) {
      return { _id: null };
    }

    return {
      serviceProvider: { $in: providerIds },
    };
  }

  return null;
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

    const populatedContract = await Contract.findById(contract._id).populate(
      "serviceProvider",
      "companyName serviceCategory phone email"
    );
    const [contractWithSummary] = await attachFinancialSummariesToContracts([
      populatedContract,
    ]);

    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: contractWithSummary,
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
    const scopeMatch = await getContractScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access contracts.",
      });
    }

    const contracts = await Contract.find(scopeMatch)
      .populate("serviceProvider", "companyName serviceCategory phone email")
      .sort({ createdAt: -1 });
    const contractsWithSummaries = await attachFinancialSummariesToContracts(
      contracts
    );

    res.status(200).json({
      success: true,
      count: contractsWithSummaries.length,
      data: contractsWithSummaries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contracts",
    });
  }
};

const getContractById = async (req, res) => {
  try {
    const scopeMatch = await getContractScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access contracts.",
      });
    }

    const contract = await Contract.findOne({
      _id: req.params.id,
      ...scopeMatch,
    }).populate("serviceProvider", "companyName serviceCategory phone email");

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    const contractsWithSummaries = await attachFinancialSummariesToContracts([
      contract,
    ]);

    res.status(200).json({
      success: true,
      data: contractsWithSummaries[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contract",
    });
  }
};

const updateContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("serviceProvider", "companyName serviceCategory phone email");

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    const [contractWithSummary] = await attachFinancialSummariesToContracts([
      contract,
    ]);

    res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      data: contractWithSummary,
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
