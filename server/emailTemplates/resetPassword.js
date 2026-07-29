const { buildEmailBrandHeader } = require("./brandAssets");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildResetPasswordTemplate = ({
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const safeUserName = escapeHtml(userName || "there");
  const safeResetUrl =
    typeof resetUrl === "string" && /^https?:\/\//i.test(resetUrl)
      ? resetUrl
      : "";
  const safeExpiresInMinutes = Number.isFinite(expiresInMinutes)
    ? expiresInMinutes
    : 30;

  const actionMarkup = safeResetUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeResetUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Reset Password
        </a>
      </div>
    `
    : "";

  const fallbackUrlMarkup = safeResetUrl
    ? `
      <p style="margin: 20px 0 0; color: #64748b;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin: 10px 0 0; word-break: break-word; color: #0b1f3a;">
        ${safeResetUrl}
      </p>
    `
    : "";

  return {
    subject: "Reset Your EstateHub Password",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          ${buildEmailBrandHeader("Password reset")}
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">Reset your password</h2>
            <p style="margin: 0 0 16px; color: #64748b;">
              Hello ${safeUserName},
            </p>
            <p style="margin: 0 0 16px; color: #64748b;">
              We received a request to reset the password for your EstateHub account.
            </p>
            <p style="margin: 0; color: #64748b;">
              This password reset link will expire in ${safeExpiresInMinutes} minute${
      safeExpiresInMinutes === 1 ? "" : "s"
    }.
            </p>
            ${actionMarkup}
            ${fallbackUrlMarkup}
            <p style="margin: 20px 0 0; color: #64748b;">
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub",
      "Password reset",
      "",
      `Hello ${userName || "there"},`,
      "We received a request to reset the password for your EstateHub account.",
      `This password reset link will expire in ${safeExpiresInMinutes} minute${
        safeExpiresInMinutes === 1 ? "" : "s"
      }.`,
      ...(safeResetUrl ? ["", `Reset your password: ${safeResetUrl}`] : []),
      "",
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n"),
  };
};

module.exports = {
  buildResetPasswordTemplate,
};
