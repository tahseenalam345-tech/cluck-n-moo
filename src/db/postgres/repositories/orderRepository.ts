import { getPostgresDb } from "../client";
import {
  orders,
  orderItems,
  orderItemModifiers,
  orderStatusHistory,
  products,
  productVariants,
  productModifiers,
  deliveryAreas,
  restaurantSettings,
} from "../schema";
import { eq, and, inArray, desc, or, sql } from "drizzle-orm";
import { CreateOrderInput } from "@/lib/validation";
import { generateOrderNumber, generateTrackingToken } from "@/lib/auth";
import { checkRestaurantOpen } from "@/lib/time";
import { ORDER_STATUSES, ORDER_TYPES, OrderStatus, OrderType, UserRole } from "@/lib/constants";
import { calculateCustomDealDiscount } from "@/lib/customDeal";
import { validateStatusTransition } from "@/lib/stateMachine";
import { AuthenticatedUserSession } from "@/lib/authGuard";
import { validatePromotionSelection } from "./promotionRepository";
import crypto from "crypto";

export interface OrderCreationResult {
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  status: OrderStatus;
  orderType: OrderType;
  totalPkr: number;
  subtotalPkr: number;
  deliveryFeePkr: number;
  discountPkr: number;
  discountRate: number;
  discountType: string | null;
  customDealSubtotalPkr: number;
  phoneConfirmationRequired: boolean;
}

/**
 * Validates and creates an order atomically in Supabase PostgreSQL.
 * All pricing, availability, and discount calculations are strictly performed server-side.
 */
export async function createOrderInPostgres(
  input: CreateOrderInput,
  authenticatedUserId?: string | null
): Promise<{ success: true; data: OrderCreationResult } | { success: false; error: { code: string; message: string } }> {
  const db = getPostgresDb();

  // 1. Check store open status from restaurant_settings
  const settingsRows = await db
    .select({ key: restaurantSettings.key, value: restaurantSettings.value })
    .from(restaurantSettings);

  const settingsMap: Record<string, string> = {};
  for (const r of settingsRows) {
    settingsMap[r.key] = r.value;
  }

  const storeStatus = checkRestaurantOpen(
    (settingsMap["manual_override_status"] as any) || "AUTO",
    settingsMap["announcement_banner"]
  );

  if (!storeStatus.isOpen) {
    return {
      success: false,
      error: {
        code: "STORE_CLOSED",
        message: storeStatus.reason || "Restaurant is currently closed.",
      },
    };
  }

  // 2. Query products, variants, and modifiers from PostgreSQL
  const standardItems = input.items.filter((i) => !i.promotionId);
  const productIds = Array.from(new Set(standardItems.map((i) => i.productId).filter(Boolean)));
  const variantIds = Array.from(
    new Set(standardItems.map((i) => i.variantId).filter((v): v is string => Boolean(v)))
  );
  const modifierIds = Array.from(new Set(standardItems.flatMap((i) => i.modifierIds || [])));

  let productMap = new Map<string, { id: string; name: string; basePricePkr: number; isAvailable: boolean }>();
  if (productIds.length > 0) {
    const dbProducts = await db
      .select({
        id: products.id,
        name: products.name,
        basePricePkr: products.basePricePkr,
        isAvailable: products.isAvailable,
      })
      .from(products)
      .where(inArray(products.id, productIds));
    productMap = new Map(dbProducts.map((p) => [p.id, p]));
  }

  let variantMap = new Map<string, { id: string; name: string; pricePkr: number; isAvailable: boolean; productId: string }>();
  if (variantIds.length > 0) {
    const dbVariants = await db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        pricePkr: productVariants.pricePkr,
        isAvailable: productVariants.isAvailable,
        productId: productVariants.productId,
      })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));
    variantMap = new Map(dbVariants.map((v) => [v.id, v]));
  }

  let modifierMap = new Map<string, { id: string; name: string; pricePkr: number; isAvailable: boolean }>();
  if (modifierIds.length > 0) {
    const dbModifiers = await db
      .select({
        id: productModifiers.id,
        name: productModifiers.name,
        pricePkr: productModifiers.pricePkr,
        isAvailable: productModifiers.isAvailable,
      })
      .from(productModifiers)
      .where(inArray(productModifiers.id, modifierIds));
    modifierMap = new Map(dbModifiers.map((m) => [m.id, m]));
  }

  // 3. Server-side price calculation and snapshot assembly
  let subtotalPkr = 0;
  let customDealSubtotalPkr = 0;
  const computedItems: Array<{
    id: string;
    productId: string | null;
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    unitPriceSnapshotPkr: number;
    quantity: number;
    lineTotalPkr: number;
    customDealId: string | null;
    modifiers: Array<{
      id: string;
      modifierId: string;
      nameSnapshot: string;
      priceSnapshotPkr: number;
    }>;
  }> = [];

  for (const itemInput of input.items) {
    // A. Handle Promotion Deal Item
    if (itemInput.promotionId) {
      const promoValidation = await validatePromotionSelection(
        itemInput.promotionId,
        itemInput.promotionSelectedOptionIds || [],
        itemInput.unitPricePkr || 0
      );

      if (!promoValidation.isValid) {
        return {
          success: false,
          error: {
            code: "PROMOTION_VALIDATION_ERROR",
            message: promoValidation.error || "Invalid promotion selection.",
          },
        };
      }

      const promoUnitPrice = promoValidation.calculatedPricePkr!;
      const lineTotal = promoUnitPrice * itemInput.quantity;
      subtotalPkr += lineTotal;
      // Note: Promotion items never get custom deal discount (customDealId is null)

      computedItems.push({
        id: `ord_item_${crypto.randomBytes(8).toString("hex")}`,
        productId: null,
        productNameSnapshot: `[DEAL] ${promoValidation.promotionTitle!}`,
        variantNameSnapshot: promoValidation.snapshotSummary || null,
        unitPriceSnapshotPkr: promoUnitPrice,
        quantity: itemInput.quantity,
        lineTotalPkr: lineTotal,
        customDealId: null,
        modifiers: [],
      });
      continue;
    }

    // B. Handle Standard Menu Item
    const product = productMap.get(itemInput.productId);
    if (!product || !product.isAvailable) {
      return {
        success: false,
        error: {
          code: "ITEM_UNAVAILABLE",
          message: `The item '${product?.name || itemInput.productId}' is currently unavailable.`,
        },
      };
    }

    let unitPrice = product.basePricePkr;
    let variantNameSnapshot: string | null = null;

    if (itemInput.variantId) {
      const variant = variantMap.get(itemInput.variantId);
      if (!variant || !variant.isAvailable || variant.productId !== product.id) {
        return {
          success: false,
          error: {
            code: "VARIANT_UNAVAILABLE",
            message: `Variant '${variant?.name || itemInput.variantId}' is unavailable.`,
          },
        };
      }
      unitPrice = variant.pricePkr;
      variantNameSnapshot = variant.name;
    }

    const computedModifiers: Array<{
      id: string;
      modifierId: string;
      nameSnapshot: string;
      priceSnapshotPkr: number;
    }> = [];
    let modifiersTotal = 0;

    for (const modId of itemInput.modifierIds || []) {
      const mod = modifierMap.get(modId);
      if (mod && mod.isAvailable) {
        modifiersTotal += mod.pricePkr;
        computedModifiers.push({
          id: `ord_mod_${crypto.randomBytes(8).toString("hex")}`,
          modifierId: mod.id,
          nameSnapshot: mod.name,
          priceSnapshotPkr: mod.pricePkr,
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
      customDealId: itemInput.customDealId || null,
      modifiers: computedModifiers,
    });
  }

  // 4. Custom Deal Discount calculation (strictly server-side)
  const { discountRate, discountPkr } = calculateCustomDealDiscount(customDealSubtotalPkr);
  const discountType = discountPkr > 0 ? "CUSTOM_DEAL" : null;

  // 5. Delivery Fee calculation (never discounted)
  let deliveryFeePkr = 0;
  let deliveryAreaNameSnapshot: string | null = null;

  if (input.orderType === ORDER_TYPES.DELIVERY) {
    if (!input.deliveryAreaId) {
      return {
        success: false,
        error: {
          code: "AREA_REQUIRED",
          message: "A delivery area must be selected for delivery orders.",
        },
      };
    }

    const areaRows = await db
      .select({
        id: deliveryAreas.id,
        name: deliveryAreas.name,
        deliveryFeePkr: deliveryAreas.deliveryFeePkr,
        isActive: deliveryAreas.isActive,
      })
      .from(deliveryAreas)
      .where(eq(deliveryAreas.id, input.deliveryAreaId))
      .limit(1);

    const area = areaRows[0];
    if (!area || !area.isActive) {
      return {
        success: false,
        error: {
          code: "AREA_UNAVAILABLE",
          message: "Selected delivery area is currently inactive or invalid.",
        },
      };
    }

    deliveryFeePkr = area.deliveryFeePkr;
    deliveryAreaNameSnapshot = area.name;
  }

  const totalPkr = Math.max(0, subtotalPkr - discountPkr + deliveryFeePkr);
  const orderId = `ord_${crypto.randomBytes(12).toString("hex")}`;
  const orderNumber = generateOrderNumber();
  const trackingToken = generateTrackingToken();
  const now = new Date();

  // 6. Execute atomic PostgreSQL multi-table transaction
  await db.transaction(async (tx) => {
    // Insert order record
    await tx.insert(orders).values({
      id: orderId,
      orderNumber,
      trackingToken,
      userId: authenticatedUserId || null,
      orderType: input.orderType as any,
      status: ORDER_STATUSES.NEW as any,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      paymentLocation:
        input.paymentLocation || (input.orderType === "DELIVERY" ? "ON_DELIVERY" : "AT_COUNTER"),
      customerNameSnapshot: input.customerName.trim(),
      customerPhoneSnapshot: input.customerPhone.trim(),
      customerEmailSnapshot: input.customerEmail ? input.customerEmail.trim() : null,
      deliveryAreaNameSnapshot,
      deliveryAddressSnapshot: input.deliveryAddress ? input.deliveryAddress.trim() : null,
      deliveryLandmarkSnapshot: input.deliveryLandmark ? input.deliveryLandmark.trim() : null,
      dineInPreferredTime: input.dineInPreferredTime || null,
      specialInstructions: input.specialInstructions ? input.specialInstructions.trim() : null,
      subtotalPkr,
      deliveryFeePkr,
      discountPkr,
      discountRate: discountRate.toFixed(4),
      discountType,
      customDealSubtotalPkr,
      totalPkr,
      createdAt: now,
      updatedAt: now,
    });

    // Insert order items & modifier snapshots
    for (const item of computedItems) {
      await tx.insert(orderItems).values({
        id: item.id,
        orderId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        unitPriceSnapshotPkr: item.unitPriceSnapshotPkr,
        quantity: item.quantity,
        lineTotalPkr: item.lineTotalPkr,
        customDealId: item.customDealId,
      });

      for (const mod of item.modifiers) {
        await tx.insert(orderItemModifiers).values({
          id: mod.id,
          orderItemId: item.id,
          modifierId: mod.modifierId,
          modifierNameSnapshot: mod.nameSnapshot,
          priceSnapshotPkr: mod.priceSnapshotPkr,
        });
      }
    }

    // Insert initial status history audit record
    await tx.insert(orderStatusHistory).values({
      id: `hist_${crypto.randomBytes(8).toString("hex")}`,
      orderId,
      fromStatus: null,
      toStatus: ORDER_STATUSES.NEW as any,
      changedByUserId: authenticatedUserId || null,
      note: "Order submitted online by customer",
      createdAt: now,
    });
  });

  return {
    success: true,
    data: {
      orderId,
      orderNumber,
      trackingToken,
      status: ORDER_STATUSES.NEW,
      orderType: input.orderType as OrderType,
      totalPkr,
      subtotalPkr,
      deliveryFeePkr,
      discountPkr,
      discountRate,
      discountType,
      customDealSubtotalPkr,
      phoneConfirmationRequired: true,
    },
  };
}

/**
 * Retrieves order for tracking with strict privacy and anti-enumeration protection.
 * Requires trackingToken for guests, or verifies user ID / staff role.
 */
export async function getOrderForTracking(
  lookupParam: string,
  providedToken?: string | null,
  caller?: AuthenticatedUserSession | null
): Promise<{ success: boolean; data?: any; error?: { code: string; message: string }; status?: number }> {
  const db = getPostgresDb();

  // Search by ID, Order Number, or Tracking Token
  const orderRows = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.id, lookupParam),
        eq(orders.orderNumber, lookupParam),
        eq(orders.trackingToken, lookupParam)
      )
    )
    .limit(1);

  if (orderRows.length === 0) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Order not found" },
      status: 404,
    };
  }

  const order = orderRows[0];

  // Security validation: prevent unauthorized enumeration
  const isStaff = caller && ["ADMIN", "KITCHEN_STAFF", "RIDER"].includes(caller.role);
  const isOwner = caller && order.userId && caller.userId === order.userId;
  const hasValidToken =
    (providedToken && providedToken === order.trackingToken) ||
    lookupParam === order.trackingToken;

  if (!isStaff && !isOwner && !hasValidToken) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED_ACCESS",
        message: "A valid tracking token or customer session is required to view this order.",
      },
      status: 403,
    };
  }

  // Fetch items
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productNameSnapshot,
      variantName: orderItems.variantNameSnapshot,
      unitPricePkr: orderItems.unitPriceSnapshotPkr,
      quantity: orderItems.quantity,
      lineTotalPkr: orderItems.lineTotalPkr,
      customDealId: orderItems.customDealId,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // Fetch modifiers
  const itemIds = items.map((i) => i.id);
  let modifiers: Array<{ orderItemId: string; modifierName: string; pricePkr: number }> = [];
  if (itemIds.length > 0) {
    modifiers = await db
      .select({
        orderItemId: orderItemModifiers.orderItemId,
        modifierName: orderItemModifiers.modifierNameSnapshot,
        pricePkr: orderItemModifiers.priceSnapshotPkr,
      })
      .from(orderItemModifiers)
      .where(inArray(orderItemModifiers.orderItemId, itemIds));
  }

  const modifierMap = new Map<string, Array<{ name: string; pricePkr: number }>>();
  for (const mod of modifiers) {
    const list = modifierMap.get(mod.orderItemId) || [];
    list.push({ name: mod.modifierName, pricePkr: mod.pricePkr });
    modifierMap.set(mod.orderItemId, list);
  }

  const itemsWithModifiers = items.map((itm) => ({
    ...itm,
    modifiers: modifierMap.get(itm.id) || [],
  }));

  // Fetch status history timeline
  const history = await db
    .select({
      id: orderStatusHistory.id,
      fromStatus: orderStatusHistory.fromStatus,
      toStatus: orderStatusHistory.toStatus,
      note: orderStatusHistory.note,
      createdAt: orderStatusHistory.createdAt,
    })
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(orderStatusHistory.createdAt);

  return {
    success: true,
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      userId: order.userId,
      orderType: order.orderType,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentLocation: order.paymentLocation,
      customerName: order.customerNameSnapshot,
      customerPhone: order.customerPhoneSnapshot,
      deliveryAreaName: order.deliveryAreaNameSnapshot,
      deliveryAddress: order.deliveryAddressSnapshot,
      deliveryLandmark: order.deliveryLandmarkSnapshot,
      dineInPreferredTime: order.dineInPreferredTime,
      specialInstructions: order.specialInstructions,
      subtotalPkr: order.subtotalPkr,
      deliveryFeePkr: order.deliveryFeePkr,
      discountPkr: order.discountPkr,
      discountRate: parseFloat(order.discountRate || "0"),
      discountType: order.discountType,
      customDealSubtotalPkr: order.customDealSubtotalPkr,
      totalPkr: order.totalPkr,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: itemsWithModifiers,
      history,
    },
  };
}

/**
 * Retrieves orders belonging to an authenticated customer.
 */
export async function getCustomerOrders(userId: string) {
  const db = getPostgresDb();

  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  const orderIds = customerOrders.map((o) => o.id);
  if (orderIds.length === 0) {
    return [];
  }

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productName: orderItems.productNameSnapshot,
      variantName: orderItems.variantNameSnapshot,
      unitPricePkr: orderItems.unitPriceSnapshotPkr,
      quantity: orderItems.quantity,
      lineTotalPkr: orderItems.lineTotalPkr,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) || [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return customerOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    trackingToken: o.trackingToken,
    orderType: o.orderType,
    status: o.status,
    totalPkr: o.totalPkr,
    subtotalPkr: o.subtotalPkr,
    deliveryFeePkr: o.deliveryFeePkr,
    discountPkr: o.discountPkr,
    createdAt: o.createdAt.toISOString(),
    items: itemsByOrder.get(o.id) || [],
  }));
}

/**
 * Retrieves orders for staff operations with strict role-level filters.
 */
export async function getOpsOrders(
  staff: AuthenticatedUserSession,
  statusFilter?: string | null,
  orderTypeFilter?: string | null
) {
  const db = getPostgresDb();

  let query = db.select().from(orders);
  const conditions = [];

  // Role permissions
  if (staff.role === "KITCHEN_STAFF") {
    conditions.push(
      inArray(orders.status, [
        ORDER_STATUSES.CONFIRMED as any,
        ORDER_STATUSES.PREPARING as any,
        ORDER_STATUSES.READY as any,
      ])
    );
  } else if (staff.role === "RIDER") {
    conditions.push(eq(orders.orderType, "DELIVERY"));
    conditions.push(
      inArray(orders.status, [
        ORDER_STATUSES.READY as any,
        ORDER_STATUSES.OUT_FOR_DELIVERY as any,
      ])
    );
    // Riders see orders assigned to them, or unassigned ready delivery orders
    conditions.push(
      or(
        eq(orders.assignedRiderId, staff.userId),
        sql`${orders.assignedRiderId} IS NULL`
      )
    );
  } else if (staff.role === "ADMIN") {
    if (statusFilter) {
      if (statusFilter === "active") {
        conditions.push(
          sql`${orders.status} NOT IN (${ORDER_STATUSES.COMPLETED}, ${ORDER_STATUSES.CANCELLED})`
        );
      } else {
        conditions.push(eq(orders.status, statusFilter as any));
      }
    }
  } else {
    // Non-staff roles (such as CUSTOMER) cannot access ops pipeline
    conditions.push(sql`1 = 0`);
  }

  if (orderTypeFilter) {
    conditions.push(eq(orders.orderType, orderTypeFilter as any));
  }

  const opsOrders = await db
    .select()
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));

  const orderIds = opsOrders.map((o) => o.id);
  let itemsMap = new Map<string, any[]>();

  if (orderIds.length > 0) {
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productName: orderItems.productNameSnapshot,
        variantName: orderItems.variantNameSnapshot,
        unitPricePkr: orderItems.unitPriceSnapshotPkr,
        quantity: orderItems.quantity,
        lineTotalPkr: orderItems.lineTotalPkr,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemIds = items.map((i) => i.id);
    const modifiersMap = new Map<string, any[]>();
    if (itemIds.length > 0) {
      const modifiers = await db
        .select({
          id: orderItemModifiers.id,
          orderItemId: orderItemModifiers.orderItemId,
          name: orderItemModifiers.modifierNameSnapshot,
          pricePkr: orderItemModifiers.priceSnapshotPkr,
        })
        .from(orderItemModifiers)
        .where(inArray(orderItemModifiers.orderItemId, itemIds));

      for (const m of modifiers) {
        const list = modifiersMap.get(m.orderItemId) || [];
        list.push(m);
        modifiersMap.set(m.orderItemId, list);
      }
    }

    for (const item of items) {
      const list = itemsMap.get(item.orderId) || [];
      list.push({
        ...item,
        modifiers: modifiersMap.get(item.id) || [],
      });
      itemsMap.set(item.orderId, list);
    }
  }

  return opsOrders.map((o) => {
    // Rider privacy guard: only assigned rider or admin can see full phone and address
    const canSeeSensitiveCustomerInfo =
      staff.role === "ADMIN" || (staff.role === "RIDER" && o.assignedRiderId === staff.userId);

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      trackingToken: o.trackingToken,
      orderType: o.orderType,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      paymentLocation: o.paymentLocation,
      customerName: o.customerNameSnapshot,
      customerPhone: canSeeSensitiveCustomerInfo ? o.customerPhoneSnapshot : "Protected",
      deliveryAreaName: o.deliveryAreaNameSnapshot,
      deliveryAddress: canSeeSensitiveCustomerInfo ? o.deliveryAddressSnapshot : "Protected until assigned",
      deliveryLandmark: canSeeSensitiveCustomerInfo ? o.deliveryLandmarkSnapshot : null,
      dineInPreferredTime: o.dineInPreferredTime,
      specialInstructions: o.specialInstructions,
      subtotalPkr: o.subtotalPkr,
      deliveryFeePkr: o.deliveryFeePkr,
      totalPkr: o.totalPkr,
      assignedRiderId: o.assignedRiderId,
      cancellationReason: o.cancellationReason,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: itemsMap.get(o.id) || [],
    };
  });
}

/**
 * Updates order status with state machine enforcement and audit history tracking.
 */
export async function updateOrderStatusInPostgres(
  orderId: string,
  targetStatus: OrderStatus,
  staff: AuthenticatedUserSession,
  options?: { assignedRiderId?: string | null; cancellationReason?: string | null; note?: string | null }
) {
  const db = getPostgresDb();

  const existingOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      orderType: orders.orderType,
      assignedRiderId: orders.assignedRiderId,
      cancellationReason: orders.cancellationReason,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (existingOrders.length === 0) {
    return { success: false, error: { code: "NOT_FOUND", message: "Order not found" }, status: 404 };
  }

  const order = existingOrders[0];

  // Validate state machine transition against verified staff role
  const check = validateStatusTransition(order.status as OrderStatus, targetStatus, order.orderType as OrderType, staff.role);
  if (!check.allowed) {
    return {
      success: false,
      error: {
        code: "INVALID_TRANSITION",
        message: check.reason || "Transition not permitted for this role and status.",
      },
      status: 400,
    };
  }

  // If rider is picking up order, automatically assign to this rider
  let riderToAssign = options?.assignedRiderId;
  if (staff.role === "RIDER" && targetStatus === ORDER_STATUSES.OUT_FOR_DELIVERY) {
    riderToAssign = staff.userId;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: targetStatus as any,
        assignedRiderId: riderToAssign !== undefined ? riderToAssign : order.assignedRiderId,
        cancellationReason:
          targetStatus === ORDER_STATUSES.CANCELLED
            ? options?.cancellationReason || order.cancellationReason || "Cancelled by staff"
            : (options?.cancellationReason !== undefined ? options.cancellationReason : order.cancellationReason),
        confirmedByStaffId: staff.role === "ADMIN" ? staff.userId : undefined,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await tx.insert(orderStatusHistory).values({
      id: `hist_${crypto.randomBytes(8).toString("hex")}`,
      orderId: order.id,
      fromStatus: order.status,
      toStatus: targetStatus as any,
      changedByUserId: staff.userId,
      note: options?.note || `Status changed from ${order.status} to ${targetStatus} by ${staff.fullName} (${staff.role})`,
      createdAt: now,
    });
  });

  return {
    success: true,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      previousStatus: order.status,
      newStatus: targetStatus,
      updatedAt: now.toISOString(),
    },
  };
}
