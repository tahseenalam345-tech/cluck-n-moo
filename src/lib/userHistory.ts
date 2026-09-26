/**
 * Cluck N Moo (CNM) — User Personal Order & Visit History Engine
 *
 * Stores and retrieves browsing history and past orders per user / device
 * using localStorage with memory fallback.
 * Allows each customer (isolated by phone number / guest device)
 * to see their personal 'Historia' on the menu.
 */

import { Product } from "@/types";
import { getLocalOrders } from "./orderHistory";

export interface UserOrderedItem {
  productId: string;
  productName: string;
  variantName?: string;
  orderId?: string;
  orderNumber?: string;
  orderedAt: string;
  quantity: number;
}

export interface UserVisitedItem {
  productId: string;
  visitCount: number;
  lastVisitedAt: string;
}

export interface UserHistoryStore {
  userPhone: string;
  lastOrderedItems: UserOrderedItem[];
  visitedItems: Record<string, UserVisitedItem>;
  updatedAt: string;
}

const STORAGE_PREFIX = "cnm_historia_";
const DEFAULT_USER_KEY = "guest";
const MAX_ORDERED_ITEMS = 20;

// Memory cache fallback for SSR or when localStorage is restricted
const memoryHistoryCache: Record<string, UserHistoryStore> = {};

/**
 * Normalize phone number for consistent storage keys
 */
export function normalizeUserKey(phone?: string | null): string {
  if (!phone) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cnm_cust_phone");
      if (stored && stored.trim().length >= 7) {
        return stored.replace(/[^0-9]/g, "");
      }
    }
    return DEFAULT_USER_KEY;
  }
  const clean = phone.replace(/[^0-9]/g, "");
  return clean.length >= 7 ? clean : DEFAULT_USER_KEY;
}

/**
 * Retrieve user history store from localStorage or memory
 */
export function getUserHistoryStore(userKeyInput?: string | null): UserHistoryStore {
  const userKey = normalizeUserKey(userKeyInput);
  const storageKey = `${STORAGE_PREFIX}${userKey}`;

  if (typeof window === "undefined") {
    return memoryHistoryCache[userKey] || {
      userPhone: userKey,
      lastOrderedItems: [],
      visitedItems: {},
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: UserHistoryStore = JSON.parse(raw);
      if (parsed && typeof parsed.visitedItems === "object") {
        memoryHistoryCache[userKey] = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read user historia from localStorage:", err);
  }

  // Check guest store if specific user has no records yet
  if (userKey !== DEFAULT_USER_KEY) {
    try {
      const guestRaw = localStorage.getItem(`${STORAGE_PREFIX}${DEFAULT_USER_KEY}`);
      if (guestRaw) {
        const guestParsed: UserHistoryStore = JSON.parse(guestRaw);
        if (guestParsed && (guestParsed.lastOrderedItems.length > 0 || Object.keys(guestParsed.visitedItems).length > 0)) {
          // Clone guest history into this user's store
          const cloned: UserHistoryStore = {
            ...guestParsed,
            userPhone: userKey,
            updatedAt: new Date().toISOString(),
          };
          saveUserHistoryStore(cloned);
          return cloned;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const defaultStore: UserHistoryStore = {
    userPhone: userKey,
    lastOrderedItems: [],
    visitedItems: {},
    updatedAt: new Date().toISOString(),
  };
  memoryHistoryCache[userKey] = defaultStore;
  return defaultStore;
}

/**
 * Save user history store to localStorage and memory
 */
export function saveUserHistoryStore(store: UserHistoryStore): void {
  const userKey = normalizeUserKey(store.userPhone);
  memoryHistoryCache[userKey] = store;

  if (typeof window === "undefined") return;

  try {
    const storageKey = `${STORAGE_PREFIX}${userKey}`;
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save user historia to localStorage:", err);
  }
}

/**
 * Record a product visit/view (e.g. when opening customizer or clicking a card)
 */
export function recordProductVisit(productId: string, userKeyInput?: string | null): void {
  if (!productId) return;
  const store = getUserHistoryStore(userKeyInput);
  const now = new Date().toISOString();

  const existing = store.visitedItems[productId];
  if (existing) {
    store.visitedItems[productId] = {
      productId,
      visitCount: existing.visitCount + 1,
      lastVisitedAt: now,
    };
  } else {
    store.visitedItems[productId] = {
      productId,
      visitCount: 1,
      lastVisitedAt: now,
    };
  }

  store.updatedAt = now;
  saveUserHistoryStore(store);
}

/**
 * Record items from an order placed by the user
 */
export function recordOrderedItems(
  items: Array<{ productId: string; productName: string; variantName?: string; quantity: number }>,
  orderInfo: { orderId?: string; orderNumber?: string },
  userKeyInput?: string | null
): void {
  if (!Array.isArray(items) || items.length === 0) return;
  const store = getUserHistoryStore(userKeyInput);
  const now = new Date().toISOString();

  const newRecords: UserOrderedItem[] = items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    variantName: item.variantName,
    orderId: orderInfo.orderId,
    orderNumber: orderInfo.orderNumber,
    orderedAt: now,
    quantity: item.quantity || 1,
  }));

  // Prepend newest items, deduplicate, limit
  const merged = [...newRecords, ...store.lastOrderedItems].slice(0, MAX_ORDERED_ITEMS);
  store.lastOrderedItems = merged;

  // Also increment their visit count so they reflect as loved items
  items.forEach((item) => {
    const current = store.visitedItems[item.productId];
    store.visitedItems[item.productId] = {
      productId: item.productId,
      visitCount: (current?.visitCount || 0) + 3, // boost weight for ordered items
      lastVisitedAt: now,
    };
  });

  store.updatedAt = now;
  saveUserHistoryStore(store);

  // If user has a phone, also update guest store as fallback
  if (store.userPhone !== DEFAULT_USER_KEY) {
    const guestStore = getUserHistoryStore(DEFAULT_USER_KEY);
    guestStore.lastOrderedItems = merged;
    guestStore.updatedAt = now;
    saveUserHistoryStore(guestStore);
  }
}

export interface HistoriaResult {
  lastOrderedProducts: Array<{
    product: Product;
    orderedAt?: string;
    orderNumber?: string;
    variantName?: string;
    quantity?: number;
  }>;
  frequentlyVisitedProducts: Array<{
    product: Product;
    visitCount: number;
    lastVisitedAt?: string;
  }>;
  hasHistory: boolean;
  userPhone: string;
}

/**
 * Retrieve compiled products for the 'Historia' category
 * matching products by ID and name with past orders and frequent visits.
 */
export function getHistoriaProducts(
  allProducts: Product[],
  userKeyInput?: string | null
): HistoriaResult {
  const store = getUserHistoryStore(userKeyInput);
  const productMap = new Map<string, Product>();
  allProducts.forEach((p) => productMap.set(p.id, p));

  // 1. Resolve Last Ordered Products
  const lastOrderedMap = new Map<string, { product: Product; orderedAt?: string; orderNumber?: string; variantName?: string; quantity?: number }>();

  // A. From dedicated UserHistoryStore
  store.lastOrderedItems.forEach((item) => {
    let matched = productMap.get(item.productId);
    if (!matched) {
      // Match by exact name or slug
      matched = allProducts.find(
        (p) => p.name.toLowerCase() === item.productName.toLowerCase() || p.id === item.productId
      );
    }
    if (matched && !lastOrderedMap.has(matched.id)) {
      lastOrderedMap.set(matched.id, {
        product: matched,
        orderedAt: item.orderedAt,
        orderNumber: item.orderNumber,
        variantName: item.variantName,
        quantity: item.quantity,
      });
    }
  });

  // B. Backfill from local order history (cnm_local_orders) if available
  if (lastOrderedMap.size === 0) {
    const localOrders = getLocalOrders();
    for (const order of localOrders) {
      if (!order.itemsSummary) continue;
      // itemsSummary is e.g. "2x Classic Cheeseburger, 1x Oklahoma Smash"
      for (const prod of allProducts) {
        if (
          order.itemsSummary.toLowerCase().includes(prod.name.toLowerCase()) &&
          !lastOrderedMap.has(prod.id)
        ) {
          lastOrderedMap.set(prod.id, {
            product: prod,
            orderedAt: order.createdAt,
            orderNumber: order.orderNumber,
          });
        }
      }
    }
  }

  // 2. Resolve Frequently Visited Products
  const visitedEntries = Object.values(store.visitedItems)
    .filter((v) => v.visitCount > 0)
    .sort((a, b) => b.visitCount - a.visitCount || new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime());

  const visitedList: Array<{ product: Product; visitCount: number; lastVisitedAt?: string }> = [];
  const visitedSet = new Set<string>();

  visitedEntries.forEach((entry) => {
    const prod = productMap.get(entry.productId) || allProducts.find((p) => p.id === entry.productId);
    if (prod && !visitedSet.has(prod.id)) {
      visitedSet.add(prod.id);
      visitedList.push({
        product: prod,
        visitCount: entry.visitCount,
        lastVisitedAt: entry.lastVisitedAt,
      });
    }
  });

  const lastOrderedList = Array.from(lastOrderedMap.values());
  const hasHistory = lastOrderedList.length > 0 || visitedList.length > 0;

  return {
    lastOrderedProducts: lastOrderedList,
    frequentlyVisitedProducts: visitedList,
    hasHistory,
    userPhone: store.userPhone,
  };
}

/**
 * Clear history for a specific user
 */
export function clearUserHistory(userKeyInput?: string | null): void {
  const userKey = normalizeUserKey(userKeyInput);
  const storageKey = `${STORAGE_PREFIX}${userKey}`;
  delete memoryHistoryCache[userKey];

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
  }
}
