import { NextResponse } from "next/server";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = sqlite
      .prepare(
        `SELECT id, name, slug, delivery_fee_pkr as deliveryFeePkr,
                estimated_delivery_mins as estimatedDeliveryMins,
                is_active as isActive, display_order as displayOrder
         FROM delivery_areas
         WHERE is_active = 1
         ORDER BY display_order ASC, name ASC`
      )
      .all();

    return NextResponse.json({
      success: true,
      data: areas,
    });
  } catch (err: any) {
    console.error("Delivery areas API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
