import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import status from "http-status";
import AppError from "../errorHelpers/AppError.js";
import { envVars } from "../config/env.js";

/**
 * Short-lived, encrypted hand-off code used between the Google OAuth callback
 * and the frontend. It deliberately contains only a user id — never the
 * access/refresh tokens — so a leaked URL cannot be replayed after it expires.
 */
const HANDOFF_CODE_TTL_MS = 60_000;
const KEY = createHash("sha256")
  .update(envVars.OAUTH_HANDOFF_SECRET || envVars.ACCESS_TOKEN_SECRET)
  .digest();

interface HandoffPayload {
  sub: string;
  exp: number;
  jti: string;
}

// Best-effort single-use enforcement for a single Node process. The short TTL
// keeps the replay window small on multi-instance/serverless deployments.
const usedCodes = new Map<string, number>();

function purgeExpiredCodes() {
  const now = Date.now();
  for (const [jti, expiresAt] of usedCodes) {
    if (expiresAt <= now) usedCodes.delete(jti);
  }
}

const createHandoffCode = (userId: string): string => {
  const payload: HandoffPayload = {
    sub: userId,
    exp: Date.now() + HANDOFF_CODE_TTL_MS,
    jti: randomUUID(),
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
};

const consumeHandoffCode = (code: string): string => {
  let payload: HandoffPayload;

  try {
    const raw = Buffer.from(code, "base64url");
    if (raw.length <= 28) throw new Error("Malformed hand-off code");

    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    payload = JSON.parse(plaintext) as HandoffPayload;
  } catch {
    throw new AppError(
      status.UNAUTHORIZED,
      "Invalid or expired authorization code.",
    );
  }

  if (
    typeof payload?.sub !== "string" ||
    typeof payload?.exp !== "number" ||
    typeof payload?.jti !== "string" ||
    payload.exp <= Date.now()
  ) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Invalid or expired authorization code.",
    );
  }

  purgeExpiredCodes();
  if (usedCodes.has(payload.jti)) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Authorization code has already been used.",
    );
  }
  usedCodes.set(payload.jti, payload.exp);

  return payload.sub;
};

export const oauthCodeUtils = {
  createHandoffCode,
  consumeHandoffCode,
};
