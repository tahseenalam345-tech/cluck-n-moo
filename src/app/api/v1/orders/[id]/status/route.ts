import { NextResponse } from "next/server";
import { sqlite, runInTransaction } from "@/db";
import { updateOrderStatusInputSchema } from "@/lib/validation";
import { validateStatusTransition } from "@/lib/stateMachine";
import { OrderStatus, OrderType, UserRole } from "@/lib/constants";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Optional role header for operations / staff PIN authentication
    const role = (req.headers.get("x-user-role") || "ADMIN") as UserRole;
    const userId = req.headers.get("x-user-id") || null;

    // Fetch existing order
    const order = sqlite
      .prepare("SELECT id, order_number, status, order_type FROM orders WHERE id = ?")
      .get(id) as { id: string; order_number: string; status: OrderStatus; order_type: OrderType } | undefined;

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    // Check transition validity
    const check = validateStatusTransition(order.status, targetStatus, order.order_type, role);
    if (!check.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TRANSITION",
            message: check.reason || "Transition not permitted",
          },
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    runInTransaction(() => {
      sqlite
        .prepare(
          `UPDATE orders
           SET status = ?,
               assigned_rider_id = COALESCE(?, assigned_rider_id),
               cancellation_reason = COALESCE(?, cancellation_reason),
               updated_at = ?
           WHERE id = ?`
        )
        .run(targetStatus, assignedRiderId || null, cancellationReason || null, now, order.id);

      sqlite
        .prepare(
          `INSERT INTO order_status_history (
            id, order_id, from_status, to_status, changed_by_user_id, note, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `hist_${crypto.randomBytes(8).toString("hex")}`,
          order.id,
          order.status,
          targetStatus,
          userId,
          note || `Status changed from ${order.status} to ${targetStatus}`,
          now
        );
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        previousStatus: order.status,
        newStatus: targetStatus,
        updatedAt: now,
      },
    });
  } catch (err: any) {
    console.error("Update order status API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
