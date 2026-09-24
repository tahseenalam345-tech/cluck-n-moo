import { NextResponse } from "next/server";
import { deliveryAreaInputSchema } from "@/lib/validation";
import {
  getAllDeliveryAreasForAdmin,
  createDeliveryAreaInPostgres,
  updateDeliveryAreaInPostgres,
} from "@/db/postgres/repositories/storeAdminRepository";
import { enforceRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await enforceRole(["ADMIN"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const areas = await getAllDeliveryAreasForAdmin();
    return NextResponse.json({ success: true, data: areas });
  } catch (err: any) {
    console.error("Admin delivery areas GET error:", err?.message || "Internal database query failure");
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to retrieve delivery areas." },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await enforceRole(["ADMIN"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const body = await req.json();
    const parse = deliveryAreaInputSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parse.error.errors[0]?.message },
        },
        { status: 400 }
      );
    }

    const result = await createDeliveryAreaInPostgres({
      name: parse.data.name,
      deliveryFeePkr: parse.data.deliveryFeePkr,
      estimatedDeliveryMins: parse.data.estimatedDeliveryMins,
      isActive: Boolean(parse.data.isActive),
      displayOrder: parse.data.displayOrder,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Admin delivery areas POST error:", err?.message || "Internal database error");
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to create delivery area." },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await enforceRole(["ADMIN"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const body = await req.json();
    const { id, deliveryFeePkr, estimatedDeliveryMins, isActive, displayOrder, name } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Area ID is required" } },
        { status: 400 }
      );
    }

    await updateDeliveryAreaInPostgres(id, {
      name,
      deliveryFeePkr,
      estimatedDeliveryMins,
      isActive,
      displayOrder,
    });

    return NextResponse.json({ success: true, message: "Delivery area updated successfully." });
  } catch (err: any) {
    console.error("Admin delivery areas PATCH error:", err?.message || "Internal database error");
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to update delivery area." },
      },
      { status: 500 }
    );
  }
}
