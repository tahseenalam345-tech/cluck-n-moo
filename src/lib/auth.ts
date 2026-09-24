import { SignJWT, jwtVerify } from "jose";
import { UserSession } from "../types";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cluck-n-moo-kharian-production-secret-2026"
);

export async function signSessionToken(session: UserSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      fullName: payload.fullName as string,
      phone: payload.phone as string | undefined,
      email: payload.email as string | undefined,
      role: payload.role as any,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a secure, unguessable tracking token for guest order tracking
 */
export function generateTrackingToken(): string {
  return "trk_" + crypto.randomBytes(16).toString("hex");
}

/**
 * Generates a formatted, human-readable order number
 * Format: CNM-YYMM-XXXX (e.g. CNM-2609-7412)
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CNM-${yy}${mm}-${randomSuffix}`;
}
