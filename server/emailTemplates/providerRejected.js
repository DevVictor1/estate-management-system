const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const buildProviderRejectedEmail = ({
  providerName,
  companyName,
  serviceCategory,
  rejectedAt,
  rejectionReason,
}) => {
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeServiceCategory = escapeHtml(serviceCategory || "Not provided");
  const safeRejectedAt = escapeHtml(formatDate(rejectedAt));
  const safeRejectionReason = rejectionReason ? escapeHtml(rejectionReason) : "";

  const rejectionReasonRow = safeRejectionReason
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Reason</td>
          <td style="padding: 10px 0;">${safeRejectionReason.replace(/\n/g, "<br />")}</td>
        </tr>
      `
    : "";

  return {
    subject: "Update on Your Service Provider Registration",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Service provider registration update</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">Your registration was not approved.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeProviderName}, the Estate Manager has reviewed your registration, but it was not approved at this time.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Contact name</td>
                  <td style="padding: 10px 0;">${safeProviderName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Company name</td>
                  <td style="padding: 10px 0;">${safeCompanyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Service category</td>
                  <td style="padding: 10px 0;">${safeServiceCategory}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Status</td>
                  <td style="padding: 10px 0;">Rejected</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Decision date</td>
                  <td style="padding: 10px 0;">${safeRejectedAt}</td>
                </tr>
                ${rejectionReasonRow}
              </tbody>
            </table>
            <p style="margin: 20px 0 0; color: #64748b;">
              Please contact the Estate Manager if you need clarification or would like to update your registration details.
            </p>
          </div>
        </div>
      </div>
    `,
    text: [
      "Estate Management",
      "Service provider registration update",
      "",
      `Hello ${providerName || "Service provider"}, your registration was not approved.`,
      "The Estate Manager has reviewed your registration, but it was not approved at this time.",
      "Please contact the Estate Manager if you need clarification or would like to update your registration details.",
      "",
      `Contact name: ${providerName || "Service provider"}`,
      `Company name: ${companyName || "Not provided"}`,
      `Service category: ${serviceCategory || "Not provided"}`,
      "Status: Rejected",
      `Decision date: ${formatDate(rejectedAt)}`,
      ...(rejectionReason ? [`Reason: ${rejectionReason}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildProviderRejectedEmail,
};
