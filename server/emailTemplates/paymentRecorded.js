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
  paymentMethod,
  paymentStatus,
  referenceNumber,
  notes,
  reviewUrl,
}) => {
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeContractTitle = escapeHtml(contractTitle || "Untitled contract");
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
          Review Payments
        </a>
      </div>
    `
    : "";

  return {
    subject: `Payment Recorded: ${contractTitle || "Untitled contract"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Payment update</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A payment has been recorded for your contract.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Log in to the Estate Management System to review your payment history.
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
      "Estate Management",
      "Payment update",
      "",
      "A payment has been recorded for your contract.",
      "Log in to the Estate Management System to review your payment history.",
      "",
      `Company name: ${companyName || "Not provided"}`,
      `Contract title: ${contractTitle || "Untitled contract"}`,
      ...(safeAmount ? [`Payment amount: ${safeAmount}`] : []),
      ...(safePaymentDate ? [`Payment date: ${safePaymentDate}`] : []),
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
