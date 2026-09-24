import { NextResponse } from "next/server";
import { createOrderInputSchema } from "@/lib/validation";
import { createOrderInPostgres } from "@/db/postgres/repositories/orderRepository";
import { getAuthenticatedUser } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = createOrderInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid order input",
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Optional authenticated customer session
    const session = await getAuthenticatedUser();
    const authenticatedUserId = session ? session.userId : null;

    const result = await createOrderInPostgres(parseResult.data, authenticatedUserId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error("Order creation API error:", err?.message || "Internal database transaction failure");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to complete order creation. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
