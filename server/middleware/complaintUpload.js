const multer = require("multer");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxComplaintPhotos = 5;
const maxFileSizeBytes = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: maxComplaintPhotos,
    fileSize: maxFileSizeBytes,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "Only JPG, PNG, and WebP images can be attached to a complaint."
      );
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  },
}).array("photos", maxComplaintPhotos);

const complaintUpload = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Each complaint photo must be 5 MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "You can attach up to 5 complaint photos.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "We couldn't process the uploaded complaint photos.",
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message ||
        "We couldn't process the uploaded complaint photos.",
    });
  });
};

module.exports = {
  complaintUpload,
  maxComplaintPhotos,
  maxFileSizeBytes,
  allowedMimeTypes,
};
