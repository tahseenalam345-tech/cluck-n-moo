export interface LocalOrderItemSummary {
  name: string;
  quantity: number;
  variantName?: string;
  lineTotalPkr: number;
}

export interface LocalOrderRecord {
  orderId: string;
  trackingToken: string;
  orderNumber: string;
  createdAt: string;
  orderType: "delivery" | "takeaway" | "dine_in";
  currentStatus: string;
  finalTotalPkr: number;
  itemCount: number;
  itemsSummary: string;
  discountPkr?: number;
}

const LOCAL_ORDERS_KEY = "cnm_local_orders";
const MAX_ORDERS_LIMIT = 10;

/**
 * Retrieve recent orders placed from the current device / browser.
 * Sorted newest first.
 */
export function getLocalOrders(): LocalOrderRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed: LocalOrderRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Ensure valid entries and sort newest first
    return parsed
      .filter((o) => o && o.trackingToken && o.orderNumber)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_ORDERS_LIMIT);
  } catch (err) {
    console.error("Failed to read local orders from localStorage", err);
    return [];
  }
}

/**
 * Save a newly placed order to local device history.
 * Caps at MAX_ORDERS_LIMIT and eliminates duplicates.
 */
export function saveLocalOrder(record: LocalOrderRecord): void {
  if (typeof window === "undefined") return;

  try {
    const current = getLocalOrders();
    // Remove if already exists (deduplicate by trackingToken or orderId)
    const filtered = current.filter(
      (o) => o.trackingToken !== record.trackingToken && o.orderId !== record.orderId
    );

    // Prepend newest order and enforce limit
    const updated = [record, ...filtered].slice(0, MAX_ORDERS_LIMIT);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local order to localStorage", err);
  }
}

/**
 * Update the status of an existing local order when refreshed or tracked.
 */
export function updateLocalOrderStatus(trackingToken: string, status: string): void {
  if (typeof window === "undefined" || !trackingToken) return;

  try {
    const current = getLocalOrders();
    const index = current.findIndex((o) => o.trackingToken === trackingToken);
    if (index !== -1) {
      current[index].currentStatus = status;
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error("Failed to update local order status in localStorage", err);
  }
}

/**
 * Remove an order from local device history.
 */
export function removeLocalOrder(trackingToken: string): void {
  if (typeof window === "undefined" || !trackingToken) return;

  try {
    const current = getLocalOrders();
    const updated = current.filter((o) => o.trackingToken !== trackingToken);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to remove local order from localStorage", err);
  }
}
