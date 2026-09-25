import { NextResponse } from "next/server";
import { getActivePromotions } from "@/db/postgres/repositories/promotionRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getActivePromotions();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Storefront Promotions API Error:", err?.message || "Database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to load promotions at this time. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
