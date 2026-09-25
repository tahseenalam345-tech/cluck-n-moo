import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { db } from "../src/db/postgres/client";
import { promotions, promotionRules, promotionRuleOptions, restaurantSettings, orderItems } from "../src/db/postgres/schema";
import { getActivePromotions, validatePromotionSelection } from "../src/db/postgres/repositories/promotionRepository";
import { createOrderInPostgres } from "../src/db/postgres/repositories/orderRepository";
import { eq } from "drizzle-orm";

async function runPromotionTests() {
  console.log("=== STEP 1: Verifying Database Active Status ===");
  const activePromos = await getActivePromotions();
  console.log(`Found ${activePromos.length} active promotions returned by getActivePromotions():`);
  activePromos.forEach((p) => {
    console.log(`  - [${p.slug}] ${p.title} (Price: ${p.fixedPricePkr} PKR, Type: ${p.promotionType})`);
    p.rules?.forEach((r) => {
      console.log(`      * Rule: ${r.ruleLabel} (${r.ruleType}, min=${r.minSelections}, max=${r.maxSelections}) with ${r.options.length} options`);
    });
  });

  const allPromosInDb = await db.select().from(promotions);
  console.log(`Total promotions in DB: ${allPromosInDb.length}`);
  const promo4 = allPromosInDb.find((p) => p.slug === "bogo-pizza-deal");
  if (promo4 && !promo4.isActive) {
    console.log("✓ Promotion 4 ('bogo-pizza-deal') is confirmed INACTIVE (is_active = false) in DB.");
  } else {
    throw new Error("Promotion 4 should be inactive pending confirmation!");
  }

  console.log("\n=== STEP 2: Testing Option Validation Logic ===");
  const p1 = activePromos.find((p) => p.slug === "pizza-treat");
  if (!p1) throw new Error("Pizza Treat not found");

  // Gather valid selections for p1:
  // p1_rule_tray_pizza: choose 1 flavor
  const trayPizzaOption = p1.rules.find((r) => r.id === "p1_rule_tray_pizza")?.options[0];
  // p1_rule_drink: choose 1 drink
  const drinkOption = p1.rules.find((r) => r.id === "p1_rule_drink")?.options[0];
  // Fixed items
  const wingsOption = p1.rules.find((r) => r.id === "p1_rule_baked_wings")?.options[0];
  const friesOption = p1.rules.find((r) => r.id === "p1_rule_fries")?.options[0];

  const validOptionIds = [
    trayPizzaOption!.id,
    drinkOption!.id,
    wingsOption!.id,
    friesOption!.id,
  ];

  console.log("Validating correct selection for Pizza Treat (expecting 2,999 PKR)...");
  const validResult = await validatePromotionSelection(p1.id, validOptionIds, 2999);
  console.log("Result:", {
    isValid: validResult.isValid,
    calculatedPrice: validResult.calculatedPricePkr,
    expectedPrice: 2999,
  });
  if (!validResult.isValid || validResult.calculatedPricePkr !== 2999) {
    throw new Error("Valid selection failed validation or price mismatch!");
  }
  console.log("✓ Valid Pizza Treat selection successfully passed server-side validation.");

  // Test tampered price rejection
  console.log("\nTesting tampered client price rejection (sending 500 PKR instead of 2999)...");
  const tamperedResult = await validatePromotionSelection(p1.id, validOptionIds, 500);
  console.log("Result for tampered price:", { isValid: tamperedResult.isValid, error: tamperedResult.error });
  if (tamperedResult.isValid) {
    throw new Error("Expected validation failure for tampered price!");
  }
  console.log("✓ Server correctly rejected tampered client price.");

  // Test invalid selection (missing drink)
  console.log("\nTesting missing required selection (no drink)...");
  const missingDrinkIds = [trayPizzaOption!.id, wingsOption!.id, friesOption!.id];
  const invalidResult = await validatePromotionSelection(p1.id, missingDrinkIds, 2999);
  console.log("Result for missing drink:", { isValid: invalidResult.isValid, error: invalidResult.error });
  if (invalidResult.isValid) {
    throw new Error("Expected validation failure for missing required drink selection!");
  }
  console.log("✓ Server correctly rejected incomplete promotion options.");

  // Test inactive promotion validation
  console.log("\nTesting validation of inactive promotion 4...");
  const inactiveResult = await validatePromotionSelection(promo4!.id, [], 1499);
  console.log("Result for inactive promo:", { isValid: inactiveResult.isValid, error: inactiveResult.error });
  if (inactiveResult.isValid) {
    throw new Error("Expected validation failure for inactive promotion!");
  }
  console.log("✓ Inactive promotion correctly rejected.");

  console.log("\n=== STEP 3: Testing Tiered Deal (Promotion 2) ===");
  const p2 = activePromos.find((p) => p.slug === "wallet-deal");
  if (!p2) throw new Error("Wallet deal not found");

  const tier1Option = p2.rules.find((r) => r.id === "p2_rule_tier")?.options.find((o) => o.id === "p2_rule_tier_opt_med");
  const tier2Option = p2.rules.find((r) => r.id === "p2_rule_tier")?.options.find((o) => o.id === "p2_rule_tier_opt_large");
  const p2Flavor = p2.rules.find((r) => r.id === "p2_rule_flavor")?.options[0];
  const p2Drink = p2.rules.find((r) => r.id === "p2_rule_drink")?.options[0];

  // Test Tier 1: Medium (1290 PKR)
  const tier1Result = await validatePromotionSelection(p2.id, [tier1Option!.id, p2Flavor!.id, p2Drink!.id], 1290);
  console.log("Tier 1 validation:", { isValid: tier1Result.isValid, price: tier1Result.calculatedPricePkr, expected: 1290 });
  if (!tier1Result.isValid || tier1Result.calculatedPricePkr !== 1290) {
    throw new Error("Tier 1 calculation failed!");
  }

  // Test Tier 2: Large (1850 PKR)
  const tier2Result = await validatePromotionSelection(p2.id, [tier2Option!.id, p2Flavor!.id, p2Drink!.id], 1850);
  console.log("Tier 2 validation:", { isValid: tier2Result.isValid, price: tier2Result.calculatedPricePkr, expected: 1850 });
  if (!tier2Result.isValid || tier2Result.calculatedPricePkr !== 1850) {
    throw new Error("Tier 2 calculation failed!");
  }
  console.log("✓ Tiered promotion correctly calculates both base tier (1290 PKR) and upgraded tier (1850 PKR).");

  console.log("\n=== STEP 4: Testing Order Creation with Promotion Item ===");
  // Temporarily force store open for testing order pipeline
  const currentSettings = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.key, "manual_override_status"));
  const prevOverride = currentSettings[0]?.value || "AUTO";

  await db
    .insert(restaurantSettings)
    .values({ key: "manual_override_status", value: "FORCE_OPEN", updatedAt: new Date() })
    .onConflictDoUpdate({
      target: restaurantSettings.key,
      set: { value: "FORCE_OPEN", updatedAt: new Date() },
    });

  try {
    // Test A: Create order with tampered price -> must be rejected
    console.log("Testing createOrderInPostgres with tampered unitPricePkr (500 PKR)...");
    const tamperedOrderAttempt = await createOrderInPostgres({
      customerName: "Hacker Customer",
      customerPhone: "03001234567",
      orderType: "PICKUP",
      items: [
        {
          productId: "prod_tray_pizza",
          variantId: undefined,
          quantity: 1,
          unitPricePkr: 500, // Malicious price
          promotionId: p1.id,
          promotionSelectedOptionIds: validOptionIds,
        },
      ],
    });

    if (tamperedOrderAttempt.success) {
      throw new Error("Server permitted order with tampered promotion price!");
    }
    console.log("✓ Tampered promotion price was successfully REJECTED by order creation engine:", tamperedOrderAttempt.error);

    // Test B: Create order with legitimate promotion price (2,999 PKR)
    console.log("\nTesting createOrderInPostgres with verified promotion price (2,999 PKR)...");
    const validOrderResult = await createOrderInPostgres({
      customerName: "Legit Customer",
      customerPhone: "03007654321",
      orderType: "PICKUP",
      items: [
        {
          productId: "prod_tray_pizza",
          variantId: undefined,
          quantity: 1,
          unitPricePkr: 2999,
          promotionId: p1.id,
          promotionSelectedOptionIds: validOptionIds,
        },
      ],
    });

    if (!validOrderResult.success) {
      throw new Error(`Valid promotion order failed: ${JSON.stringify(validOrderResult.error)}`);
    }

    const createdOrder = validOrderResult.data;
    const itemsInDb = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, createdOrder.orderId));

    console.log("Order created successfully:", {
      orderNumber: createdOrder.orderNumber,
      subtotal: createdOrder.subtotalPkr,
      deliveryFee: createdOrder.deliveryFeePkr,
      discountAmount: createdOrder.discountPkr,
      total: createdOrder.totalPkr,
      itemsCount: itemsInDb.length,
      itemName: itemsInDb[0].productNameSnapshot,
      variantSnapshot: itemsInDb[0].variantNameSnapshot,
      customDealId: itemsInDb[0].customDealId,
    });

    // Verify server-side price protection and snapshot storage
    if (itemsInDb[0].unitPriceSnapshotPkr !== 2999) {
      throw new Error(`Price snapshot mismatch! Got ${itemsInDb[0].unitPriceSnapshotPkr} instead of 2999`);
    }
    if (createdOrder.subtotalPkr !== 2999) {
      throw new Error(`Subtotal mismatch! Expected 2999, got ${createdOrder.subtotalPkr}`);
    }
    if (createdOrder.discountPkr !== 0) {
      throw new Error(`Promotion received an unexpected discount! discountPkr=${createdOrder.discountPkr}`);
    }
    if (createdOrder.totalPkr !== 2999 + createdOrder.deliveryFeePkr) {
      throw new Error(`Total does not match subtotal + deliveryFee!`);
    }
    if (itemsInDb[0].customDealId !== null) {
      throw new Error(`Promotion item should not have customDealId! Got ${itemsInDb[0].customDealId}`);
    }
    console.log("✓ Legitimate order verified: Subtotal = 2,999 PKR, separate delivery fee, 0 BYOD discount.");
    console.log("✓ Promotion snapshot stored in DB:", itemsInDb[0].productNameSnapshot, "|", itemsInDb[0].variantNameSnapshot);
  } finally {
    // Restore previous override status
    await db
      .insert(restaurantSettings)
      .values({ key: "manual_override_status", value: prevOverride, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: restaurantSettings.key,
        set: { value: prevOverride, updatedAt: new Date() },
      });
    console.log("✓ Restored restaurant settings manual_override_status to:", prevOverride);
  }

  console.log("\nALL PROMOTION TESTS PASSED SUCCESSFULLY! 🎉");
}

runPromotionTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
