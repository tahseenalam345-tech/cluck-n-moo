import { NextResponse } from "next/server";
import { getOpsOrders } from "@/db/postgres/repositories/orderRepository";
import { enforceRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Only authenticated staff (ADMIN, KITCHEN_STAFF, RIDER) can access operations pipelines
    const authResult = await enforceRole(["ADMIN", "KITCHEN_STAFF", "RIDER"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const staffSession = authResult.session;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");

    const orders = await getOpsOrders(staffSession, status, orderType);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (err: any) {
    console.error("Ops orders API error:", err?.message || "Internal database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to retrieve operational orders.",
        },
      },
      { status: 500 }
    );
  }
}
