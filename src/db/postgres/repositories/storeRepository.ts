import { getPgPoolClient } from "../client";

export interface RestaurantSchedule {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/**
 * Server-only repository for querying store settings and operating hours from Supabase PostgreSQL.
 * Uses the Transaction Pooler (DATABASE_URL_POOLER).
 */
export async function getStoreSettings(): Promise<Record<string, string>> {
  const sql = getPgPoolClient();
  const rows = await sql<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM public.restaurant_settings;
  `;

  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function getStoreSchedules(): Promise<RestaurantSchedule[]> {
  const sql = getPgPoolClient();
  const rows = await sql<
    Array<{
      id: string;
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    }>
  >`
    SELECT id, day_of_week as "dayOfWeek", open_time as "openTime", close_time as "closeTime", is_closed as "isClosed"
    FROM public.restaurant_schedules
    ORDER BY day_of_week ASC;
  `;

  return rows;
}
