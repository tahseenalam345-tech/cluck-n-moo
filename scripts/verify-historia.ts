/**
 * Verification test for Historia (Personal Order & Visit History Engine)
 */

import {
  recordProductVisit,
  recordOrderedItems,
  getHistoriaProducts,
  clearUserHistory,
  getUserHistoryStore,
} from "../src/lib/userHistory";
import { Product } from "../src/types";

// Mock products
const mockProducts: Product[] = [
  {
    id: "prod_smash_1",
    name: "Classic Cheeseburger",
    slug: "classic-cheeseburger",
    categoryId: "cat_burgers",
    basePricePkr: 650,
    isAvailable: 1,
    imageUrl: "/images/cheeseburger.webp",
  },
  {
    id: "prod_smash_2",
    name: "Oklahoma Smash",
    slug: "oklahoma-smash",
    categoryId: "cat_burgers",
    basePricePkr: 850,
    isAvailable: 1,
    imageUrl: "/images/oklahoma.webp",
  },
  {
    id: "prod_fries_1",
    name: "Loaded Fries",
    slug: "loaded-fries",
    categoryId: "cat_fries",
    basePricePkr: 550,
    isAvailable: 1,
    imageUrl: "/images/fries.webp",
  },
  {
    id: "prod_wings_1",
    name: "Oven Baked Wings",
    slug: "oven-baked-wings",
    categoryId: "cat_chicken",
    basePricePkr: 790,
    isAvailable: 1,
    imageUrl: "/images/wings.webp",
  },
];

function runHistoriaTests() {
  console.log("=================================================");
  console.log("  HISTORIA PERSONAL USER HISTORY TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assertTest(condition: boolean, name: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      console.error(`  ✗ FAIL: ${name}`);
    }
  }

  const userA = "03001234567";
  const userB = "03219876543";

  // Clean test stores first
  clearUserHistory(userA);
  clearUserHistory(userB);

  // 1. Fresh user has empty history
  console.log("1. Initial Empty State:");
  const initialA = getHistoriaProducts(mockProducts, userA);
  assertTest(!initialA.hasHistory, "User A initially has no history");
  assertTest(initialA.lastOrderedProducts.length === 0, "User A has 0 last ordered items");
  assertTest(initialA.frequentlyVisitedProducts.length === 0, "User A has 0 visited items");

  // 2. Track Product Visits for User A
  console.log("\n2. Track Product Visits:");
  recordProductVisit("prod_smash_1", userA);
  recordProductVisit("prod_smash_1", userA); // 2 visits
  recordProductVisit("prod_fries_1", userA);  // 1 visit

  const visitedA = getHistoriaProducts(mockProducts, userA);
  assertTest(visitedA.hasHistory, "User A now has history after visiting products");
  assertTest(visitedA.frequentlyVisitedProducts.length === 2, "User A has 2 visited products");
  assertTest(visitedA.frequentlyVisitedProducts[0].product.id === "prod_smash_1", "Most visited product is Classic Cheeseburger");
  assertTest(visitedA.frequentlyVisitedProducts[0].visitCount === 2, "Visit count is 2 for Classic Cheeseburger");

  // 3. User B is isolated and has no history
  console.log("\n3. User Separation / Isolation:");
  const visitedB = getHistoriaProducts(mockProducts, userB);
  assertTest(!visitedB.hasHistory, "User B history is isolated and remains empty");
  assertTest(visitedB.frequentlyVisitedProducts.length === 0, "User B has 0 visited products");

  // 4. Record Ordered Items for User A
  console.log("\n4. Record Ordered Items:");
  recordOrderedItems(
    [
      { productId: "prod_smash_2", productName: "Oklahoma Smash", quantity: 2, variantName: "Double Patty" },
      { productId: "prod_wings_1", productName: "Oven Baked Wings", quantity: 1 },
    ],
    { orderId: "ord_101", orderNumber: "CNM-9901" },
    userA
  );

  const orderedA = getHistoriaProducts(mockProducts, userA);
  assertTest(orderedA.lastOrderedProducts.length === 2, "User A now has 2 last ordered products");
  assertTest(orderedA.lastOrderedProducts[0].product.id === "prod_smash_2", "Most recent order product is Oklahoma Smash");
  assertTest(orderedA.lastOrderedProducts[0].orderNumber === "CNM-9901", "Order number CNM-9901 preserved");

  // 5. User B places a different order
  console.log("\n5. User B Places Separate Order:");
  recordOrderedItems(
    [
      { productId: "prod_fries_1", productName: "Loaded Fries", quantity: 1 },
    ],
    { orderId: "ord_202", orderNumber: "CNM-8802" },
    userB
  );

  const finalB = getHistoriaProducts(mockProducts, userB);
  assertTest(finalB.lastOrderedProducts.length === 1, "User B has exactly 1 ordered product");
  assertTest(finalB.lastOrderedProducts[0].product.id === "prod_fries_1", "User B's order is Loaded Fries (not User A's burgers)");

  // 6. Reset History for User A
  console.log("\n6. Clear User History:");
  clearUserHistory(userA);
  const clearedA = getHistoriaProducts(mockProducts, userA);
  assertTest(!clearedA.hasHistory, "User A history is cleared");
  const checkB = getHistoriaProducts(mockProducts, userB);
  assertTest(checkB.hasHistory && checkB.lastOrderedProducts.length === 1, "Clearing User A leaves User B unaffected");

  console.log("\n=================================================");
  console.log(`  SUMMARY: ${passed} / ${total} assertions passed (${Math.round((passed / total) * 100)}%)`);
  console.log("=================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runHistoriaTests();
