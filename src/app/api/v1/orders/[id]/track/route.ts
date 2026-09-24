import { NextResponse } from "next/server";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // The lookup param can be orderId, orderNumber, or trackingToken
    const order = sqlite
      .prepare(
        `SELECT
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
          discount_pkr as discountPkr,
          discount_rate as discountRate,
          discount_type as discountType,
          custom_deal_subtotal_pkr as customDealSubtotalPkr,
          total_pkr as totalPkr,
          cancellation_reason as cancellationReason,
          created_at as createdAt,
          updated_at as updatedAt
         FROM orders
         WHERE id = ? OR order_number = ? OR tracking_token = ?`
      )
      .get(id, id, id) as any;

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    // Fetch items
    const items = sqlite
      .prepare(
        `SELECT id, product_id as productId,
                product_name_snapshot as productName,
                variant_name_snapshot as variantName,
                unit_price_snapshot_pkr as unitPricePkr,
                quantity, line_total_pkr as lineTotalPkr,
                custom_deal_id as customDealId
         FROM order_items
         WHERE order_id = ?`
      )
      .all(order.id) as any[];

    // Fetch item modifiers
    const itemIds = items.map((i) => i.id);
    let modifiers: any[] = [];
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => "?").join(",");
      modifiers = sqlite
        .prepare(
          `SELECT order_item_id as orderItemId,
                  modifier_name_snapshot as modifierName,
                  price_snapshot_pkr as pricePkr
           FROM order_item_modifiers
           WHERE order_item_id IN (${placeholders})`
        )
        .all(...itemIds) as any[];
    }

    for (const itm of items) {
      itm.modifiers = modifiers.filter((m) => m.orderItemId === itm.id);
    }

    // Fetch status history timeline
    const history = sqlite
      .prepare(
        `SELECT id, from_status as fromStatus, to_status as toStatus, note, created_at as createdAt
         FROM order_status_history
         WHERE order_id = ?
         ORDER BY created_at ASC`
      )
      .all(order.id);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items,
        history,
      },
    });
  } catch (err: any) {
    console.error("Order tracking API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
