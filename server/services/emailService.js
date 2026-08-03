const { getResendClient, getEmailConfig } = require("../config/email");
const {
  getEmailBrandLogoAttachment,
  EMAIL_BRAND_LOGO_CID,
} = require("../emailTemplates/brandAssets");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const sendEmail = async ({ to, subject, html, text, replyTo, attachments }) => {
  const emailConfig = getEmailConfig();
  const resendClient = getResendClient();

  if (!to) {
    return {
      success: false,
      error: "Recipient email is required.",
    };
  }

  if (!subject) {
    return {
      success: false,
      error: "Email subject is required.",
    };
  }

  if (!html && !text) {
    return {
      success: false,
      error: "Email content must include html or text.",
    };
  }

  if (!emailConfig.emailFrom) {
    return {
      success: false,
      error: "EMAIL_FROM is not configured.",
    };
  }

  if (!emailConfig.resendApiKey || !resendClient) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((recipient) => String(recipient || "").trim())
    .filter(Boolean)
    .filter(isValidEmail);

  if (!recipients.length) {
    return {
      success: false,
      error: "A valid recipient email is required.",
    };
  }

  try {
    const emailAttachments = Array.isArray(attachments)
      ? attachments.filter(Boolean)
      : [];
    const shouldAttachBrandLogo =
      typeof html === "string" && html.includes(`cid:${EMAIL_BRAND_LOGO_CID}`);
    const brandLogoAttachment = shouldAttachBrandLogo
      ? getEmailBrandLogoAttachment()
      : null;
    const mergedAttachments = brandLogoAttachment
      ? [
          brandLogoAttachment,
          ...emailAttachments.filter(
            (attachment) =>
              attachment?.contentId !== EMAIL_BRAND_LOGO_CID &&
              attachment?.content_id !== EMAIL_BRAND_LOGO_CID
          ),
        ]
      : emailAttachments;
    const payload = {
      from: emailConfig.emailFrom,
      to: recipients,
      subject,
    };

    if (html) {
      payload.html = html;
    }

    if (text) {
      payload.text = text;
    }

    if (replyTo) {
      payload.replyTo = replyTo;
    }

    if (mergedAttachments.length) {
      payload.attachments = mergedAttachments;
    }

    const response = await resendClient.emails.send(payload);

    if (response.error) {
      console.error(`Email send failed: ${response.error.message || "Unknown email error."}`);

      return {
        success: false,
        error: response.error.message || "Failed to send email.",
      };
    }

    return {
      success: true,
      id: response.data?.id || null,
    };
  } catch (error) {
    console.error(`Email send failed: ${error.message || "Unknown email error."}`);

    return {
      success: false,
      error: error.message || "Failed to send email.",
    };
  }
};

module.exports = {
  sendEmail,
};
