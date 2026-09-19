const {
  beforeUserCreated,
  beforeUserSignedIn,
} = require("firebase-functions/v2/identity");

const {HttpsError} = require("firebase-functions/v2/https");

const ALLOWED_DOMAIN = "@citchennai.net";

exports.beforeUserCreated = beforeUserCreated((event) => {
  const user = event.data;

  const email = (user.email || "").toLowerCase().trim();

  if (!email.endsWith(ALLOWED_DOMAIN)) {
    throw new HttpsError(
        "invalid-argument",
        "Only official CIT student email addresses are allowed.",
    );
  }

  return;
});

exports.beforeUserSignedIn = beforeUserSignedIn((event) => {
  const user = event.data;

  const email = (user.email || "").toLowerCase().trim();

  if (!email.endsWith(ALLOWED_DOMAIN)) {
    throw new HttpsError(
        "permission-denied",
        "Only official CIT student email addresses are allowed.",
    );
  }

  if (!user.emailVerified) {
    throw new HttpsError(
        "permission-denied",
        "Please verify your college email before signing in.",
    );
  }

  return;
});
