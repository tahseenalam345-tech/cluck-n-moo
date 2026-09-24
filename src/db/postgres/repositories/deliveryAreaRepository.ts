import { getPgPoolClient } from "../client";
import { DeliveryArea } from "@/types";

/**
 * Server-only repository for querying active delivery areas from Supabase PostgreSQL.
 * Uses the Transaction Pooler (DATABASE_URL_POOLER).
 */
export async function getActiveDeliveryAreas(): Promise<DeliveryArea[]> {
  const sql = getPgPoolClient();
  const rows = await sql<
    Array<{
      id: string;
      name: string;
      slug: string;
      deliveryFeePkr: number;
      estimatedDeliveryMins: number;
      isActive: boolean;
      displayOrder: number;
    }>
  >`
    SELECT id, name, slug, delivery_fee_pkr as "deliveryFeePkr",
           estimated_delivery_mins as "estimatedDeliveryMins",
           is_active as "isActive", display_order as "displayOrder"
    FROM public.delivery_areas
    WHERE is_active = true
    ORDER BY display_order ASC, name ASC;
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    deliveryFeePkr: r.deliveryFeePkr,
    estimatedDeliveryMins: r.estimatedDeliveryMins,
    isActive: r.isActive ? 1 : 0,
    displayOrder: r.displayOrder,
  }));
}
