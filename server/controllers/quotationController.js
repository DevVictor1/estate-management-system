const mongoose = require("mongoose");

const Contract = require("../models/Contract");
const Quotation = require("../models/Quotation");
const ServiceProvider = require("../models/ServiceProvider");
const Task = require("../models/Task");
const User = require("../models/User");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");
const { getProviderIdsForUser } = require("../utils/paymentFinancials");
const {
  QUOTATION_DURATION_UNITS,
  PROVIDER_QUOTABLE_TASK_STATUSES,
  getQuotationScopeMatch,
} = require("../utils/quotationUtils");
const {
  buildQuotationSubmittedEmail,
} = require("../emailTemplates/quotationSubmitted");
const {
  buildProviderQuotationStatusEmail,
} = require("../emailTemplates/quotationStatusUpdated");
const {
  buildProviderContractCreatedEmail,
} = require("../emailTemplates/contractCreated");

const quotationPopulate = [
  {
    path: "task",
    select: "title description priority deadline status serviceProvider complaint",
  },
  {
    path: "serviceProvider",
    select: "companyName serviceCategory contactPerson email",
  },
  {
    path: "submittedBy",
    select: "fullName",
  },
  {
    path: "reviewedBy",
    select: "fullName",
  },
  {
    path: "createdContract",
    select:
      "contractTitle contractValue status startDate endDate paymentTerms serviceProvider",
    populate: {
      path: "serviceProvider",
      select: "companyName serviceCategory",
    },
  },
];

const reviewActionMap = {
  under_review: "under_review",
  approve: "approved",
  reject: "rejected",
  request_revision: "revision_requested",
};

const buildValidationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const parseNonNegativeNumber = (value, label) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw buildValidationError(`${label} must be a valid non-negative number.`);
  }

  return parsedValue;
};

const parsePositiveDurationValue = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    throw buildValidationError(
      "Estimated duration value must be a valid number greater than or equal to 1."
    );
  }

  return parsedValue;
};

const validateObjectId = (value, label) => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) {
    throw buildValidationError(`${label} must be a valid record identifier.`);
  }
};

const parseOptionalDate = (value, label) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw buildValidationError(`${label} must be a valid date.`);
  }

  return parsedDate;
};

const buildQuotationReviewUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/quotations`;
};

const buildQuotationPayload = (body = {}) => {
  const labourCost = parseNonNegativeNumber(body.labourCost, "Labour cost");
  const materialsCost = parseNonNegativeNumber(
    body.materialsCost,
    "Materials cost"
  );
  const otherCost = parseNonNegativeNumber(body.otherCost || 0, "Other cost");
  const estimatedDurationValue = parsePositiveDurationValue(
    body.estimatedDurationValue
  );
  const estimatedDurationUnit = String(body.estimatedDurationUnit || "")
    .trim()
    .toLowerCase();

  if (!QUOTATION_DURATION_UNITS.includes(estimatedDurationUnit)) {
    throw buildValidationError(
      "Estimated duration unit must be hours, days, or weeks."
    );
  }

  return {
    labourCost,
    materialsCost,
    otherCost,
    totalAmount: labourCost + materialsCost + otherCost,
    estimatedDurationValue,
    estimatedDurationUnit,
    notes: String(body.notes || "").trim(),
  };
};

const getAdminQuotationRecipients = async () => {
  const { emailQuotationAdminRecipient } = getEmailConfig();
  const overrideRecipient = String(emailQuotationAdminRecipient || "").trim();

  console.info(
    `quotation admin override configured: ${overrideRecipient ? "yes" : "no"}`
  );

  if (overrideRecipient) {
    const recipients = isValidEmail(overrideRecipient) ? [overrideRecipient] : [];
    console.info("quotation recipient source: environment override");
    console.info(`quotation recipient count: ${recipients.length}`);

    return recipients;
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

  console.info("quotation recipient source: database");
  console.info(`quotation recipient count: ${recipients.length}`);

  return recipients;
};

const getProviderQuotationRecipients = async (providerEmail) => {
  const { emailQuotationProviderRecipient } = getEmailConfig();
  const overrideRecipient = String(emailQuotationProviderRecipient || "").trim();

  const recipients = await resolveVerifiedUserEmailRecipient({
    overrideRecipient,
    databaseEmail: providerEmail,
    role: "service_provider",
  });

  console.info(
    `quotation provider override configured: ${overrideRecipient ? "yes" : "no"}`
  );
  console.info(
    `quotation recipient source: ${
      overrideRecipient ? "environment override" : "provider database"
    }`
  );
  console.info(`quotation recipient count: ${recipients.length}`);

  return recipients;
};

const getContractNotificationRecipient = async (provider) => {
  const { emailContractRecipient } = getEmailConfig();
  const overrideRecipient = String(emailContractRecipient || "").trim();

  return resolveVerifiedUserEmailRecipient({
    overrideRecipient,
    databaseEmail: provider?.email,
    role: "service_provider",
  });
};

const sendQuotationSubmittedNotification = async ({ quotation, task, provider }) => {
  const recipients = await getAdminQuotationRecipients();

  if (!recipients.length) {
    console.warn(
      "Quotation submitted, but no valid admin recipient was available."
    );
    return;
  }

  const emailPayload = buildQuotationSubmittedEmail({
    taskTitle: task?.title,
    providerName: provider?.contactPerson,
    companyName: provider?.companyName,
    totalAmount: quotation?.totalAmount,
    revisionNumber: quotation?.revisionNumber,
    submittedAt: quotation?.createdAt,
    reviewUrl: buildQuotationReviewUrl(),
  });

  const emailResult = await sendEmail({
    to: recipients,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (!emailResult.success) {
    console.warn("Quotation submitted, but admin notification email failed.");
  }
};

const sendProviderQuotationStatusNotification = async ({
  quotation,
  provider,
  task,
}) => {
  const recipients = await getProviderQuotationRecipients(provider?.email);

  if (!recipients.length) {
    console.warn(
      "Quotation review completed, but no valid provider recipient was available."
    );
    return;
  }

  const emailPayload = buildProviderQuotationStatusEmail({
    variant: quotation.status,
    providerName: provider?.contactPerson || provider?.companyName,
    taskTitle: task?.title,
    companyName: provider?.companyName,
    totalAmount: quotation.totalAmount,
    revisionNumber: quotation.revisionNumber,
    adminComment: quotation.adminComment,
    reviewedAt: quotation.reviewedAt,
    reviewUrl: buildQuotationReviewUrl(),
  });

  const emailResult = await sendEmail({
    to: recipients,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (!emailResult.success) {
    console.warn("Quotation review completed, but provider notification email failed.");
  }
};

const sendContractNotificationFromQuotation = async ({
  contract,
  serviceProvider,
}) => {
  const recipients = await getContractNotificationRecipient(serviceProvider);

  if (!recipients.length) {
    console.warn(
      "Contract created from quotation, but no valid provider notification recipient was available."
    );
    return;
  }

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
    reviewUrl: (() => {
      const clientUrl = String(process.env.CLIENT_URL || "").trim();
      if (!/^https?:\/\//i.test(clientUrl)) {
        return "";
      }

      return `${clientUrl.replace(/\/+$/, "")}/contracts`;
    })(),
  });

  const emailResult = await sendEmail({
    to: recipients,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (!emailResult.success) {
    console.warn(
      "Contract created from quotation, but provider notification email failed."
    );
  }
};

const populateQuotationById = async (quotationId) =>
  Quotation.findById(quotationId).populate(quotationPopulate);

const buildQuotationDetailResponse = async (quotation) => {
  const quotationObject =
    typeof quotation.toObject === "function" ? quotation.toObject() : { ...quotation };

  const revisionHistory = await Quotation.find({
    task: quotation.task?._id || quotation.task,
    serviceProvider: quotation.serviceProvider?._id || quotation.serviceProvider,
  })
    .select(
      "labourCost materialsCost otherCost totalAmount estimatedDurationValue estimatedDurationUnit notes status adminComment revisionNumber reviewedAt approvedAt rejectedAt createdAt updatedAt createdContract submittedBy reviewedBy"
    )
    .populate([
      {
        path: "submittedBy",
        select: "fullName",
      },
      {
        path: "reviewedBy",
        select: "fullName",
      },
      {
        path: "createdContract",
        select: "contractTitle contractValue status startDate endDate paymentTerms",
      },
    ])
    .sort({ revisionNumber: 1, createdAt: 1 });

  return {
    ...quotationObject,
    revisionHistory: revisionHistory.map((item) =>
      typeof item.toObject === "function" ? item.toObject() : item
    ),
  };
};

const createQuotation = async (req, res) => {
  try {
    validateObjectId(req.body.task, "Task");

    const [task, providerIds] = await Promise.all([
      Task.findById(req.body.task).select(
        "title description priority deadline status serviceProvider"
      ),
      getProviderIdsForUser(req.user),
    ]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "The selected task could not be found.",
      });
    }

    if (!providerIds.length) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to submit a quotation for this task.",
      });
    }

    const assignedProviderId = String(task.serviceProvider || "");
    const ownsTask = providerIds.some(
      (providerId) => String(providerId) === assignedProviderId
    );

    if (!ownsTask) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to submit a quotation for this task.",
      });
    }

    if (!PROVIDER_QUOTABLE_TASK_STATUSES.includes(task.status)) {
      return res.status(400).json({
        success: false,
        message:
          "A quotation can only be submitted for tasks that are pending, in progress, or overdue.",
      });
    }

    const payload = buildQuotationPayload(req.body);
    const latestQuotation = await Quotation.findOne({
      task: task._id,
      serviceProvider: task.serviceProvider,
    })
      .select("status revisionNumber")
      .sort({ revisionNumber: -1, createdAt: -1 });

    let revisionNumber = 1;

    if (latestQuotation) {
      if (latestQuotation.status !== "revision_requested") {
        return res.status(409).json({
          success: false,
          message:
            "A quotation has already been submitted for this task. You can submit a new revision only after a revision is requested.",
        });
      }

      revisionNumber = Number(latestQuotation.revisionNumber || 1) + 1;
    }

    const quotation = await Quotation.create({
      task: task._id,
      serviceProvider: task.serviceProvider,
      submittedBy: req.user._id,
      ...payload,
      status: "submitted",
      revisionNumber,
    });

    try {
      const provider = await ServiceProvider.findById(task.serviceProvider).select(
        "companyName contactPerson email serviceCategory"
      );

      await sendQuotationSubmittedNotification({
        quotation,
        task,
        provider,
      });
    } catch (emailError) {
      console.warn("Quotation submitted, but admin notification email failed.");
    }

    const populatedQuotation = await populateQuotationById(quotation._id);

    res.status(201).json({
      success: true,
      message: "Quotation submitted successfully.",
      data: await buildQuotationDetailResponse(populatedQuotation),
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500 ? "Failed to submit quotation" : error.message,
    });
  }
};

const getQuotations = async (req, res) => {
  try {
    const scope = await getQuotationScopeMatch(req.user);

    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access quotation records.",
      });
    }

    const match = { ...scope.match };

    if (req.user?.role === "admin") {
      if (req.query.status) {
        match.status = String(req.query.status).trim().toLowerCase();
      }

      if (req.query.provider && mongoose.Types.ObjectId.isValid(req.query.provider)) {
        match.serviceProvider = req.query.provider;
      }

      if (req.query.task && mongoose.Types.ObjectId.isValid(req.query.task)) {
        match.task = req.query.task;
      }

      if (req.query.dateFrom || req.query.dateTo) {
        match.createdAt = {};

        if (req.query.dateFrom) {
          const dateFrom = new Date(req.query.dateFrom);

          if (!Number.isNaN(dateFrom.getTime())) {
            match.createdAt.$gte = dateFrom;
          }
        }

        if (req.query.dateTo) {
          const dateTo = new Date(req.query.dateTo);

          if (!Number.isNaN(dateTo.getTime())) {
            match.createdAt.$lte = dateTo;
          }
        }

        if (!Object.keys(match.createdAt).length) {
          delete match.createdAt;
        }
      }
    }

    const quotations = await Quotation.find(match)
      .populate(quotationPopulate)
      .sort({ createdAt: -1, revisionNumber: -1 });

    res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations.map((quotation) =>
        typeof quotation.toObject === "function"
          ? quotation.toObject()
          : { ...quotation }
      ),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch quotations.",
    });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const scope = await getQuotationScopeMatch(req.user);

    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access quotation records.",
      });
    }

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      ...scope.match,
    }).populate(quotationPopulate);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: await buildQuotationDetailResponse(quotation),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch quotation.",
    });
  }
};

const reviewQuotation = async (req, res) => {
  try {
    const requestedAction = String(req.body.action || "").trim().toLowerCase();
    const nextStatus = reviewActionMap[requestedAction];

    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid review action. Allowed actions are under_review, approve, reject, and request_revision.",
      });
    }

    const adminComment = String(req.body.adminComment || "").trim();

    if (
      ["rejected", "revision_requested"].includes(nextStatus) &&
      !adminComment
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An admin comment is required when rejecting a quotation or requesting a revision.",
      });
    }

    const quotation = await Quotation.findById(req.params.id).populate(
      quotationPopulate
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    if (!["submitted", "under_review"].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message:
          "This quotation can no longer be reviewed. Submit a new revision if further changes are needed.",
      });
    }

    if (quotation.status === nextStatus) {
      return res.status(400).json({
        success: false,
        message: "This quotation is already in the requested review state.",
      });
    }

    quotation.status = nextStatus;
    quotation.adminComment = adminComment;
    quotation.reviewedBy = req.user._id;
    quotation.reviewedAt = new Date();

    if (nextStatus === "approved") {
      quotation.approvedAt = new Date();
      quotation.rejectedAt = undefined;
    } else if (nextStatus === "rejected") {
      quotation.rejectedAt = new Date();
      quotation.approvedAt = undefined;
    } else {
      quotation.approvedAt = undefined;
      quotation.rejectedAt = undefined;
    }

    await quotation.save();

    if (["approved", "rejected", "revision_requested"].includes(nextStatus)) {
      try {
        const provider = await ServiceProvider.findById(
          quotation.serviceProvider?._id || quotation.serviceProvider
        ).select("companyName contactPerson email serviceCategory");

        const task = await Task.findById(
          quotation.task?._id || quotation.task
        ).select("title");

        if (!provider || !task) {
          console.warn(
            "Quotation review completed, but the provider or task details could not be found for notification."
          );
        } else {
          await sendProviderQuotationStatusNotification({
            quotation,
            provider,
            task,
          });
        }
      } catch (emailError) {
        console.warn(
          "Quotation review completed, but provider notification email failed."
        );
      }
    }

    const updatedQuotation = await populateQuotationById(quotation._id);

    res.status(200).json({
      success: true,
      message: "Quotation reviewed successfully.",
      data: await buildQuotationDetailResponse(updatedQuotation),
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500 ? "Failed to review quotation." : error.message,
    });
  }
};

const createContractFromQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate(
      quotationPopulate
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    if (quotation.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved quotations can be used to create a contract.",
      });
    }

    if (quotation.createdContract) {
      return res.status(409).json({
        success: false,
        message: "A contract has already been created from this quotation.",
      });
    }

    const task = await Task.findById(quotation.task?._id || quotation.task).select(
      "title serviceProvider"
    );
    const serviceProvider = await ServiceProvider.findById(
      quotation.serviceProvider?._id || quotation.serviceProvider
    ).select("companyName contactPerson email serviceCategory");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "The linked task could not be found.",
      });
    }

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "The linked service provider could not be found.",
      });
    }

    const contractTitle = String(req.body.contractTitle || "").trim();
    const paymentTerms = String(req.body.paymentTerms || "").trim();
    const notes = String(req.body.notes || "").trim();
    const status = String(req.body.status || "active").trim().toLowerCase();
    const startDate = parseOptionalDate(req.body.startDate, "Start date");
    const endDate = parseOptionalDate(req.body.endDate, "End date");

    if (!contractTitle) {
      return res.status(400).json({
        success: false,
        message: "Contract title is required.",
      });
    }

    if (!paymentTerms) {
      return res.status(400).json({
        success: false,
        message: "Payment terms are required.",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required.",
      });
    }

    const safeStatus = ["active", "expired", "terminated", "pending_renewal"].includes(
      status
    )
      ? status
      : "active";

    const quotationReference = `Created from approved quotation revision ${quotation.revisionNumber} for task "${task.title || "Untitled task"}".`;
    const contract = await Contract.create({
      serviceProvider: quotation.serviceProvider?._id || quotation.serviceProvider,
      contractTitle,
      startDate,
      endDate,
      paymentTerms,
      contractValue: quotation.totalAmount,
      status: safeStatus,
      notes: notes
        ? `${quotationReference}\n\n${notes}`
        : quotationReference,
    });

    quotation.createdContract = contract._id;
    await quotation.save();

    try {
      await sendContractNotificationFromQuotation({
        contract,
        serviceProvider,
      });
    } catch (emailError) {
      console.warn(
        "Contract created from quotation, but provider notification email failed."
      );
    }

    const updatedQuotation = await populateQuotationById(quotation._id);

    res.status(201).json({
      success: true,
      message: "Contract created successfully from the approved quotation.",
      data: await buildQuotationDetailResponse(updatedQuotation),
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to create contract from quotation."
          : error.message,
    });
  }
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  reviewQuotation,
  createContractFromQuotation,
};
