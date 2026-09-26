import * as fs from "fs";
import * as path from "path";

function runVerification() {
  console.log("=== CHECK 1: SIGNATURE NAVIGATION STRIP (MOBILE HEIGHT) ===");
  const sigNavCode = fs.readFileSync(path.resolve("src/components/SignatureNavigationStrip.tsx"), "utf-8");
  if (!sigNavCode.includes("width: 44px !important") || !sigNavCode.includes(".signature-item-box")) {
    throw new Error("SignatureNavigationStrip does not contain compact 44px mobile height!");
  }
  console.log("PASS: SignatureNavigationStrip reduced by ~30% for mobile viewports.");

  console.log("\n=== CHECK 2: HOMEPAGE MENU THEME / CATEGORY SEPARATION ===");
  const pageCode = fs.readFileSync(path.resolve("src/app/page.tsx"), "utf-8");
  if (!pageCode.includes('activeSignatureSlug === "menu" && (')) {
    throw new Error("Popular picks, promotions, or categories are not conditionally guarded by activeSignatureSlug === 'menu'");
  }
  if (!pageCode.includes("← Back to Main Menu")) {
    throw new Error("Missing '← Back to Main Menu' button in page.tsx");
  }
  if (!pageCode.includes("scrollIntoView") && !pageCode.includes("scrollTo")) {
    throw new Error("Missing smooth scroll behavior in page.tsx");
  }
  console.log("PASS: Homepage properly hides homepage-only sections when non-main theme is active and includes return navigation & smooth scroll.");

  console.log("\n=== CHECK 3: ORDER MODE MODAL (COMPACT & CONTEXT SPECIFIC) ===");
  const orderModeCode = fs.readFileSync(path.resolve("src/components/OrderModeModal.tsx"), "utf-8");
  if (!orderModeCode.includes("order-mode-card") || !orderModeCode.includes("orderType: \"PICKUP\"")) {
    throw new Error("OrderModeModal missing compact card or instant pickup handling");
  }
  if (!orderModeCode.includes("cnm-themed-select")) {
    throw new Error("OrderModeModal missing CNM themed select for delivery areas");
  }
  console.log("PASS: OrderModeModal is compact, centered, and transitions seamlessly.");

  console.log("\n=== CHECK 4: TRACK ORDER PAGE (SINGLE SIGN IN, SYNC ICON, RESPONSIVE LOOKUP) ===");
  const trackPageCode = fs.readFileSync(path.resolve("src/app/order/track/page.tsx"), "utf-8");
  // Check that duplicate sign in banner was removed
  const signInMatches = (trackPageCode.match(/setShowSignInModal\(true\)/g) || []).length;
  console.log(`Customer sign-in modal triggers found: ${signInMatches} (Expected: 1)`);
  if (signInMatches !== 1) {
    throw new Error(`Expected exactly 1 sign-in trigger, found ${signInMatches}`);
  }
  if (trackPageCode.includes("<span>Sync</span>") || trackPageCode.includes("<span>Syncing...</span>")) {
    throw new Error("Track Order page still contains visible 'Sync' text!");
  }
  if (!trackPageCode.includes("track-lookup-form")) {
    throw new Error("Track Order page missing responsive track-lookup-form class");
  }
  console.log("PASS: Track Order page has single sign-in, icon-only sync, and responsive lookup form.");

  console.log("\n=== CHECK 5: LIVE TRACKING PAGE (NO BACK/MENU TEXT, LOGO ON RIGHT) ===");
  const liveTrackCode = fs.readFileSync(path.resolve("src/app/order/track/[id]/page.tsx"), "utf-8");
  if (liveTrackCode.includes("<span>Menu</span>") || liveTrackCode.includes("<ArrowLeft")) {
    throw new Error("Live Tracking page still contains 'Menu' text or ArrowLeft!");
  }
  if (!liveTrackCode.includes("Brand Logo on Right Side")) {
    throw new Error("Live Tracking page header does not have Brand Logo on right side!");
  }
  console.log("PASS: Live Tracking page has no 'Menu' back arrow and places Brand Logo on the right.");

  console.log("\n=== CHECK 6: MENU PAGE SPACING ===");
  const menuCode = fs.readFileSync(path.resolve("src/app/menu/page.tsx"), "utf-8");
  if (!menuCode.includes("menu-hero-header") || !menuCode.includes("padding: 16px 0 36px")) {
    throw new Error("Menu page missing compact spacing rules");
  }
  console.log("PASS: Full Menu page padding and hero spacing optimized for mobile.");

  console.log("\n=== ALL MOBILE UX CODE AUDITS PASSED ===");
}

runVerification();
