import { NextResponse } from "next/server";
import { sqlite, runInTransaction } from "@/db";
import { createOrderInputSchema } from "@/lib/validation";
import { generateOrderNumber, generateTrackingToken } from "@/lib/auth";
import { checkRestaurantOpen } from "@/lib/time";
import { ORDER_STATUSES, ORDER_TYPES } from "@/lib/constants";
import { calculateCustomDealDiscount } from "@/lib/customDeal";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = createOrderInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid order input",
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Check store open status from DB
    const overrideRow = sqlite
      .prepare("SELECT value FROM restaurant_settings WHERE key = 'manual_override_status'")
      .get() as { value: string } | undefined;
    const bannerRow = sqlite
      .prepare("SELECT value FROM restaurant_settings WHERE key = 'announcement_banner'")
      .get() as { value: string } | undefined;

    const storeStatus = checkRestaurantOpen(
      (overrideRow?.value as any) || "AUTO",
      bannerRow?.value
    );

    if (!storeStatus.isOpen) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STORE_CLOSED",
            message: storeStatus.reason || "Restaurant is currently closed.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Server-side price calculation & snapshot assembly
    let subtotalPkr = 0;
    let customDealSubtotalPkr = 0;
    const computedItems: any[] = [];

    for (const itemInput of data.items) {
      // Find product
      const product = sqlite
        .prepare("SELECT id, name, base_price_pkr, is_available FROM products WHERE id = ?")
        .get(itemInput.productId) as
        | { id: string; name: string; base_price_pkr: number; is_available: number }
        | undefined;

      if (!product || product.is_available === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ITEM_UNAVAILABLE",
              message: `The item '${product?.name || itemInput.productId}' is currently unavailable.`,
            },
          },
          { status: 400 }
        );
      }

      let unitPrice = product.base_price_pkr;
      let variantNameSnapshot: string | null = null;

      if (itemInput.variantId) {
        const variant = sqlite
          .prepare(
            "SELECT id, name, price_pkr, is_available FROM product_variants WHERE id = ? AND product_id = ?"
          )
          .get(itemInput.variantId, product.id) as
          | { id: string; name: string; price_pkr: number; is_available: number }
          | undefined;

        if (!variant || variant.is_available === 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "VARIANT_UNAVAILABLE",
                message: `Variant '${variant?.name || itemInput.variantId}' is unavailable.`,
              },
            },
            { status: 400 }
          );
        }

        unitPrice = variant.price_pkr;
        variantNameSnapshot = variant.name;
      }

      // Modifiers
      const computedModifiers: any[] = [];
      let modifiersTotal = 0;

      for (const modId of itemInput.modifierIds) {
        const mod = sqlite
          .prepare(
            "SELECT id, name, price_pkr, is_available FROM product_modifiers WHERE id = ?"
          )
          .get(modId) as
          | { id: string; name: string; price_pkr: number; is_available: number }
          | undefined;

        if (mod && mod.is_available === 1) {
          modifiersTotal += mod.price_pkr;
          computedModifiers.push({
            id: `ord_mod_${crypto.randomBytes(8).toString("hex")}`,
            modifierId: mod.id,
            nameSnapshot: mod.name,
            priceSnapshotPkr: mod.price_pkr,
          });
        }
      }

      const itemUnitPrice = unitPrice + modifiersTotal;
      const lineTotal = itemUnitPrice * itemInput.quantity;
      subtotalPkr += lineTotal;

      if (itemInput.customDealId) {
        customDealSubtotalPkr += lineTotal;
      }

      computedItems.push({
        id: `ord_item_${crypto.randomBytes(8).toString("hex")}`,
        productId: product.id,
        productNameSnapshot: product.name,
        variantNameSnapshot,
        unitPriceSnapshotPkr: itemUnitPrice,
        quantity: itemInput.quantity,
        lineTotalPkr: lineTotal,
        modifiers: computedModifiers,
        customDealId: itemInput.customDealId || null,
      });
    }

    // 2. Custom Deal Discount calculation (validated strictly server-side from DB prices)
    const { discountRate, discountPkr } = calculateCustomDealDiscount(customDealSubtotalPkr);
    const discountType = discountPkr > 0 ? "CUSTOM_DEAL" : null;

    // 3. Delivery Fee calculation (never discounted)
    let deliveryFeePkr = 0;
    let deliveryAreaNameSnapshot: string | null = null;

    if (data.orderType === ORDER_TYPES.DELIVERY && data.deliveryAreaId) {
      const area = sqlite
        .prepare(
          "SELECT name, delivery_fee_pkr, is_active FROM delivery_areas WHERE id = ?"
        )
        .get(data.deliveryAreaId) as
        | { name: string; delivery_fee_pkr: number; is_active: number }
        | undefined;

      if (!area || area.is_active === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "AREA_UNAVAILABLE",
              message: "Selected delivery area is currently inactive or invalid.",
            },
          },
          { status: 400 }
        );
      }

      deliveryFeePkr = area.delivery_fee_pkr;
      deliveryAreaNameSnapshot = area.name;
    }

    const totalPkr = Math.max(0, subtotalPkr - discountPkr + deliveryFeePkr);
    const orderId = `ord_${crypto.randomBytes(12).toString("hex")}`;
    const orderNumber = generateOrderNumber();
    const trackingToken = generateTrackingToken();
    const now = new Date().toISOString();

    // 4. Atomic Database Insertion
    runInTransaction(() => {
      // Insert order with discount snapshots
      sqlite
        .prepare(
          `INSERT INTO orders (
            id, order_number, tracking_token, user_id, order_type, status,
            payment_method, payment_status, payment_location,
            customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
            delivery_area_name_snapshot, delivery_address_snapshot, delivery_landmark_snapshot,
            dine_in_preferred_time, special_instructions,
            subtotal_pkr, delivery_fee_pkr, discount_pkr, discount_rate, discount_type, custom_deal_subtotal_pkr, total_pkr,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderId,
          orderNumber,
          trackingToken,
          null, // Guest or authenticated user
          data.orderType,
          ORDER_STATUSES.NEW,
          "CASH",
          "PENDING",
          data.paymentLocation || (data.orderType === "DELIVERY" ? "ON_DELIVERY" : "AT_COUNTER"),
          data.customerName,
          data.customerPhone,
          data.customerEmail || null,
          deliveryAreaNameSnapshot,
          data.deliveryAddress || null,
          data.deliveryLandmark || null,
          data.dineInPreferredTime || null,
          data.specialInstructions || null,
          subtotalPkr,
          deliveryFeePkr,
          discountPkr,
          discountRate,
          discountType,
          customDealSubtotalPkr,
          totalPkr,
          now,
          now
        );

      // Insert order items
      const insertItem = sqlite.prepare(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name_snapshot, variant_name_snapshot,
          unit_price_snapshot_pkr, quantity, line_total_pkr, custom_deal_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const insertMod = sqlite.prepare(
        `INSERT INTO order_item_modifiers (
          id, order_item_id, modifier_id, modifier_name_snapshot, price_snapshot_pkr
        ) VALUES (?, ?, ?, ?, ?)`
      );

      for (const itm of computedItems) {
        insertItem.run(
          itm.id,
          orderId,
          itm.productId,
          itm.productNameSnapshot,
          itm.variantNameSnapshot,
          itm.unitPriceSnapshotPkr,
          itm.quantity,
          itm.lineTotalPkr,
          itm.customDealId
        );

        for (const mod of itm.modifiers) {
          insertMod.run(mod.id, itm.id, mod.modifierId, mod.nameSnapshot, mod.priceSnapshotPkr);
        }
      }

      // Insert initial history
      sqlite
        .prepare(
          `INSERT INTO order_status_history (
            id, order_id, from_status, to_status, changed_by_user_id, note, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `hist_${crypto.randomBytes(8).toString("hex")}`,
          orderId,
          null,
          ORDER_STATUSES.NEW,
          null,
          "Order submitted online by customer",
          now
        );
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber,
        trackingToken,
        status: ORDER_STATUSES.NEW,
        orderType: data.orderType,
        totalPkr,
        subtotalPkr,
        deliveryFeePkr,
        discountPkr,
        discountRate,
        discountType,
        customDealSubtotalPkr,
        phoneConfirmationRequired: true,
      },
    });
  } catch (err: any) {
    console.error("Order creation API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
