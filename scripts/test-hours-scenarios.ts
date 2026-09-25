import { checkRestaurantOpen } from "../src/lib/time";

console.log("=== TESTING ALL 8 OPERATING HOURS SCENARIOS ===");

// 1. FORCE_OPEN
const test1 = checkRestaurantOpen({ manualOverrideStatus: "FORCE_OPEN" });
console.log("1. FORCE_OPEN -> isOpen:", test1.isOpen, "| scheduleText:", test1.scheduleText);
if (!test1.isOpen) throw new Error("Test 1 failed");

// 2. FORCE_CLOSED
const test2 = checkRestaurantOpen({ manualOverrideStatus: "FORCE_CLOSED" });
console.log("2. FORCE_CLOSED -> isOpen:", test2.isOpen, "| scheduleText:", test2.scheduleText);
if (test2.isOpen) throw new Error("Test 2 failed");

// Sample Weekly Schedule (Mon-Sun, Friday off)
const weeklySchedules = [
  { dayOfWeek: 0, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Sun
  { dayOfWeek: 1, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Mon
  { dayOfWeek: 2, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Tue
  { dayOfWeek: 3, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Wed
  { dayOfWeek: 4, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Thu
  { dayOfWeek: 5, openTime: "12:01", closeTime: "02:00", isClosed: true },  // Fri (Weekly Off)
  { dayOfWeek: 6, openTime: "12:01", closeTime: "02:00", isClosed: false }, // Sat
];

// 3. Normal Day (Wednesday 3:00 PM PKT = 15:00)
// Wednesday 2026-09-23 15:00 PKT (10:00 UTC)
const wednesdayAfternoon = new Date("2026-09-23T10:00:00Z");
const test3 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  overrideDate: wednesdayAfternoon,
});
console.log("3. Normal Day (Wed 3 PM) -> isOpen:", test3.isOpen, "| scheduleText:", test3.scheduleText);
if (!test3.isOpen) throw new Error("Test 3 failed");

// 4. Weekly Off (Friday 3:00 PM PKT)
// Friday 2026-09-25 15:00 PKT (10:00 UTC)
const fridayAfternoon = new Date("2026-09-25T10:00:00Z");
const test4 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  overrideDate: fridayAfternoon,
});
console.log("4. Weekly Off (Friday) -> isOpen:", test4.isOpen, "| scheduleText:", test4.scheduleText);
if (test4.isOpen) throw new Error("Test 4 failed");

// 5. Midnight Crossing (Thursday 01:15 AM PKT -> should be OPEN)
// Thursday 01:15 AM PKT = Wednesday 20:15 UTC
const midnightTestTime = new Date("2026-09-23T20:15:00Z");
const test5 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  overrideDate: midnightTestTime,
});
console.log("5. Midnight Crossing (01:15 AM) -> isOpen:", test5.isOpen, "| scheduleText:", test5.scheduleText);
if (!test5.isOpen) throw new Error("Test 5 failed");

// 6. Temporary Eid Closure (All day closed override)
const specialSchedules = [
  {
    name: "Eid-ul-Fitr",
    startDate: "2026-04-10",
    endDate: "2026-04-12",
    isClosedAllDay: true,
    openTime: "12:01",
    closeTime: "02:00",
    note: "Eid Mubarak! Closed for holidays.",
    isActive: true,
  },
  {
    name: "14 August Independence Day",
    startDate: "2026-08-14",
    endDate: "2026-08-14",
    isClosedAllDay: false,
    openTime: "14:00",
    closeTime: "03:00",
    note: "Azadi Celebration Special Hours!",
    isActive: true,
  },
  {
    name: "Expired Ramadan Timing",
    startDate: "2026-03-01",
    endDate: "2026-03-30",
    isClosedAllDay: false,
    openTime: "17:00",
    closeTime: "04:00",
    isActive: true,
  },
];

// Test 6: During Eid (2026-04-11 at 2 PM PKT)
const eidTime = new Date("2026-04-11T09:00:00Z");
const test6 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  specialSchedules,
  overrideDate: eidTime,
});
console.log("6. Temporary Eid Closure -> isOpen:", test6.isOpen, "| scheduleText:", test6.scheduleText, "| reason:", test6.reason);
if (test6.isOpen) throw new Error("Test 6 failed");

// Test 7: 14 August Special Timing (Open at 3 PM PKT, normal was from 12:01, but special open is 14:00)
const azadiTime = new Date("2026-08-14T10:00:00Z");
const test7 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  specialSchedules,
  overrideDate: azadiTime,
});
console.log("7. 14 August Special Timing -> isOpen:", test7.isOpen, "| scheduleText:", test7.scheduleText);
if (!test7.isOpen) throw new Error("Test 7 failed");

// Test 8: Expired Special Event (Today 2026-09-25 vs Expired March 2026 Ramadan)
// Should NOT be affected by March Ramadan, should use weekly schedule!
const test8 = checkRestaurantOpen({
  manualOverrideStatus: "AUTO",
  weeklySchedules,
  specialSchedules,
  overrideDate: wednesdayAfternoon,
});
console.log("8. Expired Special Event -> isOpen:", test8.isOpen, "| scheduleText:", test8.scheduleText);
if (!test8.isOpen) throw new Error("Test 8 failed");

console.log("✓ ALL 8 OPERATING HOURS SCENARIOS PASSED WITH 100% ACCURACY!");
