import { NextResponse } from "next/server";
import { getActiveMenu } from "@/db/postgres/repositories/menuRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getActiveMenu();

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      }
    );
  } catch (err: any) {
    // Log non-sensitive diagnostic message server-side only
    console.error("Storefront Menu API Error:", err?.message || "Database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to load menu at this time. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
