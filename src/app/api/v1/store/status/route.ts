import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import { checkRestaurantOpen } from "@/lib/time";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Read dynamic settings from database
    const settingsRows = sqlite
      .prepare("SELECT key, value FROM restaurant_settings")
      .all() as { key: string; value: string }[];

    const settingsMap: Record<string, string> = {};
    for (const r of settingsRows) {
      settingsMap[r.key] = r.value;
    }

    const manualOverride = (settingsMap["manual_override_status"] || "AUTO") as
      | "AUTO"
      | "FORCE_OPEN"
      | "FORCE_CLOSED";
    const announcement = settingsMap["announcement_banner"] || "";

    const status = checkRestaurantOpen(manualOverride, announcement);

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
    console.error("Store status API error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
