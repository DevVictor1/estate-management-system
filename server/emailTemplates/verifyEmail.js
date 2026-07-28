const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildVerifyEmailTemplate = ({
  userName,
  verificationUrl,
  expiresInMinutes,
}) => {
  const safeUserName = escapeHtml(userName || "there");
  const safeVerificationUrl =
    typeof verificationUrl === "string" && /^https?:\/\//i.test(verificationUrl)
      ? verificationUrl
      : "";
  const safeExpiresInMinutes = Number.isFinite(expiresInMinutes)
    ? expiresInMinutes
    : 60;

  const actionMarkup = safeVerificationUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeVerificationUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Verify Email Address
        </a>
      </div>
    `
    : "";

  const fallbackUrlMarkup = safeVerificationUrl
    ? `
      <p style="margin: 20px 0 0; color: #64748b;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin: 10px 0 0; word-break: break-word; color: #0b1f3a;">
        ${safeVerificationUrl}
      </p>
    `
    : "";

  return {
    subject: "Verify Your Estate Management Account",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Email verification</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">Verify your email address</h2>
            <p style="margin: 0 0 16px; color: #64748b;">
              Hello ${safeUserName},
            </p>
            <p style="margin: 0 0 16px; color: #64748b;">
              Thank you for creating an Estate Management account. Confirm your email address to activate email notifications and complete your account setup.
            </p>
            <p style="margin: 0; color: #64748b;">
              This verification link will expire in ${safeExpiresInMinutes} minute${
      safeExpiresInMinutes === 1 ? "" : "s"
    }.
            </p>
            ${actionMarkup}
            ${fallbackUrlMarkup}
            <p style="margin: 20px 0 0; color: #64748b;">
              If you did not create this account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
    text: [
      "Estate Management",
      "Email verification",
      "",
      `Hello ${userName || "there"},`,
      "Thank you for creating an Estate Management account. Confirm your email address to activate email notifications and complete your account setup.",
      `This verification link will expire in ${safeExpiresInMinutes} minute${
        safeExpiresInMinutes === 1 ? "" : "s"
      }.`,
      ...(safeVerificationUrl
        ? ["", `Verify your email address: ${safeVerificationUrl}`]
        : []),
      "",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n"),
  };
};

module.exports = {
  buildVerifyEmailTemplate,
};
