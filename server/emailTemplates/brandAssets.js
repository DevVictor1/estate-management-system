const fs = require("fs");
const path = require("path");

const EMAIL_BRAND_LOGO_CID = "estatehub-logo";

let cachedFullLogoAttachment = null;
let logoWarningLogged = false;

const getEmailBrandLogoAttachment = () => {
  if (cachedFullLogoAttachment) {
    return cachedFullLogoAttachment;
  }

  try {
    const logoPath = path.resolve(__dirname, "../assets/branding/estatehub-logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    cachedFullLogoAttachment = {
      filename: "estatehub-logo.png",
      content: logoBuffer,
      contentType: "image/png",
      contentId: EMAIL_BRAND_LOGO_CID,
    };
    return cachedFullLogoAttachment;
  } catch (error) {
    if (!logoWarningLogged) {
      logoWarningLogged = true;
      console.warn(
        `Email branding asset unavailable: ${error.message || "Unknown logo error."}`
      );
    }
    return "";
  }
};

const buildEmailBrandHeader = (subtitle) => {
  const logoAttachment = getEmailBrandLogoAttachment();
  const safeSubtitle = String(subtitle || "");
  const logoMarkup = logoAttachment
    ? `
            <img
              src="cid:${EMAIL_BRAND_LOGO_CID}"
              alt="EstateHub logo"
              style="display: block; width: 100%; max-width: 220px; height: auto;"
            />
      `
    : '<h1 style="margin: 0; font-size: 24px;">EstateHub</h1>';

  return `
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            ${logoMarkup}
            <p style="margin: 10px 0 0; font-size: 14px;">${safeSubtitle}</p>
          </div>
  `;
};

module.exports = {
  buildEmailBrandHeader,
  getEmailBrandLogoAttachment,
  EMAIL_BRAND_LOGO_CID,
};
