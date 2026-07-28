require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const parseArguments = (argv) => {
  const positionalArgs = [];
  const options = {};

  argv.forEach((arg) => {
    if (arg.startsWith("--current-email=")) {
      options.currentEmail = arg.slice("--current-email=".length);
      return;
    }

    if (arg.startsWith("--id=")) {
      options.id = arg.slice("--id=".length);
      return;
    }

    positionalArgs.push(arg);
  });

  return {
    newEmail: positionalArgs[0] || "",
    currentEmail: options.currentEmail || "",
    id: options.id || "",
  };
};

const printUsage = () => {
  console.error(
    "Usage: npm run admin:recover-email -- <new-email> [--current-email=old-admin@example.com] [--id=<admin-user-id>]"
  );
};

const connectToDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
};

const resolveAdminUser = async ({ currentEmail, id }) => {
  const adminCount = await User.countDocuments({ role: "admin" });

  if (adminCount === 0) {
    throw new Error("No administrator account was found.");
  }

  if (adminCount === 1) {
    return User.findOne({ role: "admin" }).select(
      "+emailVerificationTokenHash +emailVerificationExpires +emailVerificationSentAt"
    );
  }

  if (!currentEmail && !id) {
    throw new Error(
      "Multiple administrator accounts exist. Re-run the command with --current-email or --id."
    );
  }

  const query = { role: "admin" };

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(String(id).trim())) {
      throw new Error("The provided admin user ID is invalid.");
    }

    query._id = String(id).trim();
  }

  if (currentEmail) {
    const normalizedCurrentEmail = normalizeEmail(currentEmail);

    if (!isValidEmail(normalizedCurrentEmail)) {
      throw new Error("The provided current admin email is invalid.");
    }

    query.email = normalizedCurrentEmail;
  }

  const matchingAdmins = await User.find(query)
    .select(
      "+emailVerificationTokenHash +emailVerificationExpires +emailVerificationSentAt"
    )
    .limit(2);

  if (matchingAdmins.length === 0) {
    throw new Error("No administrator matched the supplied identifier.");
  }

  if (matchingAdmins.length > 1) {
    throw new Error(
      "The supplied identifier is still ambiguous. Please provide the admin user ID."
    );
  }

  return matchingAdmins[0];
};

const recoverAdminEmail = async ({ newEmail, currentEmail, id }) => {
  const normalizedNewEmail = normalizeEmail(newEmail);

  if (!normalizedNewEmail) {
    printUsage();
    throw new Error("A new administrator email address is required.");
  }

  if (!isValidEmail(normalizedNewEmail)) {
    throw new Error("The new administrator email address is invalid.");
  }

  const adminUser = await resolveAdminUser({ currentEmail, id });

  const duplicateUser = await User.findOne({
    email: normalizedNewEmail,
    _id: { $ne: adminUser._id },
  }).select("_id");

  if (duplicateUser) {
    throw new Error("That email address is already in use by another account.");
  }

  adminUser.email = normalizedNewEmail;
  adminUser.emailVerified = true;
  adminUser.emailVerifiedAt = new Date();
  adminUser.emailVerificationTokenHash = undefined;
  adminUser.emailVerificationExpires = undefined;
  adminUser.emailVerificationSentAt = undefined;

  await adminUser.save();
};

const main = async () => {
  const args = parseArguments(process.argv.slice(2));

  try {
    const normalizedNewEmail = normalizeEmail(args.newEmail);

    if (!normalizedNewEmail) {
      printUsage();
      throw new Error("A new administrator email address is required.");
    }

    if (!isValidEmail(normalizedNewEmail)) {
      throw new Error("The new administrator email address is invalid.");
    }

    await connectToDatabase();
    await recoverAdminEmail(args);
    console.log("Admin email recovery completed successfully.");
  } catch (error) {
    console.error(error.message || "Admin email recovery failed.");
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  parseArguments,
  recoverAdminEmail,
};
