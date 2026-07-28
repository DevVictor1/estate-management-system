const User = require("../models/User");
const {
  isValidEmail,
  normalizeEmail,
  isEmailVerified,
} = require("./emailVerification");

const resolveVerifiedUserEmailRecipient = async ({
  overrideRecipient,
  databaseEmail,
  role,
  requireActive = false,
}) => {
  const normalizedOverrideRecipient = String(overrideRecipient || "").trim();

  if (normalizedOverrideRecipient) {
    return isValidEmail(normalizedOverrideRecipient)
      ? [normalizedOverrideRecipient]
      : [];
  }

  const normalizedDatabaseEmail = normalizeEmail(databaseEmail);

  if (!isValidEmail(normalizedDatabaseEmail)) {
    return [];
  }

  const query = {
    email: normalizedDatabaseEmail,
  };

  if (role) {
    query.role = role;
  }

  if (requireActive) {
    query.isActive = true;
  }

  const matchingUser = await User.findOne(query).select("email emailVerified");

  if (!matchingUser || !isEmailVerified(matchingUser)) {
    return [];
  }

  return [normalizedDatabaseEmail];
};

module.exports = {
  resolveVerifiedUserEmailRecipient,
};
