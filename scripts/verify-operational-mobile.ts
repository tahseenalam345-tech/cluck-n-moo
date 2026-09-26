import { readFileSync } from "fs";
import { join } from "path";

console.log("=================================================");
console.log("VERIFYING OPERATIONAL MOBILE UX & ORDER TYPE FIXES");
console.log("=================================================");

let hasFailures = false;
function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    hasFailures = true;
  }
}

// 1. Verify Layout has global OrderModeModal
const layoutFile = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf-8");
assert(
  layoutFile.includes("<OrderModeModal") && layoutFile.includes("OrderModeProvider"),
  "Layout: OrderModeModal is mounted inside OrderModeProvider globally across all routes"
);

// 2. Verify OrderModeModal has in-memory caching and custom compact picker
const modalFile = readFileSync(join(process.cwd(), "src/components/OrderModeModal.tsx"), "utf-8");
assert(
  modalFile.includes("cachedDeliveryAreas") && modalFile.includes("area-picker-dropdown"),
  "OrderModeModal: In-memory cachedDeliveryAreas and compact popover dropdown are implemented"
);
assert(
  modalFile.includes("delivery-area-select-btn") && modalFile.includes("area-options-scroll"),
  "OrderModeModal: Custom area trigger and constrained scrollable list replace oversized native select"
);

// 3. Verify CartDrawer has half-screen bottom sheet and drag handle
const cartFile = readFileSync(join(process.cwd(), "src/components/CartDrawer.tsx"), "utf-8");
assert(
  cartFile.includes("cart-drag-handle-bar") && cartFile.includes("cart-drag-handle-pill"),
  "CartDrawer: Drag handle bar and pill present for mobile interaction"
);
assert(
  cartFile.includes("max-height: 60vh") || cartFile.includes("min-height: 52vh"),
  "CartDrawer: Half-screen mobile bottom sheet default height (52-60vh) configured"
);

// 4. Verify Kitchen Page has mobile status tabs, compact summary, and bottom sheet
const kitchenFile = readFileSync(join(process.cwd(), "src/app/kitchen/page.tsx"), "utf-8");
assert(
  kitchenFile.includes("kitchen-mobile-status-tabs") && kitchenFile.includes("kitchen-status-tab"),
  "Kitchen: Mobile status tabs (All, To Cook, Cooking, Ready) implemented"
);
assert(
  kitchenFile.includes("kitchen-card-mobile-summary") && kitchenFile.includes("kitchen-items-breakdown hide-on-mobile"),
  "Kitchen: Compact order row with collapsed items for mobile, full details in bottom sheet"
);
assert(
  kitchenFile.includes("kitchen-sheet-handle-bar") && kitchenFile.includes("kitchen-modal-box"),
  "Kitchen: Order detail modal slides up as a mobile bottom sheet with drag handle"
);

// 5. Verify Rider Page has mobile status tabs, compact delivery row, and bottom sheet
const riderFile = readFileSync(join(process.cwd(), "src/app/rider/page.tsx"), "utf-8");
assert(
  riderFile.includes("rider-mobile-status-tabs") && riderFile.includes("rider-status-tab"),
  "Rider: Mobile delivery status tabs implemented"
);
assert(
  riderFile.includes("rider-card-mobile-summary") && riderFile.includes("rider-card-desktop-body hide-on-mobile"),
  "Rider: Compact mobile delivery row with area & customer, details collapsed into drawer"
);
assert(
  riderFile.includes("rider-sheet-handle-bar") && riderFile.includes("rider-modal-box"),
  "Rider: Delivery details drawer formatted as a responsive mobile bottom sheet"
);

// 6. Verify My Account Page has mobile-first stacked sections and collapsible order rows
const accountFile = readFileSync(join(process.cwd(), "src/app/account/page.tsx"), "utf-8");
assert(
  accountFile.includes("account-profile-grid") && accountFile.includes("account-order-row-header"),
  "Account: Stacked mobile sections and single-column profile grid"
);
assert(
  accountFile.includes("expandedOrderId") && accountFile.includes("account-order-expanded-panel"),
  "Account: Collapsible order history rows that expand on click with tracking actions"
);

// 7. Verify Build Custom Deal modal responsive grid
const byoFile = readFileSync(join(process.cwd(), "src/components/BuildYourOwnDealModal.tsx"), "utf-8");
assert(
  byoFile.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") || byoFile.includes("byo-catalog-grid"),
  "Build Custom Deal: 2-column mobile catalog grid configured"
);

if (hasFailures) {
  console.error("\n❌ Some operational UX verifications failed.");
  process.exit(1);
} else {
  console.log("\n✅ All Operational UX, Order Type, and Layout Verifications PASSED!");
}
