import { NextResponse } from "next/server";
import { getOrderForTracking } from "@/db/postgres/repositories/orderRepository";
import { getAuthenticatedUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // Optional caller session (authenticated customer or staff)
    const session = await getAuthenticatedUser();

    const result = await getOrderForTracking(id, token, session);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error("Order tracking API error:", err?.message || "Internal database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to retrieve tracking details.",
        },
      },
      { status: 500 }
    );
  }
}
