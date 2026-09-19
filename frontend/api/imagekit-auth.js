import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;

  if (!privateKey || !publicKey) {
    return res.status(500).json({
      error: "ImageKit environment variables are not configured.",
    });
  }

  const token = crypto.randomUUID();

  // 30 minutes from now
  // ImageKit requires the expiry to be less than 1 hour in the future.
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;

  const signature = crypto
    .createHash("sha1")
    .update(token + expire + privateKey)
    .digest("hex");

  return res.status(200).json({
    token,
    expire,
    signature,
    publicKey,
  });
}