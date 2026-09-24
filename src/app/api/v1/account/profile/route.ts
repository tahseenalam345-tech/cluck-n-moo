import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authGuard";
import { getCustomerProfileWithAddresses } from "@/db/postgres/repositories/accountRepository";
import { getPostgresDb } from "@/db/postgres/client";
import { profiles } from "@/db/postgres/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const data = await getCustomerProfileWithAddresses(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Account profile GET error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to retrieve profile." } },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fullName, phone } = body;

    const db = getPostgresDb();
    await db
      .update(profiles)
      .set({
        fullName: fullName ? fullName.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, session.userId));

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (err: any) {
    console.error("Account profile PUT error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to update profile." } },
      { status: 500 }
    );
  }
}
