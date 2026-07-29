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

const buildProviderApprovedEmail = ({
  providerName,
  companyName,
  serviceCategory,
  approvedAt,
  loginUrl,
}) => {
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeCompanyName = escapeHtml(companyName || "Not provided");
  const safeServiceCategory = escapeHtml(serviceCategory || "Not provided");
  const safeApprovedAt = escapeHtml(formatDate(approvedAt));
  const safeLoginUrl =
    typeof loginUrl === "string" && /^https?:\/\//i.test(loginUrl)
      ? loginUrl
      : "";

  const actionMarkup = safeLoginUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeLoginUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Log In
        </a>
      </div>
    `
    : "";

  return {
    subject: "Your Service Provider Registration Has Been Approved",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader("Service provider approval update")}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">Your registration has been approved.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeProviderName}, you can now log in to EstateHub and view tasks assigned to your company.
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
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Approval status</td>
                  <td style="padding: 10px 0;">Approved</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Approval date</td>
                  <td style="padding: 10px 0;">${safeApprovedAt}</td>
                </tr>
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub",
      "Service provider approval update",
      "",
      `Hello ${providerName || "Service provider"}, your registration has been approved.`,
      "You can now log in to EstateHub and view tasks assigned to your company.",
      "",
      `Contact name: ${providerName || "Service provider"}`,
      `Company name: ${companyName || "Not provided"}`,
      `Service category: ${serviceCategory || "Not provided"}`,
      "Approval status: Approved",
      `Approval date: ${formatDate(approvedAt)}`,
      ...(safeLoginUrl ? ["", `Log in: ${safeLoginUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildProviderApprovedEmail,
};
