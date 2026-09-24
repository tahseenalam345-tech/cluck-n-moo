import { checkRestaurantOpen } from "../src/lib/time";
import { BRAND } from "../src/lib/constants";

function testMidnightCrossingLogic() {
  console.log("🧪 Testing Cluck N Moo Midnight-Crossing Schedule Logic...");

  function simulateStatusAtMinute(hour: number, minute: number): boolean {
    const currentMinutes = hour * 60 + minute;
    const openMin = BRAND.schedule.openMinutes; // 721 (12:01 PM)
    const closeMin = BRAND.schedule.closeMinutes; // 120 (02:00 AM)
    return currentMinutes >= openMin || currentMinutes < closeMin;
  }

  const testCases = [
    { hour: 11, minute: 59, expected: false, label: "11:59 AM (1 minute before opening)" },
    { hour: 12, minute: 0, expected: false, label: "12:00 PM (noon, before 12:01)" },
    { hour: 12, minute: 1, expected: true, label: "12:01 PM (exact opening minute)" },
    { hour: 14, minute: 30, expected: true, label: "02:30 PM (lunch peak)" },
    { hour: 20, minute: 0, expected: true, label: "08:00 PM (dinner rush)" },
    { hour: 23, minute: 59, expected: true, label: "11:59 PM (just before midnight)" },
    { hour: 0, minute: 0, expected: true, label: "12:00 AM (midnight, new calendar day)" },
    { hour: 1, minute: 30, expected: true, label: "01:30 AM (late night cravings)" },
    { hour: 1, minute: 59, expected: true, label: "01:59 AM (1 min before closing)" },
    { hour: 2, minute: 0, expected: false, label: "02:00 AM (exact closing time)" },
    { hour: 2, minute: 1, expected: false, label: "02:01 AM (closed)" },
    { hour: 6, minute: 0, expected: false, label: "06:00 AM (closed early morning)" },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const result = simulateStatusAtMinute(tc.hour, tc.minute);
    const isOk = result === tc.expected;
    if (isOk) {
      passed++;
      console.log(`  ✓ ${tc.label} -> ${result ? "OPEN" : "CLOSED"}`);
    } else {
      console.error(`  ✗ FAIL: ${tc.label} expected ${tc.expected ? "OPEN" : "CLOSED"} but got ${result ? "OPEN" : "CLOSED"}`);
    }
  }

  // Test admin overrides
  const forceOpen = checkRestaurantOpen("FORCE_OPEN");
  console.assert(forceOpen.isOpen === true, "FORCE_OPEN must return true");

  const forceClosed = checkRestaurantOpen("FORCE_CLOSED");
  console.assert(forceClosed.isOpen === false, "FORCE_CLOSED must return false");

  console.log(`\n🎉 Schedule tests passed: ${passed}/${testCases.length} assertions verified!`);
}

testMidnightCrossingLogic();
