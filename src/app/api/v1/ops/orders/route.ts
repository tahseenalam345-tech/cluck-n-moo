import { NextResponse } from "next/server";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");

    let query = `
      SELECT
        id, order_number as orderNumber, tracking_token as trackingToken,
        order_type as orderType, status, payment_method as paymentMethod,
        payment_status as paymentStatus, payment_location as paymentLocation,
        customer_name_snapshot as customerName,
        customer_phone_snapshot as customerPhone,
        delivery_area_name_snapshot as deliveryAreaName,
        delivery_address_snapshot as deliveryAddress,
        delivery_landmark_snapshot as deliveryLandmark,
        dine_in_preferred_time as dineInPreferredTime,
        special_instructions as specialInstructions,
        subtotal_pkr as subtotalPkr,
        delivery_fee_pkr as deliveryFeePkr,
        total_pkr as totalPkr,
        assigned_rider_id as assignedRiderId,
        cancellation_reason as cancellationReason,
        created_at as createdAt,
        updated_at as updatedAt
      FROM orders
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      if (status === "active") {
        conditions.push("status NOT IN ('Completed', 'Cancelled')");
      } else {
        conditions.push("status = ?");
        params.push(status);
      }
    }

    if (orderType) {
      conditions.push("order_type = ?");
      params.push(orderType);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const orders = sqlite.prepare(query).all(...params) as any[];

    // Attach items to each order
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => "?").join(",");
      const allItems = sqlite
        .prepare(
          `SELECT order_id as orderId, product_name_snapshot as productName,
                  variant_name_snapshot as variantName, unit_price_snapshot_pkr as unitPricePkr,
                  quantity, line_total_pkr as lineTotalPkr
           FROM order_items
           WHERE order_id IN (${placeholders})`
        )
        .all(...orderIds) as any[];

      const itemsMap: Record<string, any[]> = {};
      for (const item of allItems) {
        if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
        itemsMap[item.orderId].push(item);
      }

      for (const ord of orders) {
        ord.items = itemsMap[ord.id] || [];
      }
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    console.error("Ops orders API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
