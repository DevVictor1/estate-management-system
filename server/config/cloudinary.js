const { v2: cloudinary } = require("cloudinary");

const getCloudinaryConfig = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  apiKey: process.env.CLOUDINARY_API_KEY || "",
  apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  complaintFolder:
    process.env.CLOUDINARY_COMPLAINT_FOLDER ||
    "estate-management/complaints",
});

const isCloudinaryConfigured = () => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  return Boolean(cloudName && apiKey && apiSecret);
};

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return true;
};

module.exports = {
  cloudinary,
  getCloudinaryConfig,
  isCloudinaryConfigured,
  configureCloudinary,
};
