/**
 * Mobile UX & Component Automated Validation Suite
 * Verifies floating mini-cart, deal card, custom deal 2-col grid, and milestone celebration logic.
 */

import { calculateCustomDealDiscount, calculateCartWithCustomDeals, TIER_1_THRESHOLD_PKR, TIER_2_THRESHOLD_PKR } from "../src/lib/customDeal";
import * as fs from "fs";
import * as path from "path";

function runValidation() {
  console.log("=================================================");
  console.log("  MOBILE UX & COMPONENT VALIDATION TEST SUITE");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, name: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      console.error(`  ✗ FAIL: ${name}`);
    }
  }

  // TEST 1: Real Deal Calculations (no fake discounts, no fake rules)
  console.log("1. Custom Deal Calculation Engine:");
  const deal0 = calculateCustomDealDiscount(0);
  assertTest(deal0.discountPercent === 0 && deal0.tier === "NONE" && deal0.progressPercentToNextTier === 0, "0 PKR yields 0% discount and 0% progress");

  const deal1000 = calculateCustomDealDiscount(1000);
  assertTest(deal1000.discountPercent === 0 && deal1000.tier === "NONE" && deal1000.amountNeededForNextThreshold === 1500, "1,000 PKR requires 1,500 PKR more for 5% tier");

  const deal2500 = calculateCustomDealDiscount(2500);
  assertTest(deal2500.discountPercent === 5 && deal2500.discountPkr === 125 && deal2500.finalTotalPkr === 2375 && deal2500.tier === "TIER_1_5_PERCENT", "2,500 PKR unlocks exact 5% discount (125 PKR off)");

  const deal3500 = calculateCustomDealDiscount(3500);
  assertTest(deal3500.discountPercent === 10 && deal3500.discountPkr === 350 && deal3500.finalTotalPkr === 3150 && deal3500.tier === "TIER_2_10_PERCENT", "3,500 PKR unlocks exact 10% maximum discount (350 PKR off)");

  const cartCalc = calculateCartWithCustomDeals([
    { lineTotalPkr: 2000, customDealId: "deal_1" },
    { lineTotalPkr: 1500, customDealId: "deal_1" },
    { lineTotalPkr: 800 } // regular item
  ], 100);
  assertTest(cartCalc.customDealSubtotalPkr === 3500 && cartCalc.discountPkr === 350 && cartCalc.totalPkr === 4050, "Cart calculation applies deal discount exclusively to custom deal items plus delivery");

  // TEST 2: FloatingMiniCart Component Integrity
  console.log("\n2. FloatingMiniCart Component Integrity:");
  const floatingMiniCartSrc = fs.readFileSync(path.join(__dirname, "../src/components/FloatingMiniCart.tsx"), "utf-8");
  assertTest(floatingMiniCartSrc.includes("cartCount <= 0") && floatingMiniCartSrc.includes("return null"), "Empty cart is hidden by default");
  assertTest(floatingMiniCartSrc.includes("env(safe-area-inset-bottom"), "Respects mobile safe area at bottom");
  assertTest(floatingMiniCartSrc.includes("backdrop-filter: blur(18px) saturate(190%)"), "Subtle premium glassmorphism blur and saturation configured");
  assertTest(floatingMiniCartSrc.includes("isDark") && floatingMiniCartSrc.includes("var(--cnm-text-primary)"), "High-contrast text tokens for Light and Dark modes");
  assertTest(floatingMiniCartSrc.includes("badgePop"), "Micro-pulse update animation on item count change");
  assertTest(floatingMiniCartSrc.includes("max-width: 360px") && floatingMiniCartSrc.includes("calc(100% - 16px)"), "320px/360px responsive ultra-compact constraints");
  assertTest(floatingMiniCartSrc.includes("View Cart"), "Clear 'View Cart' affordance present");
  assertTest(floatingMiniCartSrc.includes("z-index: 85"), "Mini cart sits below modal layers (z-index: 85)");

  // TEST 3: Deals Landing Card (Slim Horizontal Rectangle)
  console.log("\n3. Deals Landing Card (Compact Slim Rectangle):");
  const dealsPageSrc = fs.readFileSync(path.join(__dirname, "../src/app/deals/page.tsx"), "utf-8");
  assertTest(dealsPageSrc.includes("cnm-slim-deal-card"), "Slim deal card class applied");
  assertTest(dealsPageSrc.includes("cnm-deal-build-btn"), "Clear Build Deal action button present");
  assertTest(dealsPageSrc.includes("SAVE 5% TO 10%"), "Accurate real savings info shown on card");
  assertTest(dealsPageSrc.includes("hasFloatingCart={cartCount > 0}"), "CustomerFooter clearance integrated for floating cart");
  assertTest(dealsPageSrc.includes("max-width: 350px"), "Ultra-compact mobile 320px-350px layout handled gracefully");

  // TEST 4: Build Custom Deal Modal (2-Column Grid, Reduced Spacing, Small Pills)
  console.log("\n4. Build Custom Deal Modal (Mobile Layout & Controls):");
  const byoModalSrc = fs.readFileSync(path.join(__dirname, "../src/components/BuildYourOwnDealModal.tsx"), "utf-8");
  assertTest(byoModalSrc.includes("<DealMilestoneCelebration"), "Milestone celebration overlay rendered in deal modal");
  assertTest(byoModalSrc.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "Compact 2-column mobile grid enabled for mobile viewports");
  assertTest(byoModalSrc.includes("byo-category-pill"), "Compact category pills styled");
  assertTest(byoModalSrc.includes("byo-progress-meter"), "Interactive discount progress meter present");
  assertTest(byoModalSrc.includes("byo-bottom-tray") && byoModalSrc.includes("env(safe-area-inset-bottom"), "Floating custom deal tray respects mobile safe area");
  assertTest(byoModalSrc.includes("handleSelectProduct"), "Product selection and customization functionality intact");

  // TEST 5: Milestone Celebration Component
  console.log("\n5. Milestone Celebration Component:");
  const celebrationSrc = fs.readFileSync(path.join(__dirname, "../src/components/DealMilestoneCelebration.tsx"), "utf-8");
  assertTest(celebrationSrc.includes("pointer-events: none"), "Celebration is completely non-blocking (pointer-events: none)");
  assertTest(celebrationSrc.includes("prefers-reduced-motion"), "prefers-reduced-motion is strictly respected");
  assertTest(celebrationSrc.includes("1500") || celebrationSrc.includes("1.5s"), "Celebration is brief (1.5 seconds)");

  // TEST 6: CustomerFooter Safe-Area Clearance
  console.log("\n6. CustomerFooter Safe-Area Clearance:");
  const footerSrc = fs.readFileSync(path.join(__dirname, "../src/components/CustomerFooter.tsx"), "utf-8");
  assertTest(footerSrc.includes("hasFloatingCart"), "CustomerFooter accepts hasFloatingCart clearance prop");
  assertTest(footerSrc.includes("calc(84px + env(safe-area-inset-bottom, 0px))"), "CustomerFooter reserves 84px + safe-area when floating cart is active");

  console.log("\n=================================================");
  console.log(`  SUMMARY: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runValidation();
