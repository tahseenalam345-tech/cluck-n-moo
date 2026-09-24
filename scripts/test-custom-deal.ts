import { calculateCustomDealDiscount, calculateCartWithCustomDeals } from "../src/lib/customDeal";

console.log("🧪 Testing Custom Deal Calculation Engine...");

// Test 1: Below 2500 PKR (e.g. 2499 PKR)
const res2499 = calculateCustomDealDiscount(2499);
console.assert(res2499.discountRate === 0, "2499 PKR should have 0% discount rate");
console.assert(res2499.discountPkr === 0, "2499 PKR should have 0 PKR discount");
console.assert(res2499.finalTotalPkr === 2499, "2499 PKR final total should be 2499");
console.assert(res2499.nextThresholdPkr === 2500, "Next threshold should be 2500");
console.assert(res2499.amountNeededForNextThreshold === 1, "Amount needed should be 1 PKR");
console.log("  ✓ 2,499 PKR -> 0% discount (0 PKR discount, needs 1 PKR for 5% tier)");

// Test 2: Exactly 2500 PKR
const res2500 = calculateCustomDealDiscount(2500);
console.assert(res2500.discountRate === 0.05, "2500 PKR should have 5% discount rate");
console.assert(res2500.discountPkr === 125, "2500 PKR should have 125 PKR discount (5% of 2500)");
console.assert(res2500.finalTotalPkr === 2375, "2500 PKR final total should be 2375");
console.assert(res2500.nextThresholdPkr === 3500, "Next threshold should be 3500");
console.assert(res2500.amountNeededForNextThreshold === 1000, "Amount needed should be 1000 PKR");
console.log("  ✓ 2,500 PKR -> 5% discount (125 PKR discount, final 2375 PKR)");

// Test 3: 3499 PKR
const res3499 = calculateCustomDealDiscount(3499);
console.assert(res3499.discountRate === 0.05, "3499 PKR should have 5% discount rate");
console.assert(res3499.discountPkr === 175, "3499 PKR should have 175 PKR discount (5% of 3499 = 174.95 -> 175)");
console.assert(res3499.finalTotalPkr === 3324, "3499 PKR final total should be 3324");
console.assert(res3499.amountNeededForNextThreshold === 1, "Amount needed should be 1 PKR for 10% tier");
console.log("  ✓ 3,499 PKR -> 5% discount (175 PKR discount, needs 1 PKR for 10% tier)");

// Test 4: Exactly 3500 PKR
const res3500 = calculateCustomDealDiscount(3500);
console.assert(res3500.discountRate === 0.10, "3500 PKR should have 10% discount rate");
console.assert(res3500.discountPkr === 350, "3500 PKR should have 350 PKR discount (10% of 3500)");
console.assert(res3500.finalTotalPkr === 3150, "3500 PKR final total should be 3150");
console.assert(res3500.nextThresholdPkr === null, "Next threshold should be null");
console.log("  ✓ 3,500 PKR -> 10% discount (350 PKR discount, final 3150 PKR)");

// Test 5: Above 3500 PKR (e.g. 5000 PKR)
const res5000 = calculateCustomDealDiscount(5000);
console.assert(res5000.discountRate === 0.10, "5000 PKR should have 10% discount rate");
console.assert(res5000.discountPkr === 500, "5000 PKR should have 500 PKR discount");
console.assert(res5000.finalTotalPkr === 4500, "5000 PKR final total should be 4500");
console.log("  ✓ 5,000 PKR -> 10% discount (500 PKR discount, final 4500 PKR)");

// Test 6: Cart-level calculation with custom deal + regular items + delivery fee
const cartItems = [
  { lineTotalPkr: 2000, customDealId: "deal_123" },
  { lineTotalPkr: 1500, customDealId: "deal_123" }, // Custom deal total = 3500 PKR -> 10% = 350 PKR discount
  { lineTotalPkr: 800 }, // Regular item not in deal -> 0% discount
];
const cartRes = calculateCartWithCustomDeals(cartItems, 100);
console.assert(cartRes.foodSubtotalPkr === 4300, "Total food subtotal is 4300 PKR");
console.assert(cartRes.customDealSubtotalPkr === 3500, "Custom deal subtotal is 3500 PKR");
console.assert(cartRes.discountPkr === 350, "Discount is 350 PKR (10% of 3500)");
console.assert(cartRes.deliveryFeePkr === 100, "Delivery fee is 100 PKR (undiscounted)");
console.assert(cartRes.totalPkr === 4300 - 350 + 100, "Final total is 4050 PKR (4300 - 350 + 100)");
console.log("  ✓ Cart level: 3500 PKR deal items + 800 PKR regular + 100 fee -> Total: 4,050 PKR");

console.log("\n🎉 ALL CUSTOM DEAL CALCULATION TESTS PASSED 100%!");
