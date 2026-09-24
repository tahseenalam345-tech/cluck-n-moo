"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { BrandLogo } from "@/components/BrandLogo";
import { getLocalOrders, LocalOrderRecord, updateLocalOrderStatus } from "@/lib/orderHistory";
import { CartItem } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import { OrderTrackTimeline } from "@/components/OrderTrackTimeline";
import {
  Clock,
  PhoneCall,
  MapPin,
  CheckCircle2,
  Bike,
  ChefHat,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";

interface OrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  unitPricePkr: number;
  quantity: number;
  lineTotalPkr: number;
  customDealId?: string;
  modifiers?: { id?: string; modifierName?: string; name?: string; pricePkr: number }[];
}

interface OrderDetailHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
  createdAt: string;
}

interface DetailedOrder {
  id: string;
  orderNumber: string;
  trackingToken: string;
  orderType: "DELIVERY" | "TAKEAWAY" | "DINE_IN" | string;
  status: string;
  paymentMethod: string;
  paymentStatus?: string;
  paymentLocation?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAreaName?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  dineInPreferredTime?: string;
  specialInstructions?: string;
  subtotalPkr: number;
  deliveryFeePkr: number;
  discountPkr?: number;
  discountRate?: number;
  discountType?: string;
  customDealSubtotalPkr?: number;
  totalPkr: number;
  cancellationReason?: string;
  createdAt: string;
  items: OrderDetailItem[];
  history: OrderDetailHistory[];
}

const TIMELINE_STEPS = [
  { key: ORDER_STATUSES.NEW, label: "Placed", short: "Placed" },
  { key: ORDER_STATUSES.CONFIRMED, label: "Confirmed", short: "Confirmed" },
  { key: ORDER_STATUSES.PREPARING, label: "Preparing", short: "Preparing" },
  { key: ORDER_STATUSES.READY, label: "Ready", short: "Ready" },
  { key: ORDER_STATUSES.OUT_FOR_DELIVERY, label: "Out for Delivery", short: "Dispatched", deliveryOnly: true },
  { key: ORDER_STATUSES.COMPLETED, label: "Completed", short: "Completed" },
];

export default function TrackOrderPage() {
  const router = useRouter();

  // Local device orders
  const [localOrders, setLocalOrders] = useState<LocalOrderRecord[]>([]);
  const [hasLoadedLocal, setHasLoadedLocal] = useState(false);

  // Selected order details for live view
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [detailedOrder, setDetailedOrder] = useState<DetailedOrder | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Cart drawer integration for "Order Again"
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderAgainNotice, setOrderAgainNotice] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Secondary manual lookup
  const [manualToken, setManualToken] = useState("");
  const [manualLookupError, setManualLookupError] = useState<string | null>(null);
  const [showManualLookup, setShowManualLookup] = useState(false);

  // Load local orders on mount
  useEffect(() => {
    const orders = getLocalOrders();
    setLocalOrders(orders);
    setHasLoadedLocal(true);

    // Auto-select the first active order, or the newest one
    if (orders.length > 0) {
      const activeOrder = orders.find((o) => o.currentStatus !== ORDER_STATUSES.COMPLETED && o.currentStatus !== ORDER_STATUSES.CANCELLED);
      setSelectedToken(activeOrder ? activeOrder.trackingToken : orders[0].trackingToken);
    }
  }, []);

  // Fetch detailed tracking info when selectedToken changes
  const loadOrderDetail = useCallback(async (token: string, silent = false) => {
    if (!silent) setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await fetch(`/api/v1/orders/${token}/track`);
      const data = await res.json();

      if (data.success && data.data) {
        setDetailedOrder(data.data);
        // Sync back status in local history
        if (data.data.trackingToken && data.data.status) {
          updateLocalOrderStatus(data.data.trackingToken, data.data.status);
          setLocalOrders((prev) =>
            prev.map((o) => (o.trackingToken === data.data.trackingToken ? { ...o, currentStatus: data.data.status } : o))
          );
        }
      } else {
        setDetailError(data.error?.message || "Order details could not be found.");
      }
    } catch {
      setDetailError("Unable to connect to order tracking service. Please try again.");
    } finally {
      if (!silent) setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedToken) {
      loadOrderDetail(selectedToken);

      // Periodic fast poll every 3 seconds for active live orders
      const interval = setInterval(() => {
        loadOrderDetail(selectedToken, true);
      }, 3000);

      return () => clearInterval(interval);
    } else {
      setDetailedOrder(null);
    }
  }, [selectedToken, loadOrderDetail]);

  // Manual lookup handler
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualToken.trim();
    if (!clean) {
      setManualLookupError("Please enter your Order Number (e.g. CNM-2609-1234) or Tracking Token.");
      return;
    }
    router.push(`/order/track/${clean}`);
  };

  // Order Again handler: reconstruct cart from current database menu prices
  const handleOrderAgain = async (orderToReorder: DetailedOrder | LocalOrderRecord) => {
    setIsReordering(true);
    setOrderAgainNotice(null);

    try {
      // Fetch full order detail if we only have the local summary record
      let targetOrder: DetailedOrder;
      if ("items" in orderToReorder && orderToReorder.items) {
        targetOrder = orderToReorder;
      } else {
        const orderRes = await fetch(`/api/v1/orders/${orderToReorder.trackingToken}/track`);
        const orderData = await orderRes.json();
        if (!orderData.success || !orderData.data) {
          throw new Error("Unable to fetch historical order details.");
        }
        targetOrder = orderData.data;
      }

      // Fetch current database menu
      const menuRes = await fetch("/api/v1/menu");
      const menuData = await menuRes.json();

      if (!menuRes.ok || !menuData.success || !menuData.data?.categories) {
        throw new Error("Failed to load current menu to verify availability.");
      }

      // Flatten active products
      const allActiveProducts: any[] = menuData.data.categories.flatMap((c: any) => c.products || []);

      const newCartItems: CartItem[] = [];
      const skippedItems: string[] = [];
      const priceChanges: string[] = [];

      for (const item of targetOrder.items) {
        const product = allActiveProducts.find((p) => p.id === item.productId && p.isAvailable);

        if (!product) {
          skippedItems.push(item.productName);
          continue;
        }

        let unitPricePkr = product.basePricePkr;
        let selectedVariant: any = null;

        // Verify variant if applicable
        if (item.variantName) {
          const variant = product.variants?.find((v: any) => v.name === item.variantName && v.isAvailable);
          if (!variant) {
            skippedItems.push(`${item.productName} (${item.variantName})`);
            continue;
          }
          selectedVariant = variant;
          unitPricePkr = variant.pricePkr;
        }

        // Price change detection
        if (unitPricePkr !== item.unitPricePkr) {
          priceChanges.push(`${product.name}: ${item.unitPricePkr} -> ${unitPricePkr} PKR`);
        }

        // Verify modifiers if applicable
        const activeModifiers: any[] = [];
        if (item.modifiers && item.modifiers.length > 0) {
          const availableModifiers = product.modifierGroups?.flatMap((g: any) => g.modifiers || []) || [];
          for (const oldMod of item.modifiers) {
            const modName = oldMod.modifierName || oldMod.name;
            const validMod = availableModifiers.find((m: any) => m.name === modName && m.isAvailable);
            if (validMod) {
              activeModifiers.push(validMod);
              unitPricePkr += validMod.pricePkr;
            }
          }
        }

        const lineTotalPkr = unitPricePkr * item.quantity;

        newCartItems.push({
          cartItemId: `reorder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productId: product.id,
          productName: product.name,
          variantId: selectedVariant?.id,
          variantName: selectedVariant?.name,
          unitPricePkr,
          quantity: item.quantity,
          lineTotalPkr,
          modifiers: activeModifiers,
          customDealId: undefined, // Custom deal discounts are re-evaluated if re-added
        });
      }

      if (newCartItems.length === 0) {
        setOrderAgainNotice({
          message: "All items from this past order are currently out of stock or unavailable.",
          type: "warning",
        });
        return;
      }

      // Add verified items to cart
      setCartItems((prev) => [...prev, ...newCartItems]);
      setIsCartOpen(true);

      let msg = `Added ${newCartItems.reduce((acc, i) => acc + i.quantity, 0)} item(s) to your tray at current menu prices!`;
      if (skippedItems.length > 0) {
        msg += ` Skipped unavailable: ${skippedItems.join(", ")}.`;
      }
      if (priceChanges.length > 0) {
        msg += ` Updated prices applied.`;
      }

      setOrderAgainNotice({
        message: msg,
        type: skippedItems.length > 0 ? "warning" : "success",
      });
    } catch (err: any) {
      setOrderAgainNotice({
        message: err.message || "Failed to reconstruct order into tray.",
        type: "warning",
      });
    } finally {
      setIsReordering(false);
    }
  };

  // Helper to format timestamps
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-PK", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Find actual transition timestamp from history
  const getStepTimestamp = (stepKey: string, order: DetailedOrder) => {
    if (stepKey === ORDER_STATUSES.NEW) {
      return formatDateTime(order.createdAt);
    }
    const transition = order.history?.find((h) => h.toStatus === stepKey);
    return transition ? formatDateTime(transition.createdAt) : null;
  };

  // Status visual badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case ORDER_STATUSES.NEW:
        return { label: "Placed", bg: "rgba(245, 158, 11, 0.15)", color: "var(--status-new)", border: "var(--status-new)" };
      case ORDER_STATUSES.CONFIRMED:
        return { label: "Confirmed", bg: "rgba(59, 130, 246, 0.15)", color: "var(--status-confirmed)", border: "var(--status-confirmed)" };
      case ORDER_STATUSES.PREPARING:
        return { label: "Sizzling in Kitchen", bg: "rgba(255, 130, 67, 0.18)", color: "var(--cnm-orange)", border: "var(--cnm-orange)" };
      case ORDER_STATUSES.READY:
        return { label: "Ready", bg: "rgba(16, 185, 129, 0.18)", color: "var(--status-ready)", border: "var(--status-ready)" };
      case ORDER_STATUSES.OUT_FOR_DELIVERY:
        return { label: "Out for Delivery", bg: "rgba(236, 72, 153, 0.18)", color: "var(--status-delivery)", border: "var(--status-delivery)" };
      case ORDER_STATUSES.COMPLETED:
        return { label: "Completed", bg: "rgba(16, 185, 129, 0.12)", color: "var(--status-ready)", border: "rgba(16, 185, 129, 0.3)" };
      case ORDER_STATUSES.CANCELLED:
        return { label: "Cancelled", bg: "rgba(239, 68, 68, 0.15)", color: "var(--status-cancelled)", border: "var(--status-cancelled)" };
      default:
        return { label: status, bg: "var(--cnm-surface-elevated)", color: "var(--cnm-text-muted)", border: "var(--cnm-border)" };
    }
  };

  const cartCount = cartItems.reduce((acc, itm) => acc + itm.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, itm) => acc + itm.lineTotalPkr, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--cnm-bg)" }}>
      <CustomerHeader
        cartCount={cartCount}
        cartTotalPkr={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main style={{ flex: 1, padding: "28px 0 60px" }}>
        <div className="container" style={{ maxWidth: "860px" }}>

          {/* 1. TOP CENTER: CNM Brand Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "8px" }}>
              <BrandLogo size="md" showTagline={false} />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 900,
                color: "var(--cnm-text-primary)",
                margin: "4px 0 2px",
                letterSpacing: "0.02em",
              }}
            >
              Cluck N Moo
            </h1>
            <p
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "18px",
                color: "var(--cnm-orange)",
                margin: 0,
                fontWeight: 700,
              }}
            >
              juiciest in town
            </p>
          </div>

          {/* 2. RESTAURANT CONTACT SECTION */}
          <div
            className="card"
            style={{
              padding: "18px 22px",
              marginBottom: "28px",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", maxWidth: "560px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255, 130, 67, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cnm-orange)",
                  flexShrink: 0,
                }}
              >
                <MapPin size={22} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "14.5px",
                    fontWeight: 800,
                    color: "var(--cnm-text-primary)",
                    marginBottom: "3px",
                  }}
                >
                  Cluck N Moo Kharian Branch
                </h2>
                <p style={{ fontSize: "12.5px", color: "var(--cnm-text-muted)", margin: "0 0 4px", lineHeight: 1.4 }}>
                  Main GT Road, near Total Petrol Station / Raza CNG, Kharian, Pakistan
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--cnm-text-subtle)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={13} color="var(--cnm-orange)" /> Daily: 12:01 PM – 02:00 AM
                  </span>
                  <span>•</span>
                  <span>0302-1949067</span>
                </div>
              </div>
            </div>

            <a
              href="tel:03021949067"
              className="btn btn-primary"
              style={{
                padding: "10px 18px",
                fontSize: "13.5px",
                fontWeight: 800,
                borderRadius: "var(--radius-full)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <PhoneCall size={16} />
              <span>Call Branch</span>
            </a>
          </div>

          {/* Feedback Notice for Order Again */}
          {orderAgainNotice && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor:
                  orderAgainNotice.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                border: `1px solid ${
                  orderAgainNotice.type === "success" ? "var(--status-ready)" : "var(--status-new)"
                }`,
                color: orderAgainNotice.type === "success" ? "var(--status-ready)" : "var(--status-new)",
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {orderAgainNotice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{orderAgainNotice.message}</span>
            </div>
          )}

          {/* 3. RECENT ORDERS SECTION */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 850, color: "var(--cnm-text-primary)" }}>
                  Your Recent Orders
                </h2>
                {localOrders.length > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      backgroundColor: "var(--cnm-surface-elevated)",
                      color: "var(--cnm-text-muted)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      border: "1px solid var(--cnm-border)",
                    }}
                  >
                    This Device
                  </span>
                )}
              </div>

              {localOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectedToken && loadOrderDetail(selectedToken, true)}
                  disabled={isLoadingDetail}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "var(--cnm-text-muted)",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  <RefreshCw size={13} className={isLoadingDetail ? "spin" : ""} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {hasLoadedLocal && localOrders.length === 0 ? (
              /* EMPTY STATE */
              <div
                className="card"
                style={{
                  padding: "44px 20px",
                  textAlign: "center",
                  backgroundColor: "var(--cnm-surface)",
                  border: "1px dashed var(--cnm-border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 130, 67, 0.1)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--cnm-orange)",
                    marginBottom: "14px",
                  }}
                >
                  <ShoppingBag size={28} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--cnm-text-primary)", marginBottom: "6px" }}>
                  No Recent Orders Found
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--cnm-text-muted)", maxWidth: "420px", margin: "0 auto 20px" }}>
                  You haven&apos;t placed any orders on this device yet. Browse our verified menu or build a custom deal to get started!
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                  <Link
                    href="/"
                    className="btn btn-primary"
                    style={{ padding: "11px 22px", fontSize: "14px", fontWeight: 800, borderRadius: "var(--radius-full)" }}
                  >
                    <span>Start an Order</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/deals"
                    className="btn btn-secondary"
                    style={{ padding: "11px 20px", fontSize: "14px", fontWeight: 700, borderRadius: "var(--radius-full)" }}
                  >
                    <span>Build Your Own Deal</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* LIST OF LOCAL DEVICE ORDERS */
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                {localOrders.map((order) => {
                  const isSelected = selectedToken === order.trackingToken;
                  const isCompleted = order.currentStatus === ORDER_STATUSES.COMPLETED;
                  const badge = getStatusBadge(order.currentStatus);

                  return (
                    <div
                      key={order.trackingToken}
                      className="card"
                      onClick={() => setSelectedToken(order.trackingToken)}
                      style={{
                        padding: "16px 18px",
                        backgroundColor: isSelected
                          ? "var(--cnm-surface-elevated)"
                          : isCompleted
                          ? "rgba(23, 23, 23, 0.65)"
                          : "var(--cnm-surface)",
                        border: isSelected
                          ? "1.5px solid var(--cnm-orange)"
                          : "1px solid var(--cnm-border)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        opacity: isCompleted && !isSelected ? 0.85 : 1,
                        transition: "all 0.15s ease-in-out",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "16px",
                                fontWeight: 900,
                                color: "var(--cnm-text-primary)",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {order.orderNumber}
                            </span>

                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "2px 7px",
                                borderRadius: "var(--radius-xs)",
                                backgroundColor:
                                  order.orderType === "delivery"
                                    ? "rgba(255, 130, 67, 0.15)"
                                    : order.orderType === "dine_in"
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(16, 185, 129, 0.15)",
                                color:
                                  order.orderType === "delivery"
                                    ? "var(--cnm-orange)"
                                    : order.orderType === "dine_in"
                                    ? "var(--status-confirmed)"
                                    : "var(--status-ready)",
                              }}
                            >
                              {order.orderType.replace("_", " ")}
                            </span>
                          </div>

                          <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)" }}>
                            {formatDateTime(order.createdAt)}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                              padding: "3px 9px",
                              borderRadius: "var(--radius-full)",
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: badge.color,
                              }}
                            />
                            {badge.label}
                          </span>

                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "16px",
                              fontWeight: 900,
                              color: "var(--cnm-orange)",
                            }}
                          >
                            {order.finalTotalPkr.toLocaleString()} PKR
                          </span>
                        </div>
                      </div>

                      {/* Items preview snippet */}
                      <div
                        style={{
                          fontSize: "12.5px",
                          color: isCompleted ? "var(--cnm-text-subtle)" : "var(--cnm-text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {order.itemsSummary || `${order.itemCount} item(s)`}
                      </div>

                      {/* Actions Bar for Card */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--cnm-border)",
                          fontSize: "12px",
                        }}
                      >
                        <span style={{ color: isSelected ? "var(--cnm-orange)" : "var(--cnm-text-muted)", fontWeight: 700 }}>
                          {isSelected ? "● Viewing live tracking below" : "Tap to view live tracking"}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderAgain(order);
                              }}
                              disabled={isReordering}
                              className="btn btn-secondary"
                              style={{
                                padding: "4px 12px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                borderRadius: "var(--radius-full)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <RefreshCw size={12} className={isReordering ? "spin" : ""} />
                              <span>Order Again</span>
                            </button>
                          )}
                          <ChevronDown
                            size={16}
                            color={isSelected ? "var(--cnm-orange)" : "var(--cnm-text-muted)"}
                            style={{
                              transform: isSelected ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4 & 5. SELECTED ORDER DETAIL & LIVE TIMELINE */}
          {selectedToken && (
            <div
              id="selected-order-details"
              style={{
                backgroundColor: "var(--cnm-surface)",
                border: "1.5px solid var(--cnm-border)",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                marginBottom: "32px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              {isLoadingDetail && !detailedOrder ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <RefreshCw className="spin" size={32} color="var(--cnm-orange)" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)" }}>Loading order details...</p>
                </div>
              ) : detailError ? (
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <AlertTriangle size={36} color="var(--status-cancelled)" style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ fontSize: "16px", color: "var(--cnm-text-primary)", marginBottom: "6px" }}>
                    Unable to Load Order
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", marginBottom: "16px" }}>{detailError}</p>
                  <button
                    type="button"
                    onClick={() => loadOrderDetail(selectedToken)}
                    className="btn btn-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Try Again
                  </button>
                </div>
              ) : detailedOrder ? (
                <div>
                  {/* Detailed Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginBottom: "20px",
                      borderBottom: "1px solid var(--cnm-border)",
                      paddingBottom: "16px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Order Reference
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "var(--radius-xs)",
                            backgroundColor: "var(--cnm-surface-elevated)",
                            color: "var(--cnm-text-secondary)",
                            border: "1px solid var(--cnm-border)",
                          }}
                        >
                          {detailedOrder.orderType}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "24px",
                          fontWeight: 900,
                          color: "var(--cnm-text-primary)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {detailedOrder.orderNumber}
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)" }}>
                        Placed on {formatDateTime(detailedOrder.createdAt)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {detailedOrder.status === ORDER_STATUSES.COMPLETED && (
                        <button
                          type="button"
                          onClick={() => handleOrderAgain(detailedOrder)}
                          disabled={isReordering}
                          className="btn btn-primary"
                          style={{
                            padding: "8px 16px",
                            fontSize: "13px",
                            fontWeight: 800,
                            borderRadius: "var(--radius-full)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <RefreshCw size={14} className={isReordering ? "spin" : ""} />
                          <span>{isReordering ? "Verifying..." : "Order Again"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. CURRENT STATUS CARD */}
                  {(() => {
                    const badge = getStatusBadge(detailedOrder.status);
                    return (
                      <div
                        style={{
                          backgroundColor: badge.bg,
                          border: `1.5px solid ${badge.border}`,
                          borderRadius: "var(--radius-md)",
                          padding: "16px 20px",
                          marginBottom: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {detailedOrder.status === ORDER_STATUSES.COMPLETED ? (
                            <CheckCircle2 size={24} color={badge.color} />
                          ) : detailedOrder.status === ORDER_STATUSES.PREPARING ? (
                            <ChefHat size={24} color={badge.color} />
                          ) : detailedOrder.status === ORDER_STATUSES.OUT_FOR_DELIVERY ? (
                            <Bike size={24} color={badge.color} />
                          ) : detailedOrder.status === ORDER_STATUSES.CANCELLED ? (
                            <AlertTriangle size={24} color={badge.color} />
                          ) : (
                            <Clock size={24} color={badge.color} />
                          )}
                          <div>
                            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: badge.color, letterSpacing: "0.05em" }}>
                              CURRENT ORDER STATUS
                            </span>
                            <h4
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "18px",
                                fontWeight: 900,
                                color: "var(--cnm-text-primary)",
                                margin: "2px 0 0",
                              }}
                            >
                              {badge.label}
                            </h4>
                          </div>
                        </div>

                        {detailedOrder.cancellationReason && (
                          <div style={{ fontSize: "12px", color: "var(--status-cancelled)", fontWeight: 600 }}>
                            Reason: {detailedOrder.cancellationReason}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* STATUS TIMELINE TRAIN TRACK */}
                  {detailedOrder.status !== ORDER_STATUSES.CANCELLED && (
                    <div style={{ marginBottom: "20px" }}>
                      <OrderTrackTimeline order={detailedOrder as any} />
                    </div>
                  )}

                  {/* 5. ORDER DETAILS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                      marginBottom: "24px",
                    }}
                  >
                    {/* Fulfillment Details */}
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "var(--cnm-surface-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--cnm-border)",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "var(--cnm-orange)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "12px",
                        }}
                      >
                        {detailedOrder.orderType === "DELIVERY"
                          ? "Delivery Destination"
                          : detailedOrder.orderType === "DINE_IN"
                          ? "Dine-In Details"
                          : "Takeaway Pickup"}
                      </h4>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        {detailedOrder.customerName && (
                          <div>
                            <span style={{ color: "var(--cnm-text-muted)" }}>Recipient: </span>
                            <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                              {detailedOrder.customerName}
                            </span>
                          </div>
                        )}

                        {detailedOrder.customerPhone && (
                          <div>
                            <span style={{ color: "var(--cnm-text-muted)" }}>Contact: </span>
                            <span style={{ color: "var(--cnm-orange)", fontWeight: 700 }}>
                              {detailedOrder.customerPhone}
                            </span>
                          </div>
                        )}

                        {detailedOrder.orderType === "DELIVERY" && (
                          <>
                            {detailedOrder.deliveryAreaName && (
                              <div>
                                <span style={{ color: "var(--cnm-text-muted)" }}>Area: </span>
                                <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                                  {detailedOrder.deliveryAreaName}
                                </span>
                              </div>
                            )}
                            {detailedOrder.deliveryAddress && (
                              <div>
                                <span style={{ color: "var(--cnm-text-muted)" }}>Address: </span>
                                <span style={{ color: "var(--cnm-text-primary)" }}>
                                  {detailedOrder.deliveryAddress}
                                </span>
                              </div>
                            )}
                            {detailedOrder.deliveryLandmark && (
                              <div>
                                <span style={{ color: "var(--cnm-text-muted)" }}>Landmark: </span>
                                <span style={{ color: "var(--cnm-text-secondary)" }}>
                                  {detailedOrder.deliveryLandmark}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {detailedOrder.orderType === "TAKEAWAY" && (
                          <div>
                            <span style={{ color: "var(--cnm-text-muted)" }}>Pickup Branch: </span>
                            <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                              CNM Kharian (Main GT Road)
                            </span>
                          </div>
                        )}

                        {detailedOrder.orderType === "DINE_IN" && (
                          <>
                            {detailedOrder.dineInPreferredTime && (
                              <div>
                                <span style={{ color: "var(--cnm-text-muted)" }}>Expected Arrival: </span>
                                <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                                  {detailedOrder.dineInPreferredTime}
                                </span>
                              </div>
                            )}
                            {detailedOrder.paymentLocation && (
                              <div>
                                <span style={{ color: "var(--cnm-text-muted)" }}>Settlement: </span>
                                <span style={{ color: "var(--cnm-text-secondary)", fontWeight: 700 }}>
                                  {detailedOrder.paymentLocation === "AT_COUNTER" ? "Pay at Counter" : "Pay on Table"}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {detailedOrder.specialInstructions && (
                          <div style={{ paddingTop: "6px", borderTop: "1px dashed var(--cnm-border)" }}>
                            <span style={{ color: "var(--cnm-text-muted)" }}>Special Note: </span>
                            <span style={{ color: "var(--cnm-text-secondary)", fontStyle: "italic" }}>
                              {detailedOrder.specialInstructions}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "var(--cnm-surface-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--cnm-border)",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "var(--cnm-orange)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "12px",
                        }}
                      >
                        Payment Method
                      </h4>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="badge badge-orange" style={{ fontWeight: 800 }}>
                            CASH ONLY
                          </span>
                          <span style={{ color: "var(--cnm-text-secondary)" }}>
                            {detailedOrder.paymentMethod || "Cash on Delivery / Pickup"}
                          </span>
                        </div>
                        {detailedOrder.paymentStatus && (
                          <div>
                            <span style={{ color: "var(--cnm-text-muted)" }}>Payment Status: </span>
                            <span
                              style={{
                                fontWeight: 700,
                                color: detailedOrder.paymentStatus === "PAID" ? "var(--status-ready)" : "var(--status-new)",
                              }}
                            >
                              {detailedOrder.paymentStatus}
                            </span>
                          </div>
                        )}
                        <p style={{ fontSize: "12px", color: "var(--cnm-text-muted)", margin: "4px 0 0" }}>
                          CNM accepts cash settlement upon physical handoff at your door or counter.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Products Receipt Snapshot */}
                  <div
                    style={{
                      border: "1px solid var(--cnm-border)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "var(--cnm-surface-elevated)",
                        borderBottom: "1px solid var(--cnm-border)",
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--cnm-text-muted)",
                      }}
                    >
                      Ordered Items
                    </div>

                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {detailedOrder.items?.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            paddingBottom: "10px",
                            borderBottom: "1px solid var(--cnm-border)",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)", fontSize: "14px" }}>
                                {item.quantity}x {item.productName}
                              </span>
                              {item.customDealId && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    backgroundColor: "rgba(255, 130, 67, 0.15)",
                                    color: "var(--cnm-orange)",
                                    border: "1px solid rgba(255, 130, 67, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-full)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <Sparkles size={9} /> CUSTOM DEAL
                                </span>
                              )}
                            </div>

                            {item.variantName && (
                              <span style={{ display: "block", fontSize: "12px", color: "var(--cnm-orange)", fontWeight: 700 }}>
                                • {item.variantName}
                              </span>
                            )}

                            {item.modifiers && item.modifiers.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                {item.modifiers.map((m, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "11px",
                                      backgroundColor: "var(--cnm-surface-elevated)",
                                      color: "var(--cnm-text-muted)",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    +{m.modifierName || m.name} ({m.pricePkr} PKR)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--cnm-orange)", fontSize: "14.5px" }}>
                            {item.lineTotalPkr.toLocaleString()} PKR
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price Summary Breakdown */}
                    <div
                      style={{
                        padding: "14px 16px",
                        backgroundColor: "var(--cnm-surface-elevated)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        fontSize: "13.5px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
                        <span>Food Subtotal</span>
                        <span style={{ fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                          {detailedOrder.subtotalPkr.toLocaleString()} PKR
                        </span>
                      </div>

                      {detailedOrder.discountPkr && detailedOrder.discountPkr > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--status-ready)",
                            backgroundColor: "rgba(16, 185, 129, 0.08)",
                            padding: "6px 8px",
                            borderRadius: "var(--radius-xs)",
                            border: "1px dashed var(--status-ready)",
                          }}
                        >
                          <span style={{ fontWeight: 750 }}>
                            Custom Deal Discount ({detailedOrder.discountRate ? Math.round(detailedOrder.discountRate * 100) : 0}% OFF)
                          </span>
                          <span style={{ fontWeight: 850 }}>
                            -{detailedOrder.discountPkr.toLocaleString()} PKR
                          </span>
                        </div>
                      ) : null}

                      {detailedOrder.orderType === "DELIVERY" && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
                          <span>Delivery Fee ({detailedOrder.deliveryAreaName || "Kharian Area"})</span>
                          <span style={{ fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                            {detailedOrder.deliveryFeePkr.toLocaleString()} PKR
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: "8px",
                          borderTop: "1px dashed var(--cnm-border)",
                          fontSize: "16px",
                          fontWeight: 900,
                        }}
                      >
                        <span style={{ color: "var(--cnm-text-primary)" }}>Final Cash Total</span>
                        <span style={{ fontFamily: "var(--font-display)", color: "var(--cnm-orange)", fontSize: "19px" }}>
                          {detailedOrder.totalPkr.toLocaleString()} PKR
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Again CTA for Completed Order */}
                  {detailedOrder.status === ORDER_STATUSES.COMPLETED && (
                    <div style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleOrderAgain(detailedOrder)}
                        disabled={isReordering}
                        className="btn btn-primary"
                        style={{
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: 800,
                          borderRadius: "var(--radius-full)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <RefreshCw size={16} className={isReordering ? "spin" : ""} />
                        <span>{isReordering ? "Verifying Current Prices..." : "Order Again with Current Prices"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* 7. SECONDARY MANUAL LOOKUP SECTION (FOR PRIVATE WINDOWS OR OTHER DEVICES) */}
          <div
            className="card"
            style={{
              padding: "18px 20px",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setShowManualLookup(!showManualLookup)}
            >
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-text-primary)", margin: 0 }}>
                  Looking for an order from another device or private window?
                </h3>
                <p style={{ fontSize: "12px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                  Track manually with your Order Number (e.g. CNM-2609-1234) or tracking link.
                </p>
              </div>

              <ChevronDown
                size={18}
                color="var(--cnm-text-muted)"
                style={{
                  transform: showManualLookup ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  flexShrink: 0,
                }}
              />
            </div>

            {showManualLookup && (
              <form onSubmit={handleManualSearch} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Enter CNM-2609-XXXX or trk_..."
                    value={manualToken}
                    onChange={(e) => {
                      setManualToken(e.target.value);
                      setManualLookupError(null);
                    }}
                    style={{ flex: 1, minWidth: "220px", fontSize: "14px" }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: "10px 20px", fontSize: "13.5px", fontWeight: 800 }}
                  >
                    <span>Track Order</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
                {manualLookupError && (
                  <span style={{ fontSize: "12px", color: "var(--status-cancelled)" }}>{manualLookupError}</span>
                )}
              </form>
            )}
          </div>

        </div>
      </main>

      {/* Cart Drawer for Order Again workflow */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={(id) => setCartItems((prev) => prev.filter((i) => i.cartItemId !== id))}
        onUpdateQuantity={(id, q) =>
          setCartItems((prev) =>
            prev.map((i) => (i.cartItemId === id ? { ...i, quantity: q, lineTotalPkr: i.unitPricePkr * q } : i))
          )
        }
        onQuickAddUpsell={() => {}}
        onClearCart={() => setCartItems([])}
      />

      <CustomerFooter />
    </div>
  );
}
