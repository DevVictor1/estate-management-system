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

const buildProviderContractCreatedEmail = ({
  providerName,
  companyName,
  contractTitle,
  startDate,
  endDate,
  contractValue,
  paymentTerms,
  contractStatus,
  notes,
  reviewUrl,
}) => {
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeContractTitle = escapeHtml(contractTitle || "Untitled contract");
  const safePaymentTerms = paymentTerms ? escapeHtml(paymentTerms) : "";
  const safeContractStatus = escapeHtml(contractStatus || "Not provided");
  const safeNotes = notes ? escapeHtml(notes) : "";
  const safeStartDate = formatDate(startDate);
  const safeEndDate = formatDate(endDate);
  const safeContractValue = formatCurrency(contractValue);
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  const startDateRow = safeStartDate
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Start date</td>
          <td style="padding: 10px 0;">${escapeHtml(safeStartDate)}</td>
        </tr>
      `
    : "";

  const endDateRow = safeEndDate
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">End date</td>
          <td style="padding: 10px 0;">${escapeHtml(safeEndDate)}</td>
        </tr>
      `
    : "";

  const contractValueRow = safeContractValue
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Contract value</td>
          <td style="padding: 10px 0;">${escapeHtml(safeContractValue)}</td>
        </tr>
      `
    : "";

  const paymentTermsRow = safePaymentTerms
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Payment terms</td>
          <td style="padding: 10px 0;">${safePaymentTerms.replace(/\n/g, "<br />")}</td>
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
          Review Contract
        </a>
      </div>
    `
    : "";

  return {
    subject: `New Contract Created: ${contractTitle || "Untitled contract"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Contract creation update</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A new contract has been created for your company.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeProviderName}, log in to the Estate Management System to review your contract details.
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
                ${startDateRow}
                ${endDateRow}
                ${contractValueRow}
                ${paymentTermsRow}
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Contract status</td>
                  <td style="padding: 10px 0;">${safeContractStatus}</td>
                </tr>
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
      "Contract creation update",
      "",
      `Hello ${providerName || "Service provider"}, a new contract has been created for your company.`,
      "Log in to the Estate Management System to review your contract details.",
      "",
      `Company name: ${companyName || "Not provided"}`,
      `Contract title: ${contractTitle || "Untitled contract"}`,
      ...(safeStartDate ? [`Start date: ${safeStartDate}`] : []),
      ...(safeEndDate ? [`End date: ${safeEndDate}`] : []),
      ...(safeContractValue ? [`Contract value: ${safeContractValue}`] : []),
      ...(paymentTerms ? [`Payment terms: ${paymentTerms}`] : []),
      `Contract status: ${contractStatus || "Not provided"}`,
      ...(notes ? [`Notes: ${notes}`] : []),
      ...(safeReviewUrl ? ["", `Review contract: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildProviderContractCreatedEmail,
};
