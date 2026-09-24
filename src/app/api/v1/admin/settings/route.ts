import { NextResponse } from "next/server";
import {
  getAdminSettingsAndSchedules,
  updateAdminSettingsAndSchedules,
} from "@/db/postgres/repositories/storeAdminRepository";
import { enforceRole } from "@/lib/authGuard";

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
    await updateAdminSettingsAndSchedules(body.settings || {}, body.schedules);

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
