const {
  beforeUserCreated,
  beforeUserSignedIn,
} = require("firebase-functions/v2/identity");

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const ImageKit = require("imagekit");

// ============================================================
// CONFIGURATION
// ============================================================

const ALLOWED_DOMAIN = "@citchennai.net";

// ImageKit private key is stored securely in Firebase Secret Manager.
// NEVER put the actual private key inside this file.
const IMAGEKIT_PRIVATE_KEY = defineSecret("IMAGEKIT_PRIVATE_KEY");

// ============================================================
// CIT EMAIL RESTRICTION
// ============================================================

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

// ============================================================
// CIT EMAIL VERIFICATION ON SIGN-IN
// ============================================================

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

// ============================================================
// IMAGEKIT SECURE UPLOAD AUTHENTICATION
// ============================================================

exports.getImageKitAuth = onCall(
  {
    secrets: [IMAGEKIT_PRIVATE_KEY],
  },
  async (request) => {
    // ----------------------------------------------------------
    // Make sure the user is signed in
    // ----------------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to upload media.",
      );
    }

    // ----------------------------------------------------------
    // Get the private key from Firebase Secret Manager
    // ----------------------------------------------------------

    const privateKey = IMAGEKIT_PRIVATE_KEY.value();

    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY is not configured.");

      throw new HttpsError(
        "failed-precondition",
        "ImageKit is not configured correctly on the server.",
      );
    }

    try {
      // --------------------------------------------------------
      // Create ImageKit server-side client
      // --------------------------------------------------------

      const imagekit = new ImageKit({
        privateKey: privateKey,
      });

      // --------------------------------------------------------
      // Generate temporary upload authentication parameters
      // --------------------------------------------------------

      const authenticationParameters =
        imagekit.getAuthenticationParameters();

      return {
        token: authenticationParameters.token,
        expire: authenticationParameters.expire,
        signature: authenticationParameters.signature,
      };
    } catch (error) {
      console.error("ImageKit authentication error:", error);

      throw new HttpsError(
        "internal",
        "Unable to generate ImageKit upload authentication.",
      );
    }
  },
);