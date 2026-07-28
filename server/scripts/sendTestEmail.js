require("dotenv").config();

const { getEmailConfig } = require("../config/email");
const { sendEmail } = require("../services/emailService");
const { buildTestEmail } = require("../emailTemplates/testEmail");

const run = async () => {
  const emailConfig = getEmailConfig();

  if (!emailConfig.emailTestRecipient) {
    console.error("EMAIL_TEST_RECIPIENT is missing.");
    process.exit(1);
  }

  const template = buildTestEmail();

  const result = await sendEmail({
    to: emailConfig.emailTestRecipient,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!result.success) {
    console.error(`Email test failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`Email test succeeded. ID: ${result.id || "No ID returned"}`);
};

run().catch((error) => {
  console.error(`Email test failed: ${error.message || "Unexpected error."}`);
  process.exit(1);
});
