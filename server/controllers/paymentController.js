const Payment = require("../models/Payment");
const Contract = require("../models/Contract");
const ServiceProvider = require("../models/ServiceProvider");
const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const {
  buildPaymentRecordedEmail,
} = require("../emailTemplates/paymentRecorded");
const {
  resolveVerifiedUserEmailRecipient,
} = require("../utils/verifiedRecipients");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

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

const getPaymentsReviewUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/payments`;
};

const createPayment = async (req, res) => {
  try {
    const payment = await Payment.create(req.body);

    const contract = payment.contract
      ? await Contract.findById(payment.contract).select(
          "contractTitle serviceProvider"
        )
      : null;

    if (!contract) {
      console.warn(
        "Payment recorded, but the linked contract could not be found for email notification."
      );
    } else if (!contract.serviceProvider) {
      console.warn(
        "Payment recorded, but the linked contract does not have a service provider for email notification."
      );
    } else {
      const serviceProvider = await ServiceProvider.findById(
        contract.serviceProvider
      ).select("companyName email");

      if (!serviceProvider) {
        console.warn(
          "Payment recorded, but the linked service provider could not be found for email notification."
        );
      } else {
        const recipients = await getPaymentNotificationRecipient(serviceProvider);

        if (!recipients.length) {
          console.warn(
            "Payment recorded, but no valid payment email recipient was available."
          );
        } else {
          const emailPayload = buildPaymentRecordedEmail({
            companyName: serviceProvider.companyName,
            contractTitle: contract.contractTitle,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.status,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
            reviewUrl: getPaymentsReviewUrl(),
          });

          const emailResult = await sendEmail({
            to: recipients,
            subject: emailPayload.subject,
            html: emailPayload.html,
            text: emailPayload.text,
          });

          if (!emailResult.success) {
            console.warn(
              "Payment recorded, but provider notification email failed."
            );
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to record payment",
      error: error.message,
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("serviceProvider", "companyName serviceCategory phone")
      .populate({
        path: "contract",
        select: "contractTitle contractValue status serviceProvider",
        populate: {
          path: "serviceProvider",
          select: "companyName serviceCategory email",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("serviceProvider", "companyName serviceCategory phone")
      .populate({
        path: "contract",
        select: "contractTitle contractValue status serviceProvider",
        populate: {
          path: "serviceProvider",
          select: "companyName serviceCategory email",
        },
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message,
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
      error: error.message,
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
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
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};
