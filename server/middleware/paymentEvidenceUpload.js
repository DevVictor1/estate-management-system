const multer = require("multer");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const maxPaymentEvidenceFiles = 1;
const maxPaymentEvidenceBytes = 8 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: maxPaymentEvidenceFiles,
    fileSize: maxPaymentEvidenceBytes,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "Only JPG, PNG, WebP images, or PDF files can be uploaded as payment evidence."
      );
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  },
}).single("evidence");

const paymentEvidenceUpload = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Payment evidence must be 8 MB or smaller.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Upload only one payment evidence file at a time.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "We couldn't process the uploaded payment evidence.",
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || "We couldn't process the uploaded payment evidence.",
    });
  });
};

module.exports = {
  paymentEvidenceUpload,
  maxPaymentEvidenceFiles,
  maxPaymentEvidenceBytes,
  allowedMimeTypes,
};
