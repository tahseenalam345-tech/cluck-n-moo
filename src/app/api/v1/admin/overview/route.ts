import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/authGuard";
import { getPostgresDb } from "@/db/postgres/client";
import { products, categories, orders, deliveryAreas, promotions } from "@/db/postgres/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await enforceRole(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const db = getPostgresDb();

    // 1. Total products & availability counts
    const productStats = await db
      .select({
        total: sql<number>`count(*)`,
        available: sql<number>`count(*) filter (where ${products.isAvailable} = true and ${products.isArchived} = false)`,
        soldOut: sql<number>`count(*) filter (where ${products.isAvailable} = false and ${products.isArchived} = false)`,
        archived: sql<number>`count(*) filter (where ${products.isArchived} = true)`,
        missingImages: sql<number>`count(*) filter (where ${products.cloudinaryPublicId} is null or ${products.cloudinaryPublicId} = '')`,
      })
      .from(products);

    // 2. Categories count
    const categoryStats = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${categories.isActive} = true and ${categories.isArchived} = false)`,
      })
      .from(categories);

    // 3. Orders stats
    const orderStats = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${orders.status} in ('New', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery'))`,
        completed: sql<number>`count(*) filter (where ${orders.status} = 'Completed')`,
        cancelled: sql<number>`count(*) filter (where ${orders.status} = 'Cancelled')`,
        totalRevenuePkr: sql<number>`coalesce(sum(${orders.totalPkr}) filter (where ${orders.status} != 'Cancelled'), 0)`,
      })
      .from(orders);

    // 4. Delivery areas count
    const [areaStat] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${deliveryAreas.isActive} = true)`,
      })
      .from(deliveryAreas);

    // 5. Active promotions count
    const [promoStat] = await db
      .select({
        total: sql<number>`count(*) filter (where ${promotions.isActive} = true)`,
      })
      .from(promotions);

    return NextResponse.json({
      success: true,
      data: {
        products: {
          total: Number(productStats[0]?.total || 0),
          available: Number(productStats[0]?.available || 0),
          soldOut: Number(productStats[0]?.soldOut || 0),
          archived: Number(productStats[0]?.archived || 0),
          missingImages: Number(productStats[0]?.missingImages || 0),
        },
        categories: {
          total: Number(categoryStats[0]?.total || 0),
          active: Number(categoryStats[0]?.active || 0),
        },
        orders: {
          total: Number(orderStats[0]?.total || 0),
          pending: Number(orderStats[0]?.pending || 0),
          completed: Number(orderStats[0]?.completed || 0),
          cancelled: Number(orderStats[0]?.cancelled || 0),
          totalRevenuePkr: Number(orderStats[0]?.totalRevenuePkr || 0),
        },
        deliveryAreas: {
          total: Number(areaStat?.total || 0),
          active: Number(areaStat?.active || 0),
        },
        promotions: {
          active: Number(promoStat?.total || 0),
        },
      },
    });
  } catch (err: any) {
    console.error("Admin Overview API Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load admin overview metrics." } },
      { status: 500 }
    );
  }
}
