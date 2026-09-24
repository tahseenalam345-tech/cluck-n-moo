import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authGuard";
import { getCustomerOrders } from "@/db/postgres/repositories/orderRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const orders = await getCustomerOrders(session.userId);
    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    console.error("Account orders GET error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to retrieve orders." } },
      { status: 500 }
    );
  }
}
