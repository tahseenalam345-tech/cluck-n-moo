import { NextResponse } from "next/server";
import {
  getAdminSettingsAndSchedules,
  updateAdminSettingsAndSchedules,
  createSpecialScheduleInPostgres,
  updateSpecialScheduleInPostgres,
  deleteSpecialScheduleInPostgres,
} from "@/db/postgres/repositories/storeAdminRepository";
import { enforceRole } from "@/lib/authGuard";
import { recordAuditLog } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await enforceRole(["ADMIN"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const data = await getAdminSettingsAndSchedules();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Admin settings GET error:", err?.message || "Internal database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to retrieve settings.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await enforceRole(["ADMIN"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const body = await req.json();

    // 1. Special Schedule Actions
    if (body.specialScheduleAction) {
      if (body.specialScheduleAction === "create") {
        const created = await createSpecialScheduleInPostgres(body.specialScheduleData);
        await recordAuditLog({
          userId: authResult.session.userId,
          userEmail: authResult.session.email,
          action: "CREATE_SPECIAL_SCHEDULE",
          entityType: "SCHEDULE",
          entityId: created.id,
          details: created,
        });
        return NextResponse.json({ success: true, message: "Special event schedule created.", data: created });
      }

      if (body.specialScheduleAction === "update") {
        await updateSpecialScheduleInPostgres(body.specialScheduleId, body.specialScheduleData);
        await recordAuditLog({
          userId: authResult.session.userId,
          userEmail: authResult.session.email,
          action: "UPDATE_SPECIAL_SCHEDULE",
          entityType: "SCHEDULE",
          entityId: body.specialScheduleId,
          details: body.specialScheduleData,
        });
        return NextResponse.json({ success: true, message: "Special event schedule updated." });
      }

      if (body.specialScheduleAction === "delete") {
        await deleteSpecialScheduleInPostgres(body.specialScheduleId);
        await recordAuditLog({
          userId: authResult.session.userId,
          userEmail: authResult.session.email,
          action: "DELETE_SPECIAL_SCHEDULE",
          entityType: "SCHEDULE",
          entityId: body.specialScheduleId,
        });
        return NextResponse.json({ success: true, message: "Special event schedule deleted." });
      }
    }

    // 2. Regular settings and weekly schedules
    await updateAdminSettingsAndSchedules(body.settings || {}, body.schedules);

    await recordAuditLog({
      userId: authResult.session.userId,
      userEmail: authResult.session.email,
      action: "UPDATE_STORE_SETTINGS",
      entityType: "SETTINGS",
      details: { settings: body.settings, scheduleCount: body.schedules?.length },
    });

    return NextResponse.json({
      success: true,
      message: "Settings and schedules updated successfully.",
    });
  } catch (err: any) {
    console.error("Admin settings POST error:", err?.message || "Internal database transaction failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to update settings.",
        },
      },
      { status: 500 }
    );
  }
}
