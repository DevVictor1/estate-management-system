const { buildEmailBrandHeader } = require("./brandAssets");

const buildTestEmail = () => {
  const subject = "EstateHub Email Test";

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden;">
          ${buildEmailBrandHeader("Email delivery test")}
          <div style="padding: 24px;">
            <h2 style="margin-top: 0; font-size: 20px; color: #14213d;">Resend integration is ready</h2>
            <p style="margin: 0 0 16px;">
              This is a test email from the EstateHub backend.
            </p>
            <p style="margin: 0 0 16px;">
              If you received this message, the initial Resend infrastructure is configured well enough to send email from the server.
            </p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              You can now connect this service to future notifications without changing the existing business flows.
            </p>
          </div>
        </div>
      </div>
    `,
    text: [
      "EstateHub Email Test",
      "",
      "This is a test email from the EstateHub backend.",
      "If you received this message, the initial Resend infrastructure is configured and able to send email from the server.",
    ].join("\n"),
  };
};

module.exports = {
  buildTestEmail,
};
