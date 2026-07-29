const fs = require("fs");
const path = require("path");

let cachedFullLogoDataUri = null;

const getFullLogoDataUri = () => {
  if (cachedFullLogoDataUri) {
    return cachedFullLogoDataUri;
  }

  try {
    const logoPath = path.resolve(
      __dirname,
      "../../client/src/assets/branding/estatehub-logo.png"
    );
    const logoBuffer = fs.readFileSync(logoPath);
    cachedFullLogoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    return cachedFullLogoDataUri;
  } catch (error) {
    console.error(
      `Email branding asset unavailable: ${error.message || "Unknown logo error."}`
    );
    return "";
  }
};

const buildEmailBrandHeader = (subtitle) => {
  const logoDataUri = getFullLogoDataUri();
  const safeSubtitle = String(subtitle || "");
  const logoMarkup = logoDataUri
    ? `
            <img
              src="${logoDataUri}"
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
};
