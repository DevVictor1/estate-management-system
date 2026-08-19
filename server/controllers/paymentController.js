const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Contract = require("../models/Contract");
const ServiceProvider = require("../models/ServiceProvider");
const User = require("../models/User");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  buildPaymentRecordedEmail,
} = require("../emailTemplates/paymentRecorded");
const {
  buildPaymentIssueReportedEmail,
} = require("../emailTemplates/paymentIssueReported");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");
const {
  uploadPaymentEvidence: uploadPaymentEvidenceToCloudinary,
  deletePaymentEvidence: deletePaymentEvidenceFromCloudinary,
} = require("../utils/paymentEvidence");
const {
  PAYMENT_TYPES,
  PAYMENT_STATUSES,
  CONTRACT_PROGRESS_PAYMENT_TYPES,
  formatCurrency,
  buildContractFinancialSummaryMap,
  attachFinancialSummaryToContract,
  getPaymentScopeMatch,
  calculateContractFinancialSnapshot,
  buildPaymentWarnings,
} = require("../utils/paymentFinancials");

const paymentPopulate = [
  {
    path: "serviceProvider",
    select: "companyName serviceCategory phone email contactPerson",
  },
  {
    path: "contract",
    select: "contractTitle contractValue status serviceProvider paymentTerms",
    populate: {
      path: "serviceProvider",
      select: "companyName serviceCategory email",
    },
  },
];

const ADMIN_PAYMENT_STATUS_TRANSITIONS = {
  pending: ["paid", "cancelled"],
};

const PROVIDER_RECEIPT_STATUSES = [
  "pending",
  "confirmed",
  "issue_reported",
];
const PROVIDER_RECEIPT_ISSUE_REASONS = [
  "not_received",
  "bank_delay",
  "transaction_reversed",
  "incorrect_amount",
  "other",
];
const PROVIDER_RECEIPT_RESOLUTION_STATUSES = ["unresolved", "resolved"];
const PROVIDER_RECEIPT_RESOLUTION_OUTCOMES = [
  "payment_received",
  "bank_delay_resolved",
  "transfer_failed_or_reversed",
  "replacement_payment_required",
  "amount_issue_resolved",
  "other",
];

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizePaymentTypeLabel = (paymentType = "final") =>
  String(paymentType || "final")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const serializePaymentEvidence = (paymentEvidence) => {
  if (!paymentEvidence) {
    return null;
  }

  const source = paymentEvidence.toObject ? paymentEvidence.toObject() : paymentEvidence;

  if (!source?.url) {
    return null;
  }

  return {
    url: source.url,
    originalName: source.originalName || "",
    mimeType: source.mimeType || "",
    size: Number(source.size) || 0,
    uploadedAt: source.uploadedAt || null,
  };
};

const normalizeProviderReceiptStatus = (value = "") => {
  const safeValue = String(value || "").trim().toLowerCase();

  return PROVIDER_RECEIPT_STATUSES.includes(safeValue)
    ? safeValue
    : "pending";
};

const normalizeProviderReceiptIssueReason = (value = "") => {
  const safeValue = String(value || "").trim().toLowerCase();

  return PROVIDER_RECEIPT_ISSUE_REASONS.includes(safeValue)
    ? safeValue
    : "";
};

const sanitizeProviderReceiptIssueNote = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const safeValue = String(value).trim();

  if (safeValue.length > 1000) {
    throw buildValidationError(
      "Payment issue note must be 1000 characters or fewer."
    );
  }

  return safeValue;
};

const normalizeProviderReceiptResolutionStatus = (value = "") => {
  const safeValue = String(value || "").trim().toLowerCase();

  return PROVIDER_RECEIPT_RESOLUTION_STATUSES.includes(safeValue)
    ? safeValue
    : "unresolved";
};

const normalizeProviderReceiptResolutionOutcome = (value = "") => {
  const safeValue = String(value || "").trim().toLowerCase();

  return PROVIDER_RECEIPT_RESOLUTION_OUTCOMES.includes(safeValue)
    ? safeValue
    : "";
};

const sanitizeProviderReceiptResolutionNote = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const safeValue = String(value).trim();

  if (safeValue.length > 1000) {
    throw buildValidationError(
      "Payment resolution note must be 1000 characters or fewer."
    );
  }

  return safeValue;
};

const serializeProviderReceipt = (providerReceipt) => {
  const source = providerReceipt?.toObject
    ? providerReceipt.toObject()
    : providerReceipt || {};
  const status = normalizeProviderReceiptStatus(source.status);
  const resolutionSource = source.resolution || {};
  const resolutionStatus = normalizeProviderReceiptResolutionStatus(
    resolutionSource.status
  );

  return {
    status,
    confirmedAt: status === "confirmed" ? source.confirmedAt || null : null,
    confirmedBy: status === "confirmed" ? source.confirmedBy || null : null,
    issueReason:
      source.issueReason && PROVIDER_RECEIPT_ISSUE_REASONS.includes(source.issueReason)
        ? source.issueReason
        : "",
    issueNote: source.issueNote || "",
    issueReportedAt: source.issueReportedAt || null,
    issueReportedBy: source.issueReportedBy || null,
    resolution: {
      status: resolutionStatus,
      outcome:
        resolutionSource.outcome &&
        PROVIDER_RECEIPT_RESOLUTION_OUTCOMES.includes(resolutionSource.outcome)
          ? resolutionSource.outcome
          : "",
      note: resolutionSource.note || "",
      resolvedAt:
        resolutionStatus === "resolved"
          ? resolutionSource.resolvedAt || null
          : null,
      resolvedBy:
        resolutionStatus === "resolved"
          ? resolutionSource.resolvedBy || null
          : null,
    },
  };
};

const serializePaymentRecord = (payment) => {
  if (!payment) {
    return payment;
  }

  const paymentObject = payment.toObject ? payment.toObject() : { ...payment };
  paymentObject.paymentEvidence = serializePaymentEvidence(
    paymentObject.paymentEvidence
  );
  paymentObject.providerReceipt = serializeProviderReceipt(
    paymentObject.providerReceipt
  );
  return paymentObject;
};

const getPaymentNotificationRecipient = async (provider) => {
  const { emailPaymentRecipient } = getEmailConfig();
  const overrideRecipient = String(emailPaymentRecipient || "").trim();

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
    `payment override configured: ${overrideRecipient ? "yes" : "no"}`
  );
  console.info(`recipient source: ${recipientSource}`);
  console.info(`recipient count: ${recipients.length}`);

  return recipients;
};

const getAdminPaymentIssueRecipients = async () => {
  const { emailAdminRecipient } = getEmailConfig();
  const overrideRecipient = String(emailAdminRecipient || "").trim();

  console.info(
    `payment issue admin override configured: ${overrideRecipient ? "yes" : "no"}`
  );

  if (overrideRecipient) {
    const recipients = isValidEmail(overrideRecipient) ? [overrideRecipient] : [];
    console.info("payment issue recipient source: environment override");
    console.info(`payment issue recipient count: ${recipients.length}`);

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

  console.info("payment issue recipient source: database");
  console.info(`payment issue recipient count: ${recipients.length}`);

  return recipients;
};

const getPaymentsReviewUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/payments`;
};

const buildValidationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizePaymentStatus = (value = "") => String(value || "").trim().toLowerCase();

const parsePositiveAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw buildValidationError("Amount must be a valid positive number.");
  }

  return amount;
};

const parseOptionalDate = (value) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw buildValidationError("Payment date must be a valid date.");
  }

  return date;
};

const validateObjectId = (value, label) => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) {
    throw buildValidationError(`${label} must be a valid record identifier.`);
  }
};

const buildPaymentPayload = (body = {}) => {
  const paymentType = String(body.paymentType || "final").trim().toLowerCase();
  const status = String(body.status || "pending").trim().toLowerCase();
  const paymentMethod = String(body.paymentMethod || "bank_transfer")
    .trim()
    .toLowerCase();

  if (!PAYMENT_TYPES.includes(paymentType)) {
    throw buildValidationError(
      "Invalid payment type. Allowed values are advance, partial, final, and reimbursement."
    );
  }

  if (!PAYMENT_STATUSES.includes(status)) {
    throw buildValidationError(
      "Invalid payment status. Allowed values are pending, paid, failed, and cancelled."
    );
  }

  validateObjectId(body.serviceProvider, "Service provider");
  validateObjectId(body.contract, "Contract");

  return {
    serviceProvider: body.serviceProvider,
    contract: body.contract,
    amount: parsePositiveAmount(body.amount),
    paymentDate: parseOptionalDate(body.paymentDate),
    paymentMethod,
    paymentType,
    status,
    referenceNumber: body.referenceNumber?.trim() || "",
    notes: body.notes?.trim() || "",
  };
};

const getValidatedPaymentContext = async (payload) => {
  const [contract, serviceProvider] = await Promise.all([
    Contract.findById(payload.contract).select(
      "contractTitle contractValue serviceProvider status paymentTerms"
    ),
    ServiceProvider.findById(payload.serviceProvider).select(
      "companyName email contactPerson serviceCategory"
    ),
  ]);

  if (!contract) {
    throw buildValidationError("The selected contract could not be found.", 404);
  }

  if (!serviceProvider) {
    throw buildValidationError(
      "The selected service provider could not be found.",
      404
    );
  }

  if (!contract.serviceProvider) {
    throw buildValidationError(
      "The selected contract is not linked to a service provider."
    );
  }

  if (String(contract.serviceProvider) !== String(serviceProvider._id)) {
    throw buildValidationError(
      "The selected contract does not belong to the selected service provider."
    );
  }

  return {
    contract,
    serviceProvider,
  };
};

const validateContractPaymentLimits = async ({
  payload,
  contract,
  existingPaymentId,
}) => {
  const summary = await calculateContractFinancialSnapshot({
    contractId: contract._id,
    contractValue: contract.contractValue,
    excludePaymentId: existingPaymentId,
  });
  const warnings = buildPaymentWarnings({
    amount: payload.amount,
    paymentType: payload.paymentType,
    status: payload.status,
    currentSummary: summary,
    contractValue: contract.contractValue,
  });

  if (!CONTRACT_PROGRESS_PAYMENT_TYPES.includes(payload.paymentType)) {
    return {
      warnings,
      summary,
    };
  }

  if (payload.paymentType === "final" && payload.amount > summary.outstandingBalance) {
    const remainingBalance = formatCurrency(summary.outstandingBalance);
    throw buildValidationError(
      `The final payment cannot exceed the remaining contract balance of ${remainingBalance}.`
    );
  }

  if (payload.status === "paid") {
    const projectedTotal = summary.contractPaymentsPaid + payload.amount;

    if (projectedTotal > Number(contract.contractValue || 0)) {
      const overpaidBy = projectedTotal - Number(contract.contractValue || 0);
      throw buildValidationError(
        `The paid amount would exceed the contract value by ${formatCurrency(
          overpaidBy
        )}.`
      );
    }
  }

  return {
    warnings,
    summary,
  };
};

const populatePaymentRecord = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate(paymentPopulate);

  if (!payment) {
    return null;
  }

  if (!payment.contract) {
    return serializePaymentRecord(payment);
  }

  const summaryMap = await buildContractFinancialSummaryMap([payment.contract]);
  const paymentObject = serializePaymentRecord(payment);

  paymentObject.contract = attachFinancialSummaryToContract(
    payment.contract,
    summaryMap
  );

  return paymentObject;
};

const sendPaymentNotification = async ({
  payment,
  contract,
  serviceProvider,
  subject,
  heading,
  intro,
  buttonLabel,
}) => {
  if (!contract) {
    console.warn(
      "Payment recorded, but the linked contract could not be found for email notification."
    );
    return;
  }

  if (!contract.serviceProvider) {
    console.warn(
      "Payment recorded, but the linked contract does not have a service provider for email notification."
    );
    return;
  }

  if (!serviceProvider) {
    console.warn(
      "Payment recorded, but the linked service provider could not be found for email notification."
    );
    return;
  }

  const recipients = await getPaymentNotificationRecipient(serviceProvider);

  if (!recipients.length) {
    console.warn(
      "Payment recorded, but no valid payment email recipient was available."
    );
    return;
  }

  const emailPayload = buildPaymentRecordedEmail({
    companyName: serviceProvider.companyName,
    contractTitle: contract.contractTitle,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentType: normalizePaymentTypeLabel(payment.paymentType),
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.status,
    referenceNumber: payment.referenceNumber,
    notes: payment.notes,
    hasPaymentEvidence: Boolean(payment.paymentEvidence?.url),
    reviewUrl: getPaymentsReviewUrl(),
    subject,
    heading,
    intro,
    buttonLabel,
  });

  const emailResult = await sendEmail({
    to: recipients,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (!emailResult.success) {
    console.warn("Payment recorded, but provider notification email failed.");
  }
};

const sendPaymentIssueReportedNotification = async ({
  payment,
  contract,
  serviceProvider,
  providerReceipt,
}) => {
  const recipients = await getAdminPaymentIssueRecipients();

  if (!recipients.length) {
    console.warn(
      "Payment issue reported, but no valid admin notification recipient was available."
    );
    return;
  }

  const emailPayload = buildPaymentIssueReportedEmail({
    companyName: serviceProvider?.companyName,
    contractTitle: contract?.contractTitle,
    amount: payment?.amount,
    paymentDate: payment?.paymentDate,
    referenceNumber: payment?.referenceNumber,
    issueReason: providerReceipt?.issueReason,
    issueNote: providerReceipt?.issueNote,
    issueReportedAt: providerReceipt?.issueReportedAt,
    reviewUrl: getPaymentsReviewUrl(),
  });

  const emailResult = await sendEmail({
    to: recipients,
    subject: emailPayload.subject,
    html: emailPayload.html,
    text: emailPayload.text,
  });

  if (!emailResult.success) {
    console.warn("Payment issue reported, but admin notification email failed.");
  }
};

const validateAdminPaymentStatusTransition = (currentStatus, nextStatus) => {
  const safeCurrentStatus = normalizePaymentStatus(currentStatus);
  const safeNextStatus = normalizePaymentStatus(nextStatus);
  const allowedTargets = ADMIN_PAYMENT_STATUS_TRANSITIONS[safeCurrentStatus] || [];

  if (!["paid", "cancelled"].includes(safeNextStatus)) {
    throw buildValidationError(
      "Invalid payment status update. Allowed values are paid and cancelled."
    );
  }

  if (safeCurrentStatus === safeNextStatus) {
    throw buildValidationError(
      safeNextStatus === "paid"
        ? "This payment has already been marked as paid."
        : "This payment has already been cancelled."
    );
  }

  if (!allowedTargets.includes(safeNextStatus)) {
    throw buildValidationError(
      "Only pending payments can be marked as paid or cancelled."
    );
  }

  return safeNextStatus;
};

const applyPaymentStatusLifecycle = ({
  payment,
  nextStatus,
  previousStatus,
  paidAt = new Date(),
}) => {
  const safePreviousStatus = normalizePaymentStatus(previousStatus ?? payment.status);
  const safeNextStatus = normalizePaymentStatus(nextStatus);

  payment.status = safeNextStatus;

  if (safePreviousStatus !== "paid" && safeNextStatus === "paid") {
    payment.paidAt = paidAt;

    if (!PROVIDER_RECEIPT_STATUSES.includes(payment.providerReceipt?.status)) {
      payment.providerReceipt = {
        status: "pending",
      };
    }

    return { becamePaid: true };
  }

  if (safeNextStatus !== "paid" && safePreviousStatus !== "paid") {
    payment.paidAt = undefined;
  }

  return { becamePaid: false };
};

const confirmProviderReceipt = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const scopeMatch = await getPaymentScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm payment receipt.",
      });
    }

    const ownedPayment = await Payment.exists({
      _id: payment._id,
      ...scopeMatch,
    });

    if (!ownedPayment) {
      return res.status(403).json({
        success: false,
        message: "You can confirm receipt only for your own payments.",
      });
    }

    if (normalizePaymentStatus(payment.status) !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only payments already marked as paid can be confirmed.",
      });
    }

    if (normalizeProviderReceiptStatus(payment.providerReceipt?.status) === "confirmed") {
      const populatedPayment = await populatePaymentRecord(payment._id);

      return res.status(200).json({
        success: true,
        message: "Payment receipt was already confirmed.",
        data: populatedPayment,
      });
    }

    const existingProviderReceipt = payment.providerReceipt?.toObject
      ? payment.providerReceipt.toObject()
      : payment.providerReceipt || {};

    payment.providerReceipt = {
      ...existingProviderReceipt,
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedBy: req.user?._id,
    };

    await payment.save();

    const populatedPayment = await populatePaymentRecord(payment._id);

    return res.status(200).json({
      success: true,
      message: "Payment receipt confirmed successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to confirm payment receipt"
          : error.message,
    });
  }
};

const reportProviderReceiptIssue = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const scopeMatch = await getPaymentScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to report payment receipt issues.",
      });
    }

    const ownedPayment = await Payment.exists({
      _id: payment._id,
      ...scopeMatch,
    });

    if (!ownedPayment) {
      return res.status(403).json({
        success: false,
        message: "You can report receipt issues only for your own payments.",
      });
    }

    if (normalizePaymentStatus(payment.status) !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only payments already marked as paid can have receipt issues reported.",
      });
    }

    if (normalizeProviderReceiptStatus(payment.providerReceipt?.status) === "confirmed") {
      return res.status(400).json({
        success: false,
        message:
          "This payment has already been confirmed as received. Receipt issues can only be reported before confirmation.",
      });
    }

    const issueReason = normalizeProviderReceiptIssueReason(req.body?.issueReason);
    const issueNote = sanitizeProviderReceiptIssueNote(req.body?.issueNote);

    if (!issueReason) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a valid payment issue reason: not_received, bank_delay, transaction_reversed, incorrect_amount, or other.",
      });
    }

    const existingProviderReceipt = payment.providerReceipt?.toObject
      ? payment.providerReceipt.toObject()
      : payment.providerReceipt || {};
    const duplicateIssueReport =
      normalizeProviderReceiptStatus(existingProviderReceipt.status) ===
        "issue_reported" &&
      normalizeProviderReceiptIssueReason(existingProviderReceipt.issueReason) ===
        issueReason &&
      String(existingProviderReceipt.issueNote || "") === issueNote;

    payment.providerReceipt = {
      ...existingProviderReceipt,
      status: "issue_reported",
      confirmedAt: undefined,
      confirmedBy: undefined,
      issueReason,
      issueNote,
      issueReportedAt: new Date(),
      issueReportedBy: req.user?._id,
      resolution: {
        status: "unresolved",
      },
    };

    await payment.save();

    if (!duplicateIssueReport) {
      try {
        const { contract, serviceProvider } = await getValidatedPaymentContext({
          contract: payment.contract,
          serviceProvider: payment.serviceProvider,
        });

        await sendPaymentIssueReportedNotification({
          payment,
          contract,
          serviceProvider,
          providerReceipt: payment.providerReceipt,
        });
      } catch (emailError) {
        console.warn(
          "Payment issue reported successfully, but the admin notification email failed."
        );
      }
    }

    const populatedPayment = await populatePaymentRecord(payment._id);

    return res.status(200).json({
      success: true,
      message: "Payment issue reported successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to report payment receipt issue"
          : error.message,
    });
  }
};

const resolveProviderReceiptIssue = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (normalizeProviderReceiptStatus(payment.providerReceipt?.status) !== "issue_reported") {
      return res.status(400).json({
        success: false,
        message:
          "Only payments with a reported provider receipt issue can be resolved.",
      });
    }

    const resolutionOutcome = normalizeProviderReceiptResolutionOutcome(
      req.body?.outcome
    );
    const resolutionNote = sanitizeProviderReceiptResolutionNote(req.body?.note);

    if (!resolutionOutcome) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a valid receipt issue resolution outcome.",
      });
    }

    const existingProviderReceipt = payment.providerReceipt?.toObject
      ? payment.providerReceipt.toObject()
      : payment.providerReceipt || {};

    payment.providerReceipt = {
      ...existingProviderReceipt,
      resolution: {
        status: "resolved",
        outcome: resolutionOutcome,
        note: resolutionNote,
        resolvedAt: new Date(),
        resolvedBy: req.user?._id,
      },
    };

    await payment.save();

    const populatedPayment = await populatePaymentRecord(payment._id);

    return res.status(200).json({
      success: true,
      message: "Payment issue resolved successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError"
        ? 400
        : 500);

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to resolve payment receipt issue"
          : error.message,
    });
  }
};

const createPayment = async (req, res) => {
  try {
    const payload = buildPaymentPayload(req.body);
    const { contract, serviceProvider } = await getValidatedPaymentContext(payload);
    const { warnings } = await validateContractPaymentLimits({
      payload,
      contract,
    });
    const payment = await Payment.create({
      ...payload,
      paymentDate: payload.paymentDate || undefined,
      paidAt: payload.status === "paid" ? new Date() : undefined,
    });

    await sendPaymentNotification({ payment, contract, serviceProvider });

    const populatedPayment = await populatePaymentRecord(payment._id);

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      ...(warnings.length ? { warnings } : {}),
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500 ? "Failed to record payment" : error.message,
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const scopeMatch = await getPaymentScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access payment records.",
      });
    }

    const payments = await Payment.find(scopeMatch)
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    const contractsForSummary = payments
      .map((payment) => payment.contract)
      .filter(Boolean);
    const summaryMap = await buildContractFinancialSummaryMap(contractsForSummary);
    const paymentData = payments.map((payment) => {
      const paymentObject = serializePaymentRecord(payment);

      if (payment.contract) {
        paymentObject.contract = attachFinancialSummaryToContract(
          payment.contract,
          summaryMap
        );
      }

      return paymentObject;
    });

    res.status(200).json({
      success: true,
      count: paymentData.length,
      data: paymentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const scopeMatch = await getPaymentScopeMatch(req.user);

    if (scopeMatch === null) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access payment records.",
      });
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      ...scopeMatch,
    }).populate(paymentPopulate);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

      let paymentData = serializePaymentRecord(payment);

    if (payment.contract) {
      const summaryMap = await buildContractFinancialSummaryMap([payment.contract]);
      paymentData.contract = attachFinancialSummaryToContract(
        payment.contract,
        summaryMap
      );
    }

    res.status(200).json({
      success: true,
      data: paymentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const existingPayment = await Payment.findById(req.params.id);

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payload = buildPaymentPayload(req.body);
    const { contract, serviceProvider } = await getValidatedPaymentContext(payload);
    const { warnings } = await validateContractPaymentLimits({
      payload,
      contract,
      existingPaymentId: existingPayment._id,
    });

    const previousStatus = normalizePaymentStatus(existingPayment.status);
    const requestedStatus = normalizePaymentStatus(payload.status);

    if (previousStatus !== requestedStatus) {
      validateAdminPaymentStatusTransition(previousStatus, requestedStatus);
    }

    Object.assign(existingPayment, {
      ...payload,
      paymentDate: payload.paymentDate || existingPayment.paymentDate,
    });

    applyPaymentStatusLifecycle({
      payment: existingPayment,
      nextStatus: requestedStatus,
      previousStatus,
    });

    await existingPayment.save();

    if (previousStatus !== "paid" && requestedStatus === "paid") {
      try {
        await sendPaymentNotification({
          payment: existingPayment,
          contract,
          serviceProvider,
          subject: `Payment Confirmed: ${contract.contractTitle || "Untitled contract"}`,
          heading: "A payment has been confirmed as paid.",
          intro: "Log in to EstateHub to review your updated payment history.",
          buttonLabel: "View Payments",
        });
      } catch (emailError) {
        console.warn("Payment updated, but provider payment confirmation email failed.");
      }
    }

    const populatedPayment = await populatePaymentRecord(existingPayment._id);

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      ...(warnings.length ? { warnings } : {}),
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500 ? "Failed to update payment" : error.message,
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const requestedStatus = normalizePaymentStatus(req.body?.status);
    const nextStatus = validateAdminPaymentStatusTransition(
      payment.status,
      requestedStatus
    );

    const { contract, serviceProvider } = await getValidatedPaymentContext({
      contract: payment.contract,
      serviceProvider: payment.serviceProvider,
    });

    if (nextStatus === "paid") {
      await validateContractPaymentLimits({
        payload: {
          amount: payment.amount,
          paymentType: payment.paymentType || "final",
          status: "paid",
        },
        contract,
        existingPaymentId: payment._id,
      });
    }

    const previousStatus = normalizePaymentStatus(payment.status);

    applyPaymentStatusLifecycle({
      payment,
      nextStatus,
      previousStatus,
      paidAt: new Date(),
    });

    await payment.save();

    if (nextStatus === "paid") {
      try {
        await sendPaymentNotification({
          payment,
          contract,
          serviceProvider,
          subject: `Payment Confirmed: ${contract.contractTitle || "Untitled contract"}`,
          heading: "A payment has been confirmed as paid.",
          intro: "Log in to EstateHub to review your updated payment history.",
          buttonLabel: "View Payments",
        });
      } catch (emailError) {
        console.warn("Payment status updated, but provider payment confirmation email failed.");
      }
    }

    const populatedPayment = await populatePaymentRecord(payment._id);

    res.status(200).json({
      success: true,
      message:
        nextStatus === "paid"
          ? "Payment marked as paid successfully."
          : "Payment cancelled successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to update payment status"
          : error.message,
    });
  }
};

const uploadPaymentEvidence = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId).select("+paymentEvidence.publicId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload one payment evidence file.",
      });
    }

    const existingEvidence = payment.paymentEvidence?.publicId
      ? payment.paymentEvidence.toObject()
      : null;
    const uploadedEvidence = await uploadPaymentEvidenceToCloudinary(req.file);

    try {
      payment.paymentEvidence = {
        ...uploadedEvidence,
        uploadedBy: req.user?._id,
      };
      await payment.save();
    } catch (error) {
      await deletePaymentEvidenceFromCloudinary(uploadedEvidence).catch(() => {});
      throw error;
    }

    if (existingEvidence?.publicId) {
      await deletePaymentEvidenceFromCloudinary(existingEvidence).catch(() => {
        console.warn(
          "Payment evidence was replaced, but the previous Cloudinary file could not be deleted."
        );
      });
    }

    const populatedPayment = await populatePaymentRecord(payment._id);

    return res.status(200).json({
      success: true,
      message: existingEvidence
        ? "Payment evidence replaced successfully."
        : "Payment evidence uploaded successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to upload payment evidence"
          : error.message,
    });
  }
};

const deletePaymentEvidence = async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Payment ID must be a valid record identifier.",
      });
    }

    const payment = await Payment.findById(paymentId).select("+paymentEvidence.publicId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (!payment.paymentEvidence?.url) {
      const populatedPayment = await populatePaymentRecord(payment._id);

      return res.status(200).json({
        success: true,
        message: "No payment evidence was attached to this payment.",
        data: populatedPayment,
      });
    }

    const existingEvidence = payment.paymentEvidence.toObject
      ? payment.paymentEvidence.toObject()
      : payment.paymentEvidence;

    payment.paymentEvidence = undefined;
    await payment.save();

    if (existingEvidence?.publicId) {
      await deletePaymentEvidenceFromCloudinary(existingEvidence).catch(() => {
        console.warn(
          "Payment evidence metadata was removed, but the Cloudinary file could not be deleted."
        );
      });
    }

    const populatedPayment = await populatePaymentRecord(payment._id);

    return res.status(200).json({
      success: true,
      message: "Payment evidence removed successfully.",
      data: populatedPayment,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500
          ? "Failed to remove payment evidence"
          : error.message,
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id).select(
      "+paymentEvidence.publicId"
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.paymentEvidence?.publicId) {
      await deletePaymentEvidenceFromCloudinary(payment.paymentEvidence).catch(() => {
        console.warn(
          "Payment was deleted, but the linked Cloudinary payment evidence file could not be deleted."
        );
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  updatePaymentStatus,
  confirmProviderReceipt,
  reportProviderReceiptIssue,
  resolveProviderReceiptIssue,
  uploadPaymentEvidence,
  deletePaymentEvidence,
  deletePayment,
};
