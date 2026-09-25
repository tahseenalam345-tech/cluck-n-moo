import { getPostgresDb } from "../client";
import { deliveryAreas, restaurantSettings, restaurantSchedules, specialSchedules } from "../schema";
import { eq, asc, desc } from "drizzle-orm";
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

  const specialRows = await db
    .select()
    .from(specialSchedules)
    .orderBy(desc(specialSchedules.startDate));

  return {
    settings: settingsMap,
    schedules: scheduleRows,
    specialSchedules: specialRows,
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

/**
 * Creates a new special event/holiday schedule in PostgreSQL.
 */
export async function createSpecialScheduleInPostgres(input: {
  name: string;
  startDate: string;
  endDate: string;
  isClosedAllDay: boolean;
  openTime?: string;
  closeTime?: string;
  note?: string;
}) {
  const db = getPostgresDb();
  const id = `spec_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date();

  await db.insert(specialSchedules).values({
    id,
    name: input.name.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    isClosedAllDay: Boolean(input.isClosedAllDay),
    openTime: input.openTime || "12:01",
    closeTime: input.closeTime || "02:00",
    note: input.note ? input.note.trim() : null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return { id, ...input };
}

/**
 * Updates an existing special event/holiday schedule.
 */
export async function updateSpecialScheduleInPostgres(
  id: string,
  updates: {
    name?: string;
    startDate?: string;
    endDate?: string;
    isClosedAllDay?: boolean;
    openTime?: string;
    closeTime?: string;
    note?: string;
    isActive?: boolean;
  }
) {
  const db = getPostgresDb();
  const now = new Date();

  await db
    .update(specialSchedules)
    .set({
      name: updates.name !== undefined ? updates.name.trim() : undefined,
      startDate: updates.startDate !== undefined ? updates.startDate : undefined,
      endDate: updates.endDate !== undefined ? updates.endDate : undefined,
      isClosedAllDay: updates.isClosedAllDay !== undefined ? Boolean(updates.isClosedAllDay) : undefined,
      openTime: updates.openTime !== undefined ? updates.openTime : undefined,
      closeTime: updates.closeTime !== undefined ? updates.closeTime : undefined,
      note: updates.note !== undefined ? updates.note.trim() : undefined,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : undefined,
      updatedAt: now,
    })
    .where(eq(specialSchedules.id, id));

  return true;
}

/**
 * Deletes a special event/holiday schedule.
 */
export async function deleteSpecialScheduleInPostgres(id: string) {
  const db = getPostgresDb();
  await db.delete(specialSchedules).where(eq(specialSchedules.id, id));
  return true;
}
