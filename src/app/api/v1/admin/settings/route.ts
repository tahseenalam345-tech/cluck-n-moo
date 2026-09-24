import { NextResponse } from "next/server";
import { sqlite, runInTransaction } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = sqlite.prepare("SELECT key, value FROM restaurant_settings").all() as {
      key: string;
      value: string;
    }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    const schedules = sqlite
      .prepare("SELECT day_of_week as dayOfWeek, open_time as openTime, close_time as closeTime, is_closed as isClosed FROM restaurant_schedules ORDER BY day_of_week ASC")
      .all();

    return NextResponse.json({
      success: true,
      data: {
        settings,
        schedules,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    const upsertStmt = sqlite.prepare(
      `INSERT INTO restaurant_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    runInTransaction(() => {
      for (const [key, value] of Object.entries(body.settings || {})) {
        if (typeof value === "string" || typeof value === "number") {
          upsertStmt.run(key, value.toString(), now);
        }
      }

      if (Array.isArray(body.schedules)) {
        const schedStmt = sqlite.prepare(
          `UPDATE restaurant_schedules
           SET open_time = ?, close_time = ?, is_closed = ?
           WHERE day_of_week = ?`
        );
        for (const s of body.schedules) {
          schedStmt.run(s.openTime, s.closeTime, s.isClosed ? 1 : 0, s.dayOfWeek);
        }
      }
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
