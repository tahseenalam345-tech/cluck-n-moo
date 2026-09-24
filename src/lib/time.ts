import { BRAND } from "./constants";

export interface RestaurantStatus {
  isOpen: boolean;
  currentPktTime: string;
  scheduleText: string;
  reason?: string;
}

/**
 * Returns current date/time values in Asia/Karachi timezone
 */
export function getKarachiTime(date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  formattedTime: string;
} {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BRAND.branch.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);

  const getPart = (type: string) => {
    const p = parts.find((part) => part.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const hour = getPart("hour");
  const minute = getPart("minute");
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  // Determine weekday in Karachi
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAND.branch.timezone,
    weekday: "short",
  });
  const weekdayStr = weekdayFormatter.format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedTime = `${h12.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${ampm} PKT`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    dayOfWeek: dayMap[weekdayStr] ?? 0,
    formattedTime,
  };
}

/**
 * Evaluates whether the restaurant is open based on regular schedule and optional admin override.
 * Schedule: 12:01 PM (721 mins) to 02:00 AM (120 mins next day).
 */
export function checkRestaurantOpen(
  manualOverrideStatus: "AUTO" | "FORCE_OPEN" | "FORCE_CLOSED" = "AUTO",
  announcementText?: string
): RestaurantStatus {
  const kt = getKarachiTime();

  if (manualOverrideStatus === "FORCE_OPEN") {
    return {
      isOpen: true,
      currentPktTime: kt.formattedTime,
      scheduleText: "Open (Special Operating Hours)",
      reason: announcementText || "Open by management override",
    };
  }

  if (manualOverrideStatus === "FORCE_CLOSED") {
    return {
      isOpen: false,
      currentPktTime: kt.formattedTime,
      scheduleText: "Closed Temporarily",
      reason: announcementText || "Temporarily closed. Please check back shortly.",
    };
  }

  const currentMinutes = kt.hour * 60 + kt.minute;
  const openMin = BRAND.schedule.openMinutes; // 721 (12:01 PM)
  const closeMin = BRAND.schedule.closeMinutes; // 120 (02:00 AM)

  // Span crosses midnight:
  // Open if either currentMinutes >= 721 (12:01 PM till 11:59 PM) OR currentMinutes < 120 (12:00 AM till 02:00 AM)
  const isOpen = currentMinutes >= openMin || currentMinutes < closeMin;

  return {
    isOpen,
    currentPktTime: kt.formattedTime,
    scheduleText: `Every day: ${BRAND.schedule.openDisplay} – ${BRAND.schedule.closeDisplay}`,
    reason: isOpen ? undefined : `Closed now. We open at ${BRAND.schedule.openDisplay}.`,
  };
}
