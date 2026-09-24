import { NextResponse } from "next/server";
import { getActiveDeliveryAreas } from "@/db/postgres/repositories/deliveryAreaRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = await getActiveDeliveryAreas();

    return NextResponse.json({
      success: true,
      data: areas,
    });
  } catch (err: any) {
    console.error("Delivery areas API error:", err?.message || "Database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to retrieve delivery areas.",
        },
      },
      { status: 500 }
    );
  }
}
