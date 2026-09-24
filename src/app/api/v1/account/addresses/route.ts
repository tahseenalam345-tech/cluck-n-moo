import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authGuard";
import {
  saveCustomerAddress,
  deleteCustomerAddress,
} from "@/db/postgres/repositories/accountRepository";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { addressLine, landmark, deliveryAreaId, isDefault } = body;

    if (!addressLine || addressLine.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Address line is required" } },
        { status: 400 }
      );
    }

    const result = await saveCustomerAddress(session.userId, {
      addressLine,
      landmark,
      deliveryAreaId,
      isDefault: Boolean(isDefault),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("Account address POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to save address." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get("id");

    if (!addressId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Address ID is required" } },
        { status: 400 }
      );
    }

    await deleteCustomerAddress(session.userId, addressId);
    return NextResponse.json({ success: true, message: "Address deleted successfully." });
  } catch (err: any) {
    console.error("Account address DELETE error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to delete address." } },
      { status: 500 }
    );
  }
}
