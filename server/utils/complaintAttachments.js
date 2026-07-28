const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");
const {
  cloudinary,
  configureCloudinary,
  getCloudinaryConfig,
  isCloudinaryConfigured,
} = require("../config/cloudinary");

const MAX_COMPLAINT_ATTACHMENTS = 5;
const MAX_COMPLAINT_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const MAX_INPUT_PIXELS = 40 * 1000 * 1000;

const supportedFormats = new Set(["jpeg", "png", "webp"]);

const mimeTypeByFormat = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const sanitizeOriginalName = (value = "", fallbackName = "complaint-photo") => {
  const parsedName = path.basename(String(value || "").trim());
  const sanitized = parsedName.replace(/[^\w.\-\s]/g, "_").slice(0, 120).trim();

  return sanitized || fallbackName;
};

const buildAttachmentError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const extractComplaintUploadFiles = (files) => {
  if (!files) {
    return [];
  }

  if (Array.isArray(files)) {
    return files;
  }

  if (Array.isArray(files.photos)) {
    return files.photos;
  }

  return [];
};

const transformImageBuffer = async (file, index) => {
  if (!file || !file.buffer || !file.size) {
    throw buildAttachmentError("One of the uploaded complaint photos is empty.");
  }

  if (file.size > MAX_COMPLAINT_ATTACHMENT_BYTES) {
    throw buildAttachmentError("Each complaint photo must be 5 MB or smaller.");
  }

  let image;

  try {
    image = sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    });
  } catch (error) {
    throw buildAttachmentError(
      "One of the uploaded files is not a valid complaint image."
    );
  }

  let metadata;

  try {
    metadata = await image.metadata();
  } catch (error) {
    throw buildAttachmentError(
      "One of the uploaded files is not a valid complaint image."
    );
  }

  if (!metadata?.format || !supportedFormats.has(metadata.format)) {
    throw buildAttachmentError(
      "Only JPG, PNG, and WebP images can be attached to a complaint."
    );
  }

  let pipeline = image.rotate().resize({
    width: MAX_IMAGE_DIMENSION,
    height: MAX_IMAGE_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (metadata.format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  } else if (metadata.format === "png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (metadata.format === "webp") {
    pipeline = pipeline.webp({ quality: 82 });
  }

  const buffer = await pipeline.toBuffer();
  const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;

  return {
    buffer,
    mimeType: mimeTypeByFormat[metadata.format],
    originalName: sanitizeOriginalName(
      file.originalname,
      `complaint-photo-${index + 1}.${extension}`
    ),
    extension,
  };
};

const uploadBufferToCloudinary = (buffer, extension) => {
  if (!configureCloudinary()) {
    throw buildAttachmentError(
      "Complaint photo uploads are not configured right now.",
      503
    );
  }

  const { complaintFolder } = getCloudinaryConfig();
  const publicId = `${complaintFolder}/${Date.now()}-${crypto
    .randomBytes(12)
    .toString("hex")}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        format: extension,
      },
      (error, result) => {
        if (error || !result?.secure_url || !result?.public_id) {
          reject(
            buildAttachmentError(
              "We couldn't upload the complaint photos right now.",
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

const deleteComplaintAttachments = async (attachments = []) => {
  const publicIds = attachments
    .map((attachment) => attachment?.publicId)
    .filter(Boolean);

  if (!publicIds.length || !isCloudinaryConfigured()) {
    return;
  }

  configureCloudinary();

  await Promise.allSettled(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      })
    )
  );
};

const uploadComplaintAttachments = async (files = []) => {
  if (!files.length) {
    return [];
  }

  if (files.length > MAX_COMPLAINT_ATTACHMENTS) {
    throw buildAttachmentError("You can attach up to 5 complaint photos.");
  }

  const uploadedAttachments = [];

  try {
    for (const [index, file] of files.entries()) {
      const transformed = await transformImageBuffer(file, index);
      const uploadedImage = await uploadBufferToCloudinary(
        transformed.buffer,
        transformed.extension
      );

      uploadedAttachments.push({
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
        originalName: transformed.originalName,
        mimeType: transformed.mimeType,
        size: Number(uploadedImage.bytes) || transformed.buffer.length,
        uploadedAt: new Date(),
      });
    }

    return uploadedAttachments;
  } catch (error) {
    await deleteComplaintAttachments(uploadedAttachments);
    throw error;
  }
};

module.exports = {
  MAX_COMPLAINT_ATTACHMENTS,
  MAX_COMPLAINT_ATTACHMENT_BYTES,
  extractComplaintUploadFiles,
  uploadComplaintAttachments,
  deleteComplaintAttachments,
};
