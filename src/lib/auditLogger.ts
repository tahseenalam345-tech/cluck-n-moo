import { getPostgresDb } from "@/db/postgres/client";
import { auditLogs } from "@/db/postgres/schema";
import crypto from "crypto";

export interface LogAuditParams {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Persists an immutable administrative audit log record in Supabase PostgreSQL.
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  try {
    const db = getPostgresDb();
    const id = `aud_${crypto.randomBytes(8).toString("hex")}`;
    await db.insert(auditLogs).values({
      id,
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
      createdAt: new Date(),
    });
  } catch (err: any) {
    console.error("Failed to record audit log:", err?.message || err);
  }
}
