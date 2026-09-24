import { getPostgresDb } from "../client";
import { deliveryAreas, restaurantSettings, restaurantSchedules } from "../schema";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";

export interface DeliveryAreaInput {
  name: string;
  deliveryFeePkr: number;
  estimatedDeliveryMins: number;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Retrieves all delivery areas (active and inactive) for admin management.
 */
export async function getAllDeliveryAreasForAdmin() {
  const db = getPostgresDb();
  return db
    .select({
      id: deliveryAreas.id,
      name: deliveryAreas.name,
      slug: deliveryAreas.slug,
      deliveryFeePkr: deliveryAreas.deliveryFeePkr,
      estimatedDeliveryMins: deliveryAreas.estimatedDeliveryMins,
      isActive: deliveryAreas.isActive,
      displayOrder: deliveryAreas.displayOrder,
      createdAt: deliveryAreas.createdAt,
      updatedAt: deliveryAreas.updatedAt,
    })
    .from(deliveryAreas)
    .orderBy(asc(deliveryAreas.displayOrder), asc(deliveryAreas.name));
}

/**
 * Creates a new delivery area in PostgreSQL.
 */
export async function createDeliveryAreaInPostgres(input: DeliveryAreaInput) {
  const db = getPostgresDb();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = `area_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date();

  await db.insert(deliveryAreas).values({
    id,
    name: input.name.trim(),
    slug,
    deliveryFeePkr: input.deliveryFeePkr,
    estimatedDeliveryMins: input.estimatedDeliveryMins,
    isActive: Boolean(input.isActive),
    displayOrder: input.displayOrder,
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug, ...input };
}

/**
 * Updates a delivery area in PostgreSQL.
 */
export async function updateDeliveryAreaInPostgres(
  id: string,
  updates: Partial<DeliveryAreaInput>
) {
  const db = getPostgresDb();
  const now = new Date();

  await db
    .update(deliveryAreas)
    .set({
      name: updates.name !== undefined ? updates.name.trim() : undefined,
      deliveryFeePkr: updates.deliveryFeePkr,
      estimatedDeliveryMins: updates.estimatedDeliveryMins,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : undefined,
      displayOrder: updates.displayOrder,
      updatedAt: now,
    })
    .where(eq(deliveryAreas.id, id));

  return true;
}

/**
 * Retrieves all restaurant settings and schedules for the admin portal.
 */
export async function getAdminSettingsAndSchedules() {
  const db = getPostgresDb();

  const settingRows = await db.select().from(restaurantSettings);
  const settingsMap: Record<string, string> = {};
  for (const row of settingRows) {
    settingsMap[row.key] = row.value;
  }

  const scheduleRows = await db
    .select({
      dayOfWeek: restaurantSchedules.dayOfWeek,
      openTime: restaurantSchedules.openTime,
      closeTime: restaurantSchedules.closeTime,
      isClosed: restaurantSchedules.isClosed,
    })
    .from(restaurantSchedules)
    .orderBy(asc(restaurantSchedules.dayOfWeek));

  return {
    settings: settingsMap,
    schedules: scheduleRows,
  };
}

/**
 * Updates restaurant settings and weekly schedules atomically in PostgreSQL.
 */
export async function updateAdminSettingsAndSchedules(
  settings: Record<string, string | number>,
  schedules?: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
) {
  const db = getPostgresDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        await tx
          .insert(restaurantSettings)
          .values({
            key,
            value: value.toString(),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: restaurantSettings.key,
            set: {
              value: value.toString(),
              updatedAt: now,
            },
          });
      }
    }

    if (Array.isArray(schedules)) {
      for (const s of schedules) {
        await tx
          .update(restaurantSchedules)
          .set({
            openTime: s.openTime,
            closeTime: s.closeTime,
            isClosed: Boolean(s.isClosed),
          })
          .where(eq(restaurantSchedules.dayOfWeek, s.dayOfWeek));
      }
    }
  });

  return true;
}
