import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are missing.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    // Get the Firebase ID token sent by the signed-in CampusConnect user.
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return response.status(401).json({
        error: "Authentication required.",
      });
    }

    const idToken = authorization.substring("Bearer ".length).trim();

    if (!idToken) {
      return response.status(401).json({
        error: "Authentication token is missing.",
      });
    }

    // Verify the Firebase ID token.
    const firebaseApp = getFirebaseAdminApp();
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return response.status(401).json({
        error: "Invalid Firebase user.",
      });
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;

    if (!privateKey || !publicKey) {
      console.error("ImageKit environment variables are missing.");

      return response.status(500).json({
        error: "ImageKit configuration is missing on the server.",
      });
    }

    // ImageKit requires the expiry to be less than one hour
    // in the future.
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;

    // Unique token for this upload authentication request.
    const token = crypto.randomUUID();

    // ImageKit authentication signature:
    // HMAC-SHA1(token + expire) using the private API key.
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
    console.error("ImageKit authentication error:", error);

    return response.status(401).json({
      error: "Unable to authenticate ImageKit upload.",
    });
  }
}