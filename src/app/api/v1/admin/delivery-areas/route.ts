import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import { deliveryAreaInputSchema } from "@/lib/validation";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = sqlite
      .prepare(
        `SELECT id, name, slug, delivery_fee_pkr as deliveryFeePkr,
                estimated_delivery_mins as estimatedDeliveryMins,
                is_active as isActive, display_order as displayOrder,
                created_at as createdAt, updated_at as updatedAt
         FROM delivery_areas
         ORDER BY display_order ASC, name ASC`
      )
      .all();

    return NextResponse.json({ success: true, data: areas });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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

    const { name, deliveryFeePkr, estimatedDeliveryMins, isActive, displayOrder } = parse.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `area_${crypto.randomBytes(6).toString("hex")}`;
    const now = new Date().toISOString();

    sqlite
      .prepare(
        `INSERT INTO delivery_areas (id, name, slug, delivery_fee_pkr, estimated_delivery_mins, is_active, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, name, slug, deliveryFeePkr, estimatedDeliveryMins, isActive ? 1 : 0, displayOrder, now, now);

    return NextResponse.json({
      success: true,
      data: { id, name, slug, deliveryFeePkr, estimatedDeliveryMins, isActive: isActive ? 1 : 0 },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, deliveryFeePkr, isActive, name } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Area ID is required" } },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    sqlite
      .prepare(
        `UPDATE delivery_areas
         SET delivery_fee_pkr = COALESCE(?, delivery_fee_pkr),
             is_active = COALESCE(?, is_active),
             name = COALESCE(?, name),
             updated_at = ?
         WHERE id = ?`
      )
      .run(deliveryFeePkr !== undefined ? deliveryFeePkr : null, isActive !== undefined ? (isActive ? 1 : 0) : null, name || null, now, id);

    return NextResponse.json({ success: true, message: "Delivery area updated" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
