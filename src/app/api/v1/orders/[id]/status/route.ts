import { NextResponse } from "next/server";
import { updateOrderStatusInputSchema } from "@/lib/validation";
import { updateOrderStatusInPostgres } from "@/db/postgres/repositories/orderRepository";
import { enforceRole } from "@/lib/authGuard";
import { OrderStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Enforce verified staff role from Supabase session
    const authResult = await enforceRole(["ADMIN", "KITCHEN_STAFF", "RIDER"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const staffSession = authResult.session;

    const body = await req.json();
    const parseResult = updateOrderStatusInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid status payload",
          },
        },
        { status: 400 }
      );
    }

    const { targetStatus, assignedRiderId, cancellationReason, note } = parseResult.data;

    const result = await updateOrderStatusInPostgres(
      id,
      targetStatus as OrderStatus,
      staffSession,
      { assignedRiderId, cancellationReason, note }
    );

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
    console.error("Update order status API error:", err?.message || "Internal database transaction failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to update order status.",
        },
      },
      { status: 500 }
    );
  }
}
