require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const maskEmail = (value = "") => {
  const email = String(value || "").trim().toLowerCase();

  if (!email.includes("@")) {
    return "(missing)";
  }

  const [localPart, domain] = email.split("@");
  const visibleLocal = localPart.slice(0, 2);
  const maskedLocal =
    localPart.length > 2 ? `${visibleLocal}***` : `${localPart[0] || "*"}***`;
  const [domainName, ...domainParts] = domain.split(".");
  const visibleDomain = domainName ? `${domainName.slice(0, 2)}***` : "***";

  return `${maskedLocal}@${visibleDomain}${
    domainParts.length ? `.${domainParts.join(".")}` : ""
  }`;
};

const connectToDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
};

const inspectAdmins = async () => {
  const admins = await User.find({ role: "admin" }).select(
    "email role emailVerified isActive password"
  );

  console.log(`Administrator accounts found: ${admins.length}`);

  admins.forEach((admin, index) => {
    const emailState =
      admin.emailVerified === undefined ? "missing" : String(admin.emailVerified);

    console.log(`Admin ${index + 1}:`);
    console.log(`  email: ${maskEmail(admin.email)}`);
    console.log(`  role: ${admin.role}`);
    console.log(`  emailVerified: ${emailState}`);
    console.log(`  isActive: ${String(admin.isActive)}`);
    console.log(`  password hash exists: ${admin.password ? "yes" : "no"}`);
  });
};

const main = async () => {
  try {
    await connectToDatabase();
    await inspectAdmins();
  } catch (error) {
    console.error(error.message || "Admin inspection failed.");
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  main();
}
