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

const buildTaskAssignedEmail = ({
  providerName,
  taskTitle,
  taskDescription,
  priority,
  deadline,
  taskStatus,
  complaintTitle,
  complaintCategory,
  apartmentNumber,
  reviewUrl,
}) => {
  const safeProviderName = escapeHtml(providerName || "Service provider");
  const safeTaskTitle = escapeHtml(taskTitle || "Untitled task");
  const safeTaskDescription = escapeHtml(
    taskDescription || "No task description was provided."
  );
  const safePriority = escapeHtml(priority || "Not provided");
  const safeTaskStatus = escapeHtml(taskStatus || "Not provided");
  const safeDeadline = escapeHtml(formatDate(deadline));
  const safeComplaintTitle = complaintTitle
    ? escapeHtml(complaintTitle)
    : "";
  const safeComplaintCategory = complaintCategory
    ? escapeHtml(complaintCategory)
    : "";
  const safeApartmentNumber = apartmentNumber
    ? escapeHtml(apartmentNumber)
    : "";
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  const complaintRows = complaintTitle
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Complaint title</td>
          <td style="padding: 10px 0;">${safeComplaintTitle}</td>
        </tr>
      `
    : "";

  const complaintCategoryRow = complaintCategory
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Complaint category</td>
          <td style="padding: 10px 0;">${safeComplaintCategory}</td>
        </tr>
      `
    : "";

  const apartmentRow = apartmentNumber
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Apartment number</td>
          <td style="padding: 10px 0;">${safeApartmentNumber}</td>
        </tr>
      `
    : "";

  const actionMarkup = safeReviewUrl
    ? `
      <div style="margin-top: 24px;">
        <a
          href="${safeReviewUrl}"
          style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b1f3a; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Review Tasks
        </a>
      </div>
    `
    : "";

  return {
    subject: `New Task Assigned: ${taskTitle || "Untitled task"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">New task assignment</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">A new task has been assigned to you.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeProviderName}, log in to the Estate Management System to review the task and update its progress.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Task title</td>
                  <td style="padding: 10px 0;">${safeTaskTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Task description</td>
                  <td style="padding: 10px 0;">${safeTaskDescription.replace(/\n/g, "<br />")}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Priority</td>
                  <td style="padding: 10px 0;">${safePriority}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Deadline</td>
                  <td style="padding: 10px 0;">${safeDeadline}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Current status</td>
                  <td style="padding: 10px 0;">${safeTaskStatus}</td>
                </tr>
                ${complaintRows}
                ${complaintCategoryRow}
                ${apartmentRow}
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "Estate Management",
      "New task assignment",
      "",
      `Hello ${providerName || "Service provider"}, a new task has been assigned to you.`,
      "Log in to the Estate Management System to review the task and update its progress.",
      "",
      `Task title: ${taskTitle || "Untitled task"}`,
      `Task description: ${taskDescription || "No task description was provided."}`,
      `Priority: ${priority || "Not provided"}`,
      `Deadline: ${formatDate(deadline)}`,
      `Current status: ${taskStatus || "Not provided"}`,
      ...(complaintTitle ? [`Complaint title: ${complaintTitle}`] : []),
      ...(complaintCategory ? [`Complaint category: ${complaintCategory}`] : []),
      ...(apartmentNumber ? [`Apartment number: ${apartmentNumber}`] : []),
      ...(safeReviewUrl ? ["", `Review tasks: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildTaskAssignedEmail,
};
