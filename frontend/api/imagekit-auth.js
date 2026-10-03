const {
  cert,
  getApps,
  initializeApp,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const ImageKit = require("@imagekit/nodejs");

function cleanEnvValue(value) {
  if (!value) {
    return "";
  }

  let cleaned = String(value).trim();

  if (
    cleaned.startsWith('"') &&
    cleaned.endsWith('"')
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  if (
    cleaned.startsWith("'") &&
    cleaned.endsWith("'")
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

function sendJson(response, statusCode, data) {
  // Vercel / Express-style response
  if (
    typeof response.status === "function" &&
    typeof response.json === "function"
  ) {
    return response.status(statusCode).json(data);
  }

  // Normal Node.js response used by Vite local API adapter
  response.statusCode = statusCode;
  response.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  response.end(JSON.stringify(data));
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = cleanEnvValue(
    process.env.FIREBASE_PROJECT_ID
  );

  const clientEmail = cleanEnvValue(
    process.env.FIREBASE_CLIENT_EMAIL
  );

  const privateKey = cleanEnvValue(
    process.env.FIREBASE_PRIVATE_KEY
  ).replace(/\\n/g, "\n");

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

module.exports = async function handler(
  request,
  response
) {
  response.setHeader(
  "Access-Control-Allow-Origin",
  "https://campus-connect28.web.app"
);
response.setHeader(
  "Access-Control-Allow-Headers",
  "Authorization, Content-Type"
);
response.setHeader(
  "Access-Control-Allow-Methods",
  "GET, OPTIONS"
);

if (request.method === "OPTIONS") {
  response.statusCode = 204;
  return response.end();
}
  if (request.method !== "GET") {
    return sendJson(response, 405, {
      error: "Method not allowed",
    });
  }

  try {
    // ---------------------------------------------------------
    // 1. Verify Firebase user
    // ---------------------------------------------------------

    const authorization =
      request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return sendJson(response, 401, {
        error: "Authentication required.",
      });
    }

    const idToken = authorization
      .substring("Bearer ".length)
      .trim();

    if (!idToken) {
      return sendJson(response, 401, {
        error: "Authentication token is missing.",
      });
    }

    const firebaseApp = getFirebaseAdminApp();

    const decodedToken = await getAuth(
      firebaseApp
    ).verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return sendJson(response, 401, {
        error: "Invalid Firebase user.",
      });
    }

    // ---------------------------------------------------------
    // 2. Read ImageKit credentials
    // ---------------------------------------------------------

    const privateKey = cleanEnvValue(
      process.env.IMAGEKIT_PRIVATE_KEY
    );

    const publicKey = cleanEnvValue(
      process.env.IMAGEKIT_PUBLIC_KEY
    );

    if (!privateKey || !publicKey) {
      console.error(
        "ImageKit environment variables are missing."
      );

      return sendJson(response, 500, {
        error:
          "ImageKit configuration is missing on the server.",
      });
    }

    if (!privateKey.startsWith("private_")) {
      console.error(
        "IMAGEKIT_PRIVATE_KEY does not appear to be a valid ImageKit private key."
      );

      return sendJson(response, 500, {
        error:
          "ImageKit private key configuration is invalid.",
      });
    }

    if (!publicKey.startsWith("public_")) {
      console.error(
        "IMAGEKIT_PUBLIC_KEY does not appear to be a valid ImageKit public key."
      );

      return sendJson(response, 500, {
        error:
          "ImageKit public key configuration is invalid.",
      });
    }

    // ---------------------------------------------------------
    // 3. Generate ImageKit authentication parameters
    //    using the official ImageKit Node.js SDK
    // ---------------------------------------------------------

    const imageKit = new ImageKit({
      privateKey,
    });

    const {
      token,
      expire,
      signature,
    } =
      imageKit.helper.getAuthenticationParameters();

    // ---------------------------------------------------------
    // 4. Return safe values to browser
    // ---------------------------------------------------------

    return sendJson(response, 200, {
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

    return sendJson(response, 500, {
      error:
        "Unable to authenticate ImageKit upload.",
    });
  }
};