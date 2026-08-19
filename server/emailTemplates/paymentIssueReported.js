const { buildEmailBrandHeader } = require("./brandAssets");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value, options = {}) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
};

const formatCurrency = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);
};

const issueReasonLabels = {
  not_received: "Payment not received",
  bank_delay: "Bank processing delay",
  transaction_reversed: "Transaction reversed",
  incorrect_amount: "Incorrect amount",
  other: "Other",
};

const formatIssueReason = (value = "") =>
  issueReasonLabels[String(value || "").trim().toLowerCase()] ||
  "Payment issue reported";

const buildPaymentIssueReportedEmail = ({
  companyName,
  contractTitle,
  amount,
  paymentDate,
  referenceNumber,
  issueReason,
  issueNote,
  issueReportedAt,
  reviewUrl,
}) => {
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeContractTitle = escapeHtml(contractTitle || "Untitled contract");
  const safeAmount = formatCurrency(amount);
  const safePaymentDate = formatDate(paymentDate);
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : "";
  const safeIssueReason = escapeHtml(formatIssueReason(issueReason));
  const safeIssueNote = issueNote ? escapeHtml(issueNote) : "";
  const safeIssueReportedAt = formatDate(issueReportedAt, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  const amountRow = safeAmount
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Payment amount</td>
          <td style="padding: 10px 0;">${escapeHtml(safeAmount)}</td>
        </tr>
      `
    : "";

  const paymentDateRow = safePaymentDate
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Payment date</td>
          <td style="padding: 10px 0;">${escapeHtml(safePaymentDate)}</td>
        </tr>
      `
    : "";

  const referenceNumberRow = safeReferenceNumber
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Reference number</td>
          <td style="padding: 10px 0;">${safeReferenceNumber}</td>
        </tr>
      `
    : "";

  const issueNoteRow = safeIssueNote
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Provider note</td>
          <td style="padding: 10px 0;">${safeIssueNote.replace(/\n/g, "<br />")}</td>
        </tr>
      `
    : "";

  const reportedAtRow = safeIssueReportedAt
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Reported</td>
          <td style="padding: 10px 0;">${escapeHtml(safeIssueReportedAt)}</td>
        </tr>
      `
    : "";

  const actionMarkup = safeReviewUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeReviewUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Review Payments
        </a>
      </div>
    `
    : "";

  return {
    subject: "Payment Issue Reported - EstateHub",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader("Payment issue reported")}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A service provider has reported a payment issue.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              A service provider has reported an issue with a payment marked as paid. Log in to EstateHub to review the payment and follow up.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Company name</td>
                  <td style="padding: 10px 0;">${safeCompanyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Contract title</td>
                  <td style="padding: 10px 0;">${safeContractTitle}</td>
                </tr>
                ${amountRow}
                ${paymentDateRow}
                ${referenceNumberRow}
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Issue reason</td>
                  <td style="padding: 10px 0;">${safeIssueReason}</td>
                </tr>
                ${issueNoteRow}
                ${reportedAtRow}
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub",
      "Payment issue reported",
      "",
      "A service provider has reported an issue with a payment marked as paid.",
      "Log in to EstateHub to review the payment and follow up.",
      "",
      `Company name: ${companyName || "Not provided"}`,
      `Contract title: ${contractTitle || "Untitled contract"}`,
      ...(safeAmount ? [`Payment amount: ${safeAmount}`] : []),
      ...(safePaymentDate ? [`Payment date: ${safePaymentDate}`] : []),
      ...(referenceNumber ? [`Reference number: ${referenceNumber}`] : []),
      `Issue reason: ${formatIssueReason(issueReason)}`,
      ...(issueNote ? [`Provider note: ${issueNote}`] : []),
      ...(safeIssueReportedAt ? [`Reported: ${safeIssueReportedAt}`] : []),
      ...(safeReviewUrl ? ["", `Review payments: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildPaymentIssueReportedEmail,
};
