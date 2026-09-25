import { NextResponse } from "next/server";
import {
  getStoreSettings,
  getStoreSchedules,
  getActiveSpecialSchedules,
} from "@/db/postgres/repositories/storeRepository";
import { checkRestaurantOpen } from "@/lib/time";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settingsMap, weeklySchedules, specialSchedules] = await Promise.all([
      getStoreSettings(),
      getStoreSchedules().catch(() => []),
      getActiveSpecialSchedules().catch(() => []),
    ]);

    const manualOverride = (settingsMap["manual_override_status"] || "AUTO") as
      | "AUTO"
      | "FORCE_OPEN"
      | "FORCE_CLOSED";
    const announcement = settingsMap["announcement_banner"] || "";

    const status = checkRestaurantOpen({
      manualOverrideStatus: manualOverride,
      announcementText: announcement,
      weeklySchedules,
      specialSchedules,
    });

    return NextResponse.json({
      success: true,
      data: {
        isOpen: status.isOpen,
        currentPktTime: status.currentPktTime,
        scheduleText: status.scheduleText,
        reason: status.reason,
        announcementBanner: announcement,
        manualOverrideStatus: manualOverride,
        store: {
          name: settingsMap["restaurant_name"] || BRAND.name,
          tagline: settingsMap["tagline"] || BRAND.tagline,
          phone: settingsMap["phone"] || BRAND.branch.phone,
          address: settingsMap["address"] || BRAND.branch.address,
          coordinates: {
            lat: parseFloat(settingsMap["lat"] || BRAND.branch.coordinates.lat.toString()),
            lng: parseFloat(settingsMap["lng"] || BRAND.branch.coordinates.lng.toString()),
          },
          defaultDeliveryFeePkr: parseInt(
            settingsMap["default_delivery_fee"] || BRAND.defaults.deliveryFeePkr.toString(),
            10
          ),
        },
      },
    });
  } catch (err: any) {
    console.error("Store status API error:", err?.message || "Database query failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to retrieve store operational status.",
        },
      },
      { status: 500 }
    );
  }
}
