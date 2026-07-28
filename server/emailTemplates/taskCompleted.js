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

const buildTaskCompletedEmail = ({
  residentName,
  taskTitle,
  taskDescription,
  complaintTitle,
  serviceProviderName,
  completionNote,
  completedAt,
  reviewUrl,
}) => {
  const safeResidentName = escapeHtml(residentName || "Resident");
  const safeTaskTitle = escapeHtml(taskTitle || "Untitled task");
  const safeTaskDescription = escapeHtml(
    taskDescription || "No task description was provided."
  );
  const safeComplaintTitle = escapeHtml(complaintTitle || "Not provided");
  const safeServiceProviderName = escapeHtml(
    serviceProviderName || "Assigned service provider"
  );
  const safeCompletionNote = completionNote ? escapeHtml(completionNote) : "";
  const safeCompletedAt = escapeHtml(formatDate(completedAt));
  const safeReviewUrl =
    typeof reviewUrl === "string" && /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : "";

  const completionNoteRow = safeCompletionNote
    ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Completion note</td>
          <td style="padding: 10px 0;">${safeCompletionNote.replace(/\n/g, "<br />")}</td>
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
          View Complaints
        </a>
      </div>
    `
    : "";

  return {
    subject: `Task Completed: ${taskTitle || "Untitled task"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; padding: 24px;">
        <div style="max-width: 680px; margin: 0 auto; border: 1px solid #d9e2ec; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h1 style="margin: 0; font-size: 24px;">Estate Management</h1>
            <p style="margin: 8px 0 0; font-size: 14px;">Task completion update</p>
          </div>
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #14213d;">Your maintenance task has been completed.</h2>
            <p style="margin: 0 0 20px; color: #64748b;">
              Hello ${safeResidentName}, if the issue is not fully resolved, please contact the Estate Manager or submit a follow-up complaint.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; width: 180px; vertical-align: top;">Resident name</td>
                  <td style="padding: 10px 0;">${safeResidentName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Complaint title</td>
                  <td style="padding: 10px 0;">${safeComplaintTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Task title</td>
                  <td style="padding: 10px 0;">${safeTaskTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Task description</td>
                  <td style="padding: 10px 0;">${safeTaskDescription.replace(/\n/g, "<br />")}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Service provider</td>
                  <td style="padding: 10px 0;">${safeServiceProviderName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Current status</td>
                  <td style="padding: 10px 0;">Completed</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; vertical-align: top;">Completed at</td>
                  <td style="padding: 10px 0;">${safeCompletedAt}</td>
                </tr>
                ${completionNoteRow}
              </tbody>
            </table>
            ${actionMarkup}
          </div>
        </div>
      </div>
    `,
    text: [
      "Estate Management",
      "Task completion update",
      "",
      `Hello ${residentName || "Resident"}, your maintenance task has been completed.`,
      "If the issue is not fully resolved, please contact the Estate Manager or submit a follow-up complaint.",
      "",
      `Complaint title: ${complaintTitle || "Not provided"}`,
      `Task title: ${taskTitle || "Untitled task"}`,
      `Task description: ${taskDescription || "No task description was provided."}`,
      `Service provider: ${serviceProviderName || "Assigned service provider"}`,
      "Current status: Completed",
      `Completed at: ${formatDate(completedAt)}`,
      ...(completionNote ? [`Completion note: ${completionNote}`] : []),
      ...(safeReviewUrl ? ["", `View complaints: ${safeReviewUrl}`] : []),
    ].join("\n"),
  };
};

module.exports = {
  buildTaskCompletedEmail,
};
