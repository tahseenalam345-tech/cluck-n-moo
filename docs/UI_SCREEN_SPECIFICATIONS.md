# Cluck N Moo (CNM) — Screen Specifications & Content Hierarchy

This document specifies the exact visual hierarchy, structural layouts, and interactive behaviors for each screen in the Cluck N Moo platform.

---

## Screen 1: Customer Storefront & Menu (`/`)

### 1.1 Content Hierarchy

1. **Top Utility Bar (Sticky / Header Top)**:
   - Live Store Status Pill: Green glowing pulse dot + `OPEN NOW` + `12:01 PM – 02:00 AM PKT`.
   - Branch Phone Hotline: `0302-1949067` with telephone tap action.
2. **Main Brand Bar**:
   - Left: Authoritative CNM Logo container (HD vector insignia) + Tagline *"juiciest in town"*.
   - Right: Interactive Floating Cart Pill (Badge count + total PKR).
3. **Hero Marquee Banner**:
   - Headline: `JUICIEST IN TOWN.` in condensed bold display type.
   - Street-Food Badges: `★ 100% PURE SMASH BEEF ★ DOUBLE CRUNCH ZINGERS ★`.
   - Location note: `Main GT Road, near Total Petrol Station / Raza CNG, Kharian`.
4. **Order Type Segmented Controller**:
   - 3 Options: `Delivery` (with "100 PKR • ~40m"), `Takeaway` ("No Fee • ~20m"), `Dine-In` ("Book Time • Table/Counter").
5. **Sticky Category Navigation Bar**:
   - Horizontal snap-scroll list of categories:
     - 🍔 `Smash & Zinger Burgers` (Badge count)
     - 🍗 `Crispy Chicken & Tenders`
     - 🔥 `Exclusive Value Deals`
     - 🍟 `Loaded Fries & Dips`
     - 🥤 `Chilled Beverages`
6. **Product Catalog Grid**:
   - Grouped by category.
   - Each Product Card:
     - Top Image Container: Food presentation with soft shadow.
     - Badges: `Popular`, `Spicy`, or `Signature Deal`.
     - Title: Bold uppercase product name.
     - Description: Muted cream text highlighting ingredients.
     - Bottom Row: Price in bold flame orange (`550 PKR` or `From 550 PKR`) + `+ Add` / `Options` CTA.
7. **Floating Bottom Tray Bar**:
   - Displays automatically when cart has items. Shows quantity chip, `VIEW TRAY / CHECKOUT`, and subtotal.
8. **Brand Footer**:
   - Branch coordinates, full address, store hours, coverage of 11 Kharian delivery villages, staff login link.

---

## Screen 2: Product Customizer Bottom-Sheet Modal

### 2.1 Content Hierarchy

1. **Top Sheet Bar**:
   - Pull handle indicator.
   - Title: Product Name + Close `X` icon.
2. **Variant Selection (Required, Single Choice)**:
   - Header: `Choose Size / Variant` (e.g. Single Patty vs Double Patty & Double Cheese).
   - Radio tiles with clear prices (+0 PKR vs +200 PKR).
3. **Modifier Add-ons (Optional, Multi-Choice)**:
   - Header: `Upgrade Your Burger (Extras)` with indicator `Up to 2 extras`.
   - Checkbox tiles: Extra Cheddar Slice (+80 PKR), Sliced Jalapeños (+50 PKR), Garlic Mayo Dip (+70 PKR).
4. **Cooking & Prep Notes**:
   - Quick pill toggles: `No Mayo`, `Extra Spicy`, `Cut into Halves`, `Pack Separately`.
   - Optional text field: 150 char max.
5. **Sticky Bottom Action Bar**:
   - Left: Quantity Stepper (`-` `1` `+`).
   - Right: Primary Button: `Add to Order • [Dynamic Total] PKR`.

---

## Screen 3: Cart Drawer & Review Flow (Step 1)

### 3.1 Content Hierarchy

1. **Header**:
   - `Your Tray` + item count + Close button.
2. **Itemized Cart Cards**:
   - Item row: Quantity pill, product name, chosen variant, modifier chips, line price.
   - Actions: Increment/decrement quantity, remove item trash icon.
   - Special notes display in subtle orange italic tag.
3. **Quick Cross-Sell Carousel ("Complete Your Meal")**:
   - 1-tap add chips: `+ Golden Fries (250 PKR)`, `+ Chilled Pepsi 345ml (120 PKR)`, `+ Garlic Mayo Dip (70 PKR)`.
4. **Order Type Confirmation**:
   - Shows active selected order type (`Delivery`, `Takeaway`, `Dine-In`) with easy change trigger.
5. **Pricing Summary Box**:
   - Subtotal.
   - Delivery Fee (100 PKR or 0 PKR).
   - Total to Pay (in Cash).
6. **Primary Button**:
   - `Proceed to Details ➔`.

---

## Screen 4: Checkout Flow (Step 2)

### 4.1 Content Hierarchy

1. **Contact Information**:
   - Full Name (required).
   - Active Phone Number (required with Pakistani format hint e.g. `0302-1949067`).
   - Notice: *"Staff will call this number to confirm your order before preparation."*
2. **Destination / Arrival Details**:
   - **If Delivery**:
     - Delivery Area selection (11 Kharian areas with fees and ETAs).
     - Street / House address line.
     - Nearby Landmark.
   - **If Dine-In**:
     - Preferred Arrival Time chips (`In 25 mins`, `In 45 mins`, `In 1 hour`, `Specific Time`).
     - Payment Location toggle (`Pay at Counter` or `Pay on Table`).
   - **If Takeaway / Pickup**:
     - Pickup notice at Main GT Road Kharian branch.
3. **Cash Payment Notice Banner**:
   - High-contrast card: `Payment Method: Cash Only (COD / Counter / Table)`.
4. **Primary Submit Button**:
   - `Confirm Order • [Total] PKR (Cash)`.

---

## Screen 5: Live Order Tracking Screen (`/order/track/[id]`)

### 5.1 Content Hierarchy

1. **Header**:
   - Back to Menu link.
   - Title: `Order Status`.
   - Manual refresh icon.
2. **Order Header Card**:
   - Order Number: `CNM-2609-XXXX` in large condensed bold type.
   - Order Type Badge (`DELIVERY` / `PICKUP` / `DINE-IN`).
   - Timestamp placed.
3. **Dynamic State Hero Card**:
   - Icon & Title matching state:
     - `New`: Amber card — *"Awaiting Phone Confirmation. Staff is calling you now."*
     - `Confirmed`: Blue card — *"Order Confirmed. Ticket sent to kitchen."*
     - `Preparing`: Orange card — *"Sizzling on the Grill & Fryer."*
     - `Ready`: Green card — *"Food Packed & Fresh at Counter."*
     - `Out for delivery`: Purple/Orange card — *"Rider on the Way to [Area]."*
     - `Completed`: Green celebration card — *"Delivered. Enjoy the juiciest feast!"*
4. **Visual Fulfillment Timeline**:
   - Step progress indicator with timestamps and completed checkmarks.
5. **Receipt Snapshot Card**:
   - Itemized table of ordered products, variants, modifiers, and line totals.
   - Subtotal, delivery fee, and cash total.
6. **Support Action Buttons**:
   - Giant Button: `Call Restaurant (0302-1949067)`.
   - Secondary Button: `Order Again`.

---

## Screen 6: Admin Command Center (`/admin`)

### 6.1 Content Hierarchy

1. **Top Bar**:
   - CNM Admin HQ logo + Live store time in PKT.
   - Quick Audio Alert Toggle (New order sound chime).
2. **Navigation Tabs**:
   - `Live Pipeline`, `Delivery Areas (11)`, `Store Hours & Overrides`.
3. **Pipeline Board (Kanban / Cards)**:
   - **Column 1: New (Needs Call)**:
     - Highlighted in bright amber.
     - Customer phone click-to-call link.
     - Prominent button: `Confirm by Phone ➔`.
   - **Column 2: In Kitchen**:
     - Tickets in `Confirmed` or `Preparing`.
     - Button: `Mark Ready`.
   - **Column 3: Out for Delivery**:
     - Delivery orders currently with riders.
     - Button: `Mark Delivered & Settled`.
4. **Delivery Areas Tab**:
   - Table of all 11 areas.
   - Inline fee input (e.g. 100 PKR).
   - Toggle switch for `Active` vs `Disabled` (rain/road condition toggle).
   - Add new area modal.
5. **Store Hours Tab**:
   - Dropdown: `AUTO (12:01 PM – 02:00 AM)` | `FORCE OPEN` | `FORCE CLOSED`.
   - Live announcement banner broadcaster.

---

## Screen 7: Kitchen Display System (`/kitchen`)

### 7.1 Content Hierarchy

1. **KDS Header**:
   - Title: `KITCHEN DISPLAY SYSTEM`.
   - Total active orders counter.
   - Auto-refresh indicator (every 6s).
2. **Ticket Cards (Wall / Tablet Friendly)**:
   - **Ticket Header**:
     - Giant order type banner: `DELIVERY` (Orange), `PICKUP` (Green), `DINE-IN` (Blue).
     - Order number and time elapsed counter.
   - **Ticket Body**:
     - Items with quantity in `24px` bold orange (`2x`).
     - Product Name in `20px` bold white.
     - Variant ("Double Patty") in cream bold.
     - Modifiers ("Extra Cheese") in indented callout.
     - Customer prep instructions in highlighted warning box.
   - **Ticket Footer**:
     - If Confirmed: Giant button `Start Cooking`.
     - If Preparing: Giant button `Mark Food Ready`.

---

## Screen 8: Rider Dispatch Portal (`/rider`)

### 8.1 Content Hierarchy

1. **Header**:
   - `CNM RIDER DISPATCH` + Active runs count.
2. **Delivery Run Cards**:
   - Order Number + Ready timestamp.
   - Customer Card:
     - Name in bold.
     - Big `Call Customer` button (one-tap dial).
     - Delivery Area badge (e.g. `Bidermarjan`, `Lalamusa`).
     - Street address & nearby landmark.
   - Cash Highlight:
     - `CASH TO COLLECT: [Total] PKR`.
   - Run Action Button:
     - If Ready: `Pick Up & Start Delivery ➔`.
     - If In Transit: `Delivered & Cash Collected ✓`.
