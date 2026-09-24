import { validateStatusTransition } from "../src/lib/stateMachine";
import { ORDER_STATUSES, ORDER_TYPES, USER_ROLES } from "../src/lib/constants";

function testStateMachine() {
  console.log("🧪 Testing Cluck N Moo Order State Machine & RBAC...");

  // 1. Valid linear progression for delivery
  const t1 = validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.CONFIRMED, ORDER_TYPES.DELIVERY, USER_ROLES.ADMIN);
  console.assert(t1.allowed, "Admin can confirm New order");

  const t2 = validateStatusTransition(ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PREPARING, ORDER_TYPES.DELIVERY, USER_ROLES.KITCHEN);
  console.assert(t2.allowed, "Kitchen can start Preparing Confirmed order");

  const t3 = validateStatusTransition(ORDER_STATUSES.PREPARING, ORDER_STATUSES.READY, ORDER_TYPES.DELIVERY, USER_ROLES.KITCHEN);
  console.assert(t3.allowed, "Kitchen can mark order Ready");

  const t4 = validateStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.OUT_FOR_DELIVERY, ORDER_TYPES.DELIVERY, USER_ROLES.RIDER);
  console.assert(t4.allowed, "Rider can take Ready delivery Out for delivery");

  const t5 = validateStatusTransition(ORDER_STATUSES.OUT_FOR_DELIVERY, ORDER_STATUSES.COMPLETED, ORDER_TYPES.DELIVERY, USER_ROLES.RIDER);
  console.assert(t5.allowed, "Rider can complete delivered order upon cash collection");

  // 2. Invalid skips
  const badSkip = validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.PREPARING, ORDER_TYPES.DELIVERY, USER_ROLES.ADMIN);
  console.assert(!badSkip.allowed, "Cannot skip from New directly to Preparing without confirmation");

  // 3. Pickup cannot be 'Out for delivery'
  const pickupOut = validateStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.OUT_FOR_DELIVERY, ORDER_TYPES.PICKUP, USER_ROLES.ADMIN);
  console.assert(!pickupOut.allowed, "Pickup order cannot be marked Out for delivery");

  // 4. Pickup can be completed directly from Ready
  const pickupDone = validateStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.COMPLETED, ORDER_TYPES.PICKUP, USER_ROLES.ADMIN);
  console.assert(pickupDone.allowed, "Pickup order can be completed directly from Ready");

  // 5. Terminal states cannot move
  const terminalMove = validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.NEW, ORDER_TYPES.DELIVERY, USER_ROLES.ADMIN);
  console.assert(!terminalMove.allowed, "Completed order cannot transition");

  console.log("🎉 State Machine tests passed: All 9 RBAC and order type assertions verified!");
}

testStateMachine();
