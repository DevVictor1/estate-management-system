const { buildEmailBrandHeader } = require("./brandAssets");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
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

const buildPaymentRecordedEmail = ({
  companyName,
  contractTitle,
  amount,
  paymentDate,
  paymentType,
  paymentMethod,
  paymentStatus,
  referenceNumber,
  notes,
  hasPaymentEvidence,
  reviewUrl,
  subject,
  heading,
  intro,
  buttonLabel,
}) => {
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeContractTitle = escapeHtml(contractTitle || "Untitled contract");
  const safePaymentType = paymentType ? escapeHtml(paymentType) : "";
  const safePaymentMethod = paymentMethod ? escapeHtml(paymentMethod) : "";
  const safePaymentStatus = escapeHtml(paymentStatus || "Not provided");
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : "";
  const safeNotes = notes ? escapeHtml(notes) : "";
  const safePaymentDate = formatDate(paymentDate);
  const safeAmount = formatCurrency(amount);
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";
  const evidenceMessage = hasPaymentEvidence
    ? "Payment evidence is available in your EstateHub account."
    : "";
  const receiptConfirmationMessage =
    String(paymentStatus || "").trim().toLowerCase() === "paid"
      ? "Please log in to EstateHub to confirm once you have received the funds."
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

  const paymentMethodRow = safePaymentMethod
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Payment method</td>
          <td style="padding: 10px 0;">${safePaymentMethod}</td>
        </tr>
      `
    : "";

  const paymentTypeRow = safePaymentType
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Payment type</td>
          <td style="padding: 10px 0;">${safePaymentType}</td>
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

  const notesRow = safeNotes
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Notes</td>
          <td style="padding: 10px 0;">${safeNotes.replace(/\n/g, "<br />")}</td>
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
          ${escapeHtml(buttonLabel || "Review Payments")}
        </a>
      </div>
    `
    : "";

  const safeHeading = escapeHtml(
    heading || "A payment has been recorded for your contract."
  );
  const safeIntro = escapeHtml(
    intro || "Log in to EstateHub to review your payment history."
  );
  const safeSubject = subject || `Payment Recorded: ${contractTitle || "Untitled contract"}`;

  return {
    subject: safeSubject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader("Payment update")}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">${safeHeading}</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              ${safeIntro}
            </p>
            ${
              evidenceMessage
                ? `<p style="margin: 0 0 20px; color: #64748b;">${escapeHtml(
                    evidenceMessage
                  )}</p>`
                : ""
            }
            ${
              receiptConfirmationMessage
                ? `<p style="margin: 0 0 20px; color: #64748b;">${escapeHtml(
                    receiptConfirmationMessage
                  )}</p>`
                : ""
            }
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
                ${paymentTypeRow}
                ${paymentMethodRow}
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Payment status</td>
                  <td style="padding: 10px 0;">${safePaymentStatus}</td>
                </tr>
                ${referenceNumberRow}
                ${notesRow}
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub",
      "Payment update",
      "",
      heading || "A payment has been recorded for your contract.",
      intro || "Log in to EstateHub to review your payment history.",
      ...(evidenceMessage ? [evidenceMessage] : []),
      ...(receiptConfirmationMessage ? [receiptConfirmationMessage] : []),
      "",
      `Company name: ${companyName || "Not provided"}`,
      `Contract title: ${contractTitle || "Untitled contract"}`,
      ...(safeAmount ? [`Payment amount: ${safeAmount}`] : []),
      ...(safePaymentDate ? [`Payment date: ${safePaymentDate}`] : []),
      ...(paymentType ? [`Payment type: ${paymentType}`] : []),
      ...(paymentMethod ? [`Payment method: ${paymentMethod}`] : []),
      `Payment status: ${paymentStatus || "Not provided"}`,
      ...(referenceNumber ? [`Reference number: ${referenceNumber}`] : []),
      ...(notes ? [`Notes: ${notes}`] : []),
      ...(safeReviewUrl ? ["", `Review payments: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildPaymentRecordedEmail,
};
