const crypto = require("node:crypto");

const {
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const authorization =
      request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return response.status(401).json({
        error: "Authentication required.",
      });
    }

    const idToken = authorization
      .substring("Bearer ".length)
      .trim();

    if (!idToken) {
      return response.status(401).json({
        error: "Authentication token is missing.",
      });
    }

    const firebaseApp = getFirebaseAdminApp();

    const decodedToken = await getAuth(
      firebaseApp
    ).verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return response.status(401).json({
        error: "Invalid Firebase user.",
      });
    }

    const privateKey =
      process.env.IMAGEKIT_PRIVATE_KEY;

    const publicKey =
      process.env.IMAGEKIT_PUBLIC_KEY;

    if (!privateKey || !publicKey) {
      console.error(
        "ImageKit environment variables are missing."
      );

      return response.status(500).json({
        error:
          "ImageKit configuration is missing on the server.",
      });
    }

    const expire =
      Math.floor(Date.now() / 1000) +
      30 * 60;

    const token = crypto.randomUUID();

    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return response.status(200).json({
      token,
      expire,
      signature,
      publicKey,
    });
  } catch (error) {
    console.error(
      "ImageKit authentication error:",
      error
    );

    return response.status(500).json({
      error:
        "Unable to authenticate ImageKit upload.",
    });
  }
};