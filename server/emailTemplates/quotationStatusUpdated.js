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

const buildProviderQuotationStatusEmail = ({
  variant,
  providerName,
  taskTitle,
  companyName,
  totalAmount,
  revisionNumber,
  adminComment,
  reviewedAt,
  reviewUrl,
}) => {
  const headings = {
    approved: {
      subject: `Quotation Approved: ${taskTitle || "Untitled task"}`,
      subtitle: "Quotation approved",
      title: "Your quotation has been approved.",
      message:
        "The EstateHub team has approved your quotation. You can continue the next steps from your provider account.",
    },
    rejected: {
      subject: `Quotation Rejected: ${taskTitle || "Untitled task"}`,
      subtitle: "Quotation rejected",
      title: "Your quotation was not approved.",
      message:
        "The EstateHub team reviewed your quotation, but it was not approved.",
    },
    revision_requested: {
      subject: `Quotation Revision Requested: ${taskTitle || "Untitled task"}`,
      subtitle: "Quotation revision requested",
      title: "A quotation revision has been requested.",
      message:
        "The EstateHub team reviewed your quotation and requested an updated revision before approval.",
    },
  };

  const content = headings[variant] || headings.revision_requested;
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeTaskTitle = escapeHtml(taskTitle || "Untitled task");
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeTotalAmount = escapeHtml(formatCurrency(totalAmount));
  const safeRevisionNumber = Number(revisionNumber) || 1;
  const safeComment = adminComment ? escapeHtml(adminComment) : "";
  const safeReviewedAt = reviewedAt
    ? escapeHtml(
        new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(reviewedAt))
      )
    : "Not provided";
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  return {
    subject: content.subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader(content.subtitle)}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">${content.title}</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeProviderName}, ${content.message}
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Task title</td>
                  <td style="padding: 10px 0;">${safeTaskTitle}</td>
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
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Reviewed</td>
                  <td style="padding: 10px 0;">${safeReviewedAt}</td>
                </tr>
                ${
                  safeComment
                    ? `
                  <tr>
                    <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Admin comment</td>
                    <td style="padding: 10px 0;">${safeComment.replace(/\n/g, "<br />")}</td>
                  </tr>
                `
                    : ""
                }
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
      content.subtitle,
      "",
      `Hello ${providerName || "Service provider"}, ${content.message}`,
      `Task title: ${taskTitle || "Untitled task"}`,
      `Company: ${companyName || "Not provided"}`,
      `Quotation total: ${formatCurrency(totalAmount)}`,
      `Revision: Revision ${safeRevisionNumber}`,
      `Reviewed: ${reviewedAt ? new Date(reviewedAt).toLocaleString("en-GB") : "Not provided"}`,
      ...(adminComment ? [`Admin comment: ${adminComment}`] : []),
      ...(safeReviewUrl ? ["", `Review quotations: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildProviderQuotationStatusEmail,
};
