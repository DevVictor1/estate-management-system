const { Resend } = require("resend");

const getEmailConfig = () => ({
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailTestRecipient: process.env.EMAIL_TEST_RECIPIENT || "",
  emailAdminRecipient: process.env.EMAIL_ADMIN_RECIPIENT || "",
  emailProviderRecipient: process.env.EMAIL_PROVIDER_RECIPIENT || "",
  emailResidentRecipient: process.env.EMAIL_RESIDENT_RECIPIENT || "",
  emailProviderStatusRecipient:
    process.env.EMAIL_PROVIDER_STATUS_RECIPIENT || "",
  emailContractRecipient: process.env.EMAIL_CONTRACT_RECIPIENT || "",
  emailPaymentRecipient: process.env.EMAIL_PAYMENT_RECIPIENT || "",
  emailQuotationAdminRecipient:
    process.env.EMAIL_QUOTATION_ADMIN_RECIPIENT || "",
  emailQuotationProviderRecipient:
    process.env.EMAIL_QUOTATION_PROVIDER_RECIPIENT || "",
  emailVerificationExpiresMinutes:
    process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES || "",
  passwordResetExpiresMinutes:
    process.env.PASSWORD_RESET_EXPIRES_MINUTES || "",
});

const getResendClient = () => {
  const { resendApiKey } = getEmailConfig();

  return resendApiKey ? new Resend(resendApiKey) : null;
};

module.exports = {
  getResendClient,
  getEmailConfig,
};
