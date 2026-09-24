import { getPostgresDb } from "../client";
import { profiles, customerAddresses, orders } from "../schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

export interface AddressInput {
  deliveryAreaId?: string | null;
  addressLine: string;
  landmark?: string | null;
  isDefault?: boolean;
}

/**
 * Retrieves customer profile and saved delivery addresses.
 */
export async function getCustomerProfileWithAddresses(userId: string) {
  const db = getPostgresDb();

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (profileRows.length === 0) return null;

  const addresses = await db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.userId, userId))
    .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));

  return {
    profile: profileRows[0],
    addresses,
  };
}

/**
 * Adds or updates a customer delivery address.
 */
export async function saveCustomerAddress(userId: string, input: AddressInput) {
  const db = getPostgresDb();
  const addressId = `addr_${crypto.randomBytes(8).toString("hex")}`;
  const now = new Date();

  await db.transaction(async (tx) => {
    // If setting as default, clear existing defaults for this user
    if (input.isDefault) {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.userId, userId));
    }

    await tx.insert(customerAddresses).values({
      id: addressId,
      userId,
      deliveryAreaId: input.deliveryAreaId || null,
      addressLine: input.addressLine.trim(),
      landmark: input.landmark ? input.landmark.trim() : null,
      isDefault: Boolean(input.isDefault),
      createdAt: now,
    });
  });

  return { id: addressId, ...input };
}

/**
 * Deletes a customer delivery address.
 */
export async function deleteCustomerAddress(userId: string, addressId: string) {
  const db = getPostgresDb();
  await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId)));
  return true;
}

/**
 * Claims previous guest orders for an authenticated user using their device tracking tokens.
 */
export async function claimGuestOrdersForUser(userId: string, trackingTokens: string[]) {
  if (!trackingTokens || trackingTokens.length === 0) return 0;

  const db = getPostgresDb();

  // Execute database function or direct atomic update
  const result = await db
    .update(orders)
    .set({
      userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(orders.trackingToken, trackingTokens),
        sql`${orders.userId} IS NULL`
      )
    );

  return result.length || 0;
}
