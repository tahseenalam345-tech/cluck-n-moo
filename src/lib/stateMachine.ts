import { ORDER_STATUSES, OrderStatus, OrderType, UserRole } from "./constants";

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUSES.NEW]: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.CONFIRMED]: [ORDER_STATUSES.PREPARING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.PREPARING]: [ORDER_STATUSES.READY, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.READY]: [ORDER_STATUSES.OUT_FOR_DELIVERY, ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.OUT_FOR_DELIVERY]: [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.COMPLETED]: [],
  [ORDER_STATUSES.CANCELLED]: [],
};

/**
 * Validates whether an order can transition from currentStatus to targetStatus
 * given the orderType and the user's role.
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  orderType: OrderType,
  role: UserRole
): TransitionCheck {
  // Check if target is a valid progression from current
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition order from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // Delivery-specific rule: Only DELIVERY orders can enter 'Out for delivery'
  if (targetStatus === ORDER_STATUSES.OUT_FOR_DELIVERY && orderType !== "DELIVERY") {
    return {
      allowed: false,
      reason: `Only delivery orders can be marked 'Out for delivery'. This order is ${orderType}.`,
    };
  }

  // Direct completion from Ready: Valid for PICKUP or DINE_IN (not DELIVERY, which must go Out for delivery first)
  if (
    currentStatus === ORDER_STATUSES.READY &&
    targetStatus === ORDER_STATUSES.COMPLETED &&
    orderType === "DELIVERY"
  ) {
    return {
      allowed: false,
      reason: "Delivery orders must be marked 'Out for delivery' before being completed.",
    };
  }

  // Role permissions:
  // ADMIN can perform any valid transition
  if (role === "ADMIN") {
    return { allowed: true };
  }

  // KITCHEN_STAFF can:
  // - Move Confirmed -> Preparing
  // - Move Preparing -> Ready
  if (role === "KITCHEN_STAFF") {
    if (
      (currentStatus === ORDER_STATUSES.CONFIRMED && targetStatus === ORDER_STATUSES.PREPARING) ||
      (currentStatus === ORDER_STATUSES.PREPARING && targetStatus === ORDER_STATUSES.READY)
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Kitchen staff role is not authorized to transition orders to '${targetStatus}'.`,
    };
  }

  // RIDER can:
  // - Move Ready -> Out for delivery
  // - Move Out for delivery -> Completed
  if (role === "RIDER") {
    if (
      (currentStatus === ORDER_STATUSES.READY && targetStatus === ORDER_STATUSES.OUT_FOR_DELIVERY) ||
      (currentStatus === ORDER_STATUSES.OUT_FOR_DELIVERY && targetStatus === ORDER_STATUSES.COMPLETED)
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Rider role is not authorized for transition '${currentStatus}' -> '${targetStatus}'.`,
    };
  }

  // CUSTOMER can only cancel if still 'New'
  if (role === "CUSTOMER") {
    if (currentStatus === ORDER_STATUSES.NEW && targetStatus === ORDER_STATUSES.CANCELLED) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Customers can only cancel orders while still pending confirmation.",
    };
  }

  return { allowed: false, reason: "Unauthorized role for this transition." };
}
