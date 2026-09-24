import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authGuard";
import { claimGuestOrdersForUser } from "@/db/postgres/repositories/accountRepository";

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
    const { trackingTokens } = body;

    if (!Array.isArray(trackingTokens) || trackingTokens.length === 0) {
      return NextResponse.json({ success: true, claimedCount: 0 });
    }

    const claimedCount = await claimGuestOrdersForUser(session.userId, trackingTokens);

    return NextResponse.json({
      success: true,
      claimedCount,
    });
  } catch (err: any) {
    console.error("Claim orders error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to claim guest orders." } },
      { status: 500 }
    );
  }
}
