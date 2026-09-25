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

export interface CheckRestaurantOpenOptions {
  manualOverrideStatus?: "AUTO" | "FORCE_OPEN" | "FORCE_CLOSED";
  announcementText?: string;
  weeklySchedules?: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>;
  specialSchedules?: Array<{
    name: string;
    startDate: string;
    endDate: string;
    isClosedAllDay: boolean;
    openTime: string;
    closeTime: string;
    note?: string | null;
    isActive?: boolean;
  }>;
  overrideDate?: Date;
}

/**
 * Converts "HH:MM" (24h) string to total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

/**
 * Checks whether current minutes falls in an open interval, with full midnight-crossing support.
 * Example: 12:01 PM (721) to 02:00 AM (120) -> open if minutes >= 721 OR minutes < 120.
 */
export function isTimeInRange(currentMinutes: number, openMinutes: number, closeMinutes: number): boolean {
  if (closeMinutes < openMinutes) {
    // Crosses midnight
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  // Normal daytime interval
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Evaluates whether the restaurant is open based on:
 * 1. Emergency Override (FORCE_OPEN / FORCE_CLOSED)
 * 2. Active Holiday / Special Event Schedules (e.g. Eid, 14 August, Ramadan)
 * 3. Daily Weekly Schedule (with midnight crossing support)
 * 4. Default Fallback Brand Schedule
 */
export function checkRestaurantOpen(
  optsOrOverride: "AUTO" | "FORCE_OPEN" | "FORCE_CLOSED" | CheckRestaurantOpenOptions = "AUTO",
  announcementArg?: string,
  weeklySchedulesArg?: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
  specialSchedulesArg?: Array<any>
): RestaurantStatus {
  // Normalize arguments for backward compatibility
  const options: CheckRestaurantOpenOptions =
    typeof optsOrOverride === "object" && optsOrOverride !== null
      ? optsOrOverride
      : {
          manualOverrideStatus: optsOrOverride,
          announcementText: announcementArg,
          weeklySchedules: weeklySchedulesArg,
          specialSchedules: specialSchedulesArg,
        };

  const manualOverride = options.manualOverrideStatus || "AUTO";
  const announcementText = options.announcementText;
  const kt = getKarachiTime(options.overrideDate);

  // 1. EMERGENCY MANAGEMENT OVERRIDES
  if (manualOverride === "FORCE_OPEN") {
    return {
      isOpen: true,
      currentPktTime: kt.formattedTime,
      scheduleText: "Open (Management Override Active)",
      reason: announcementText || "Store open by management override",
    };
  }

  if (manualOverride === "FORCE_CLOSED") {
    return {
      isOpen: false,
      currentPktTime: kt.formattedTime,
      scheduleText: "Temporarily Closed",
      reason: announcementText || "Temporarily closed by management override. Please check back shortly.",
    };
  }

  const currentMinutes = kt.hour * 60 + kt.minute;
  const todayDateStr = `${kt.year}-${String(kt.month).padStart(2, "0")}-${String(kt.day).padStart(2, "0")}`;

  // 2. TEMPORARY SPECIAL SCHEDULES / HOLIDAYS (Priority over normal schedule)
  if (Array.isArray(options.specialSchedules) && options.specialSchedules.length > 0) {
    const activeSpecial = options.specialSchedules.find(
      (s) =>
        s.isActive !== false &&
        todayDateStr >= s.startDate &&
        todayDateStr <= s.endDate
    );

    if (activeSpecial) {
      if (activeSpecial.isClosedAllDay) {
        return {
          isOpen: false,
          currentPktTime: kt.formattedTime,
          scheduleText: `${activeSpecial.name} (Closed All Day)`,
          reason: activeSpecial.note || `${activeSpecial.name} closure in effect today.`,
        };
      }

      const openMin = parseTimeToMinutes(activeSpecial.openTime);
      const closeMin = parseTimeToMinutes(activeSpecial.closeTime);
      const inRange = isTimeInRange(currentMinutes, openMin, closeMin);

      return {
        isOpen: inRange,
        currentPktTime: kt.formattedTime,
        scheduleText: `${activeSpecial.name}: ${activeSpecial.openTime} – ${activeSpecial.closeTime} PKT`,
        reason: inRange
          ? activeSpecial.note || `${activeSpecial.name} special operating hours active.`
          : activeSpecial.note || `Closed now for ${activeSpecial.name}. Operating hours: ${activeSpecial.openTime} – ${activeSpecial.closeTime} PKT.`,
      };
    }
  }

  // 3. WEEKLY SCHEDULE EVALUATION (For current Karachi weekday)
  if (Array.isArray(options.weeklySchedules) && options.weeklySchedules.length > 0) {
    const daySchedule = options.weeklySchedules.find((s) => s.dayOfWeek === kt.dayOfWeek);

    if (daySchedule) {
      if (daySchedule.isClosed) {
        return {
          isOpen: false,
          currentPktTime: kt.formattedTime,
          scheduleText: "Closed Today",
          reason: "Closed for weekly day off. We will resume normal operations tomorrow.",
        };
      }

      const openMin = parseTimeToMinutes(daySchedule.openTime);
      const closeMin = parseTimeToMinutes(daySchedule.closeTime);
      const inRange = isTimeInRange(currentMinutes, openMin, closeMin);

      return {
        isOpen: inRange,
        currentPktTime: kt.formattedTime,
        scheduleText: `Today: ${daySchedule.openTime} – ${daySchedule.closeTime} PKT`,
        reason: inRange
          ? undefined
          : `Closed now. Operating hours today: ${daySchedule.openTime} – ${daySchedule.closeTime} PKT.`,
      };
    }
  }

  // 4. DEFAULT BRAND SCHEDULE FALLBACK (12:01 PM to 02:00 AM midnight crossing)
  const defaultOpenMin = BRAND.schedule.openMinutes; // 721 (12:01 PM)
  const defaultCloseMin = BRAND.schedule.closeMinutes; // 120 (02:00 AM)
  const isDefaultOpen = isTimeInRange(currentMinutes, defaultOpenMin, defaultCloseMin);

  return {
    isOpen: isDefaultOpen,
    currentPktTime: kt.formattedTime,
    scheduleText: `Every day: ${BRAND.schedule.openDisplay} – ${BRAND.schedule.closeDisplay}`,
    reason: isDefaultOpen ? undefined : `Closed now. We open at ${BRAND.schedule.openDisplay}.`,
  };
}
