const { buildEmailBrandHeader } = require("./brandAssets");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const buildQuotationSubmittedEmail = ({
  taskTitle,
  providerName,
  companyName,
  totalAmount,
  revisionNumber,
  submittedAt,
  reviewUrl,
}) => {
  const safeTaskTitle = escapeHtml(taskTitle || "Untitled task");
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeTotalAmount = escapeHtml(formatCurrency(totalAmount));
  const safeRevisionNumber = Number(revisionNumber) || 1;
  const safeSubmittedAt = submittedAt
    ? escapeHtml(
        new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(submittedAt))
      )
    : "Not provided";
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  return {
    subject: `New Quotation Submitted: ${taskTitle || "Untitled task"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader("New quotation submitted")}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A new quotation has been submitted.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              A service provider has submitted pricing for a task and it is ready for review in EstateHub.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Task title</td>
                  <td style="padding: 10px 0;">${safeTaskTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Provider</td>
                  <td style="padding: 10px 0;">${safeProviderName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Company</td>
                  <td style="padding: 10px 0;">${safeCompanyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Quotation total</td>
                  <td style="padding: 10px 0;">${safeTotalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Revision</td>
                  <td style="padding: 10px 0;">Revision ${safeRevisionNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Submitted</td>
                  <td style="padding: 10px 0;">${safeSubmittedAt}</td>
                </tr>
              </tbody>
            </table>
            ${
              safeReviewUrl
                ? `
              <div style="margin-top: 24px;">
                <a
                  href="${safeReviewUrl}"
                  style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
                >
                  Review Quotations
                </a>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub",
      "New quotation submitted",
      "",
      "A new quotation has been submitted for review.",
      `Task title: ${taskTitle || "Untitled task"}`,
      `Provider: ${providerName || "Service provider"}`,
      `Company: ${companyName || "Not provided"}`,
      `Quotation total: ${formatCurrency(totalAmount)}`,
      `Revision: Revision ${safeRevisionNumber}`,
      `Submitted: ${submittedAt ? new Date(submittedAt).toLocaleString("en-GB") : "Not provided"}`,
      ...(safeReviewUrl ? ["", `Review quotations: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildQuotationSubmittedEmail,
};
