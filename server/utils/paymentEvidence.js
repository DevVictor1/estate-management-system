const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");
const {
  cloudinary,
  configureCloudinary,
  getCloudinaryConfig,
  isCloudinaryConfigured,
} = require("../config/cloudinary");

const MAX_PAYMENT_EVIDENCE_BYTES = 8 * 1024 * 1024;
const MAX_PAYMENT_IMAGE_DIMENSION = 2400;
const MAX_PAYMENT_IMAGE_PIXELS = 50 * 1000 * 1000;
const supportedImageFormats = new Set(["jpeg", "png", "webp"]);

const mimeTypeByFormat = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const sanitizeOriginalName = (value = "", fallbackName = "payment-evidence") => {
  const parsedName = path.basename(String(value || "").trim());
  const sanitized = parsedName.replace(/[^\w.\-\s]/g, "_").slice(0, 140).trim();

  return sanitized || fallbackName;
};

const buildPaymentEvidenceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isPdfBuffer = (buffer) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= 5 &&
  buffer.subarray(0, 5).toString("ascii") === "%PDF-";

const transformImageEvidenceBuffer = async (file) => {
  let image;

  try {
    image = sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: MAX_PAYMENT_IMAGE_PIXELS,
    });
  } catch (error) {
    throw buildPaymentEvidenceError(
      "The uploaded payment evidence image is not valid."
    );
  }

  let metadata;

  try {
    metadata = await image.metadata();
  } catch (error) {
    throw buildPaymentEvidenceError(
      "The uploaded payment evidence image is not valid."
    );
  }

  if (!metadata?.format || !supportedImageFormats.has(metadata.format)) {
    throw buildPaymentEvidenceError(
      "Only JPG, PNG, WebP images, or PDF files can be uploaded as payment evidence."
    );
  }

  let pipeline = image.rotate().resize({
    width: MAX_PAYMENT_IMAGE_DIMENSION,
    height: MAX_PAYMENT_IMAGE_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (metadata.format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  } else if (metadata.format === "png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (metadata.format === "webp") {
    pipeline = pipeline.webp({ quality: 88 });
  }

  const buffer = await pipeline.toBuffer();
  const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;

  return {
    buffer,
    mimeType: mimeTypeByFormat[metadata.format],
    extension,
    resourceType: "image",
  };
};

const transformPdfEvidenceBuffer = (file) => {
  if (!isPdfBuffer(file.buffer)) {
    throw buildPaymentEvidenceError(
      "The uploaded payment evidence PDF is not valid."
    );
  }

  return {
    buffer: file.buffer,
    mimeType: "application/pdf",
    extension: "pdf",
    resourceType: "raw",
  };
};

const transformPaymentEvidenceFile = async (file) => {
  if (!file || !file.buffer || !file.size) {
    throw buildPaymentEvidenceError("The uploaded payment evidence file is empty.");
  }

  if (file.size > MAX_PAYMENT_EVIDENCE_BYTES) {
    throw buildPaymentEvidenceError("Payment evidence must be 8 MB or smaller.");
  }

  const safeOriginalName = sanitizeOriginalName(
    file.originalname,
    "payment-evidence"
  );

  if (file.mimetype === "application/pdf") {
    const transformedPdf = transformPdfEvidenceBuffer(file);

    return {
      ...transformedPdf,
      originalName: safeOriginalName.endsWith(".pdf")
        ? safeOriginalName
        : `${safeOriginalName}.pdf`,
    };
  }

  const transformedImage = await transformImageEvidenceBuffer(file);
  const baseName = safeOriginalName.replace(/\.[^.]+$/, "");

  return {
    ...transformedImage,
    originalName: `${baseName || "payment-evidence"}.${transformedImage.extension}`,
  };
};

const uploadBufferToCloudinary = ({ buffer, extension, resourceType }) => {
  if (!configureCloudinary()) {
    throw buildPaymentEvidenceError(
      "Payment evidence uploads are not configured right now.",
      503
    );
  }

  const { paymentEvidenceFolder } = getCloudinaryConfig();
  const publicId = `${paymentEvidenceFolder}/${Date.now()}-${crypto
    .randomBytes(12)
    .toString("hex")}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        ...(resourceType === "image" ? { format: extension } : { format: "pdf" }),
      },
      (error, result) => {
        if (error || !result?.secure_url || !result?.public_id) {
          reject(
            buildPaymentEvidenceError(
              "We couldn't upload the payment evidence right now.",
              502
            )
          );
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

const uploadPaymentEvidence = async (file) => {
  const transformedFile = await transformPaymentEvidenceFile(file);
  const uploadedFile = await uploadBufferToCloudinary(transformedFile);

  return {
    url: uploadedFile.secure_url,
    publicId: uploadedFile.public_id,
    originalName: transformedFile.originalName,
    mimeType: transformedFile.mimeType,
    size: Number(uploadedFile.bytes) || transformedFile.buffer.length,
    uploadedAt: new Date(),
  };
};

const deletePaymentEvidence = async (paymentEvidence) => {
  const publicId = paymentEvidence?.publicId;

  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  configureCloudinary();

  const resourceType =
    paymentEvidence?.mimeType === "application/pdf" ? "raw" : "image";

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
};

module.exports = {
  MAX_PAYMENT_EVIDENCE_BYTES,
  buildPaymentEvidenceError,
  uploadPaymentEvidence,
  deletePaymentEvidence,
};
