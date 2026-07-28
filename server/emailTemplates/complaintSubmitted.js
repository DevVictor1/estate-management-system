const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const buildComplaintSubmittedEmail = ({
  complaintTitle,
  description,
  category,
  priority,
  residentName,
  apartmentNumber,
  submittedAt,
  reviewUrl,
}) => {
  const safeComplaintTitle = escapeHtml(complaintTitle || "Untitled complaint");
  const safeDescription = escapeHtml(description || "No description provided.");
  const safeCategory = escapeHtml(category || "Not provided");
  const safePriority = escapeHtml(priority || "Not provided");
  const safeResidentName = escapeHtml(residentName || "Not provided");
  const safeApartmentNumber = escapeHtml(apartmentNumber || "Not provided");
  const safeSubmittedAt = escapeHtml(formatDate(submittedAt));
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  const subject = `New Complaint Submitted: ${complaintTitle || "Untitled complaint"}`;

  const actionMarkup = safeReviewUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeReviewUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Review Complaints
        </a>
      </div>
    `
    : "";

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">New resident complaint</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A new resident complaint has been submitted.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Log in to the Estate Management System to review and assign the appropriate service provider.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Complaint title</td>
                  <td style="padding: 10px 0;">${safeComplaintTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Resident name</td>
                  <td style="padding: 10px 0;">${safeResidentName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Apartment number</td>
                  <td style="padding: 10px 0;">${safeApartmentNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Category</td>
                  <td style="padding: 10px 0;">${safeCategory}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Priority</td>
                  <td style="padding: 10px 0;">${safePriority}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Submitted date</td>
                  <td style="padding: 10px 0;">${safeSubmittedAt}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Description</td>
                  <td style="padding: 10px 0;">${safeDescription.replace(/\n/g, "<br />")}</td>
                </tr>
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "Estate Management",
      "New resident complaint",
      "",
      "A new resident complaint has been submitted.",
      "Log in to the Estate Management System to review and assign the appropriate service provider.",
      "",
      `Complaint title: ${complaintTitle || "Untitled complaint"}`,
      `Resident name: ${residentName || "Not provided"}`,
      `Apartment number: ${apartmentNumber || "Not provided"}`,
      `Category: ${category || "Not provided"}`,
      `Priority: ${priority || "Not provided"}`,
      `Submitted date: ${formatDate(submittedAt)}`,
      `Description: ${description || "No description provided."}`,
      ...(safeReviewUrl ? ["", `Review complaints: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildComplaintSubmittedEmail,
};
