"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { createClient } from "@/lib/supabase/client";
import { getLocalOrders } from "@/lib/orderHistory";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import { CartItem } from "@/types";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Bike,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Utensils,
  Phone,
  Flame,
  AlertCircle,
  User,
  ShieldCheck,
  Check,
} from "lucide-react";
import { ExternalLinkIcon } from "@/components/admin/AdminIcons";

interface OrderModifier {
  name: string;
  pricePkr: number;
}

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string | null;
  unitPricePkr: number;
  quantity: number;
  lineTotalPkr: number;
  modifiers?: OrderModifier[];
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  trackingToken: string;
  orderType: "DELIVERY" | "TAKEAWAY" | "DINE_IN" | string;
  status: string;
  totalPkr: number;
  subtotalPkr?: number;
  deliveryFeePkr?: number;
  discountPkr?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryAddress?: string | null;
  deliveryAreaName?: string | null;
  deliveryLandmark?: string | null;
  dineInPreferredTime?: string | null;
  specialInstructions?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const ACTIVE_STATUSES = new Set<string>([
  ORDER_STATUSES.NEW,
  ORDER_STATUSES.CONFIRMED,
  ORDER_STATUSES.PREPARING,
  ORDER_STATUSES.READY,
  ORDER_STATUSES.OUT_FOR_DELIVERY,
]);

export default function TrackOrderPage() {
  const router = useRouter();

  // Auth & customer states
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Orders data
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Expanded card state: set of expanded order IDs (default: all collapsed)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  // Direct manual lookup (for guests or quick lookup)
  const [manualQuery, setManualQuery] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isManualSearching, setIsManualSearching] = useState(false);

  // Cart state for "Order Again"
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Quick Inline Sign-In state for non-authenticated guests
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Fetch real authenticated customer orders
  const loadCustomerOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingOrders(true);
    else setIsRefreshing(true);
    setOrdersError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);

      if (user) {
        // Automatically claim any guest tokens saved locally to this account
        try {
          const localOrders = getLocalOrders();
          const tokens = localOrders.map((o) => o.trackingToken).filter(Boolean);
          if (tokens.length > 0) {
            await fetch("/api/v1/account/claim-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trackingTokens: tokens }),
            });
          }
        } catch {
          // ignore local claim failures
        }

        // Fetch real database orders for this customer
        const res = await fetch("/api/v1/account/orders");
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        } else {
          setOrdersError(json.error?.message || "Failed to load recent orders.");
        }
      } else {
        // User not logged in - check if there are recent guest orders placed on this device
        const local = getLocalOrders();
        if (local.length > 0) {
          // Fetch full real details for these local orders via track API
          const fetchedOrders: CustomerOrder[] = [];
          for (const rec of local.slice(0, 5)) {
            try {
              const res = await fetch(
                `/api/v1/orders/${encodeURIComponent(rec.trackingToken)}/track?token=${encodeURIComponent(rec.trackingToken)}`
              );
              const trackData = await res.json();
              if (trackData.success && trackData.data) {
                const o = trackData.data;
                fetchedOrders.push({
                  id: o.id,
                  orderNumber: o.orderNumber,
                  trackingToken: o.trackingToken,
                  orderType: o.orderType,
                  status: o.status,
                  totalPkr: o.totalPkr,
                  subtotalPkr: o.subtotalPkr,
                  deliveryFeePkr: o.deliveryFeePkr,
                  discountPkr: o.discountPkr,
                  paymentMethod: o.paymentMethod,
                  paymentStatus: o.paymentStatus,
                  deliveryAddress: o.deliveryAddress,
                  deliveryAreaName: o.deliveryAreaName,
                  deliveryLandmark: o.deliveryLandmark,
                  dineInPreferredTime: o.dineInPreferredTime,
                  specialInstructions: o.specialInstructions,
                  customerName: o.customerName,
                  customerPhone: o.customerPhone,
                  cancellationReason: o.cancellationReason,
                  createdAt: o.createdAt,
                  items: (o.items || []).map((it: any) => ({
                    id: it.id,
                    productName: it.productName,
                    variantName: it.variantName,
                    unitPricePkr: it.unitPricePkr,
                    quantity: it.quantity,
                    lineTotalPkr: it.lineTotalPkr,
                    modifiers: it.modifiers || [],
                  })),
                });
              }
            } catch {
              // ignore individual failure
            }
          }
          setOrders(fetchedOrders);
        } else {
          setOrders([]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load customer orders:", err);
      setOrdersError("Network error. Could not retrieve orders.");
    } finally {
      setIsLoadingOrders(false);
      setIsAuthLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadCustomerOrders();
  }, [loadCustomerOrders]);

  // Periodic polling for active orders (every 8s) to update status live without full reload
  useEffect(() => {
    const hasActive = orders.some((o) => ACTIVE_STATUSES.has(o.status));
    if (!hasActive) return;

    const interval = setInterval(() => {
      loadCustomerOrders(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [orders, loadCustomerOrders]);

  // Toggle order expanded / collapsed
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Expand all / collapse all
  const toggleAll = (expand: boolean) => {
    if (expand) {
      setExpandedOrderIds(new Set(orders.map((o) => o.id)));
    } else {
      setExpandedOrderIds(new Set());
    }
  };

  // Direct manual order tracking submission
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualQuery.trim();
    if (!query) return;

    setIsManualSearching(true);
    setManualError(null);

    try {
      const res = await fetch(`/api/v1/orders/${encodeURIComponent(query)}/track`);
      const data = await res.json();

      if (data.success && data.data) {
        // Navigate to the existing designed Live Tracking page with the real reference
        const targetToken = data.data.trackingToken || data.data.id;
        router.push(`/order/track/${targetToken}?token=${encodeURIComponent(data.data.trackingToken)}`);
      } else {
        setManualError(data.error?.message || "Order not found. Please verify your order number.");
      }
    } catch {
      setManualError("Unable to reach tracking server. Please try again.");
    } finally {
      setIsManualSearching(false);
    }
  };

  // Handle Quick Sign In
  const handleQuickSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setShowSignInModal(false);
      await loadCustomerOrders();
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") {
        return ACTIVE_STATUSES.has(o.status);
      }
      if (statusFilter === "COMPLETED") {
        return !ACTIVE_STATUSES.has(o.status);
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // Active orders count
  const activeCount = useMemo(() => {
    return orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  }, [orders]);

  // Order Again handler
  const handleOrderAgain = (order: CustomerOrder) => {
    const itemsToAdd: CartItem[] = order.items.map((item) => ({
      cartItemId: `reorder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: item.id || `prod-${item.productName}`,
      productName: item.productName,
      unitPricePkr: item.unitPricePkr,
      quantity: item.quantity,
      lineTotalPkr: item.lineTotalPkr,
      variantName: item.variantName || undefined,
      modifiers: (item.modifiers || []).map((m) => ({
        id: `mod-${m.name}`,
        name: m.name,
        pricePkr: m.pricePkr,
      })),
      specialInstructions: "",
    }));

    setCartItems(itemsToAdd);
    setIsCartOpen(true);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--cnm-bg, #0f1117)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "var(--cnm-text-primary, #ffffff)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
      }}
    >
      {/* 1. Header with Cart Navigation */}
      <CustomerHeader
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        cartTotalPkr={cartItems.reduce((acc, i) => acc + (i.lineTotalPkr || i.unitPricePkr * i.quantity), 0)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="track-main-container">
        {/* Breadcrumb / Top Info */}
        <div className="track-header-row">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Track Order
              </h1>
              {activeCount > 0 && (
                <span
                  style={{
                    backgroundColor: "rgba(249, 115, 22, 0.15)",
                    color: "#f97316",
                    border: "1px solid rgba(249, 115, 22, 0.35)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span className="live-pulse-dot" />
                  {activeCount} {activeCount === 1 ? "Active" : "Active"}
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
              Real-time kitchen progress & past receipts.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {!currentUser && (
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                style={{
                  backgroundColor: "var(--cnm-orange, #f97316)",
                  color: "#ffffff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <User size={13} />
                <span>Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadCustomerOrders(true)}
              disabled={isRefreshing}
              aria-label="Refresh and sync recent orders"
              title="Refresh and sync recent orders"
              style={{
                backgroundColor: "var(--cnm-surface, #1e2230)",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.12))",
                color: "var(--cnm-text-primary, #ffffff)",
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                cursor: isRefreshing ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* 2. Quick Direct Order Lookup Form */}
        <div className="track-lookup-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cnm-text-primary, #ffffff)", display: "flex", alignItems: "center", gap: "5px" }}>
              <Search size={13} color="var(--cnm-orange, #f97316)" />
              <span>Track By Order # or Token:</span>
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
              e.g. CNM-2609-4806
            </span>
          </div>

          <form onSubmit={handleManualSearch} className="track-lookup-form">
            <input
              type="text"
              placeholder="Enter Order Number or Token..."
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              className="track-lookup-input"
            />
            <button
              type="submit"
              disabled={isManualSearching || !manualQuery.trim()}
              className="btn-track-lookup-submit"
            >
              {isManualSearching ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  <span>Tracking...</span>
                </>
              ) : (
                <>
                  <span>Track Live</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {manualError && (
            <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={12} />
              <span>{manualError}</span>
            </div>
          )}
        </div>

        {/* 4. Controls Bar: Filter tabs & Search */}
        {orders.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "6px" }}>
              {(["ALL", "ACTIVE", "COMPLETED"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    backgroundColor:
                      statusFilter === tab
                        ? "var(--cnm-orange, #f97316)"
                        : "var(--cnm-surface, #1e2230)",
                    color: statusFilter === tab ? "#ffffff" : "var(--cnm-text-muted, #94a3b8)",
                    border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab === "ALL" ? `All (${orders.length})` : tab === "ACTIVE" ? `Active (${activeCount})` : "Completed"}
                </button>
              ))}
            </div>

            {/* Expand / Collapse All Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => toggleAll(expandedOrderIds.size === 0)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "4px 6px",
                }}
              >
                {expandedOrderIds.size === 0 ? "Expand All" : "Collapse All"}
              </button>
            </div>
          </div>
        )}

        {/* 5. Orders List States */}
        {isLoadingOrders ? (
          /* Loading Skeletons */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="order-row-skeleton"
                style={{
                  height: "64px",
                  borderRadius: "8px",
                  backgroundColor: "var(--cnm-surface, #1e2230)",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                }}
              />
            ))}
          </div>
        ) : ordersError ? (
          /* Error State with Retry Button */
          <div
            style={{
              padding: "24px 20px",
              textAlign: "center",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "8px",
            }}
          >
            <AlertTriangle size={24} color="#ef4444" style={{ margin: "0 auto 8px" }} />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 6px" }}>
              Unable to load orders
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--cnm-text-muted, #94a3b8)", margin: "0 0 14px" }}>
              {ordersError}
            </p>
            <button
              type="button"
              onClick={() => loadCustomerOrders()}
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              backgroundColor: "var(--cnm-surface, #1e2230)",
              border: "1px dashed var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "8px",
            }}
          >
            <ShoppingBag size={36} color="var(--cnm-text-muted, #94a3b8)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px" }}>
              No recent orders found
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--cnm-text-muted, #94a3b8)", maxWidth: "340px", margin: "0 auto 18px" }}>
              {searchQuery
                ? "No orders matched your search query. Try searching by order number."
                : currentUser
                ? "You haven't placed any orders yet. Fresh, hot gourmet meals are waiting!"
                : "No orders found on this device. Sign in to view your account orders or track using your order number above."}
            </p>
            <Link
              href="/menu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--cnm-orange, #f97316)",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              <span>Explore Our Menu</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          /* 6. Compact Collapsed Orders List */
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderIds.has(order.id);
              const isActive = ACTIVE_STATUSES.has(order.status);
              const itemCount = order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);

              // Status badges & colors
              const statusCfg = getStatusConfig(order.status);

              return (
                <div
                  key={order.id}
                  className="order-card-container"
                  style={{
                    backgroundColor: "var(--cnm-surface, #1e2230)",
                    border: isActive
                      ? "1.5px solid rgba(249, 115, 22, 0.4)"
                      : "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                    borderRadius: "8px",
                    overflow: "hidden",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {/* Collapsed Row Header (Clicking expands inline) */}
                  <div
                    onClick={() => toggleOrderExpand(order.id)}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      gap: "10px",
                      userSelect: "none",
                      backgroundColor: isExpanded
                        ? "var(--cnm-surface-elevated, #161922)"
                        : "transparent",
                    }}
                  >
                    {/* Left: Order #, Type Badge, Placed Time */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isActive && <span className="live-pulse-dot" />}
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, letterSpacing: "0.01em" }}>
                          {order.orderNumber}
                        </span>
                      </div>

                      {/* Type Badge */}
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            order.orderType === "DELIVERY"
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(16, 185, 129, 0.12)",
                          color: order.orderType === "DELIVERY" ? "#60a5fa" : "#10b981",
                          border:
                            order.orderType === "DELIVERY"
                              ? "1px solid rgba(59, 130, 246, 0.25)"
                              : "1px solid rgba(16, 185, 129, 0.25)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          textTransform: "uppercase",
                        }}
                      >
                        {order.orderType === "DELIVERY" ? <Bike size={10} /> : <ShoppingBag size={10} />}
                        {order.orderType}
                      </span>

                      {/* Date & Time */}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--cnm-text-muted, #94a3b8)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Clock size={11} />
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {" • "}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Right: Items Count, Total PKR, Status Badge, Chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--cnm-text-muted, #94a3b8)",
                          whiteSpace: "nowrap",
                        }}
                        className="hide-on-compact"
                      >
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>

                      <span
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: "var(--cnm-orange, #f97316)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        PKR {order.totalPkr?.toLocaleString()}
                      </span>

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: statusCfg.bg,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {statusCfg.icon}
                        <span>{statusCfg.label}</span>
                      </span>

                      {/* Expand / Collapse Chevron */}
                      <div
                        style={{
                          color: "var(--cnm-text-muted, #94a3b8)",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* 7. Inline Expanded Details Section */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "14px",
                        borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                        backgroundColor: "var(--cnm-surface-elevated, #161922)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      {/* Active Order Live Tracking Prompt Banner */}
                      {isActive && (
                        <div
                          style={{
                            padding: "10px 14px",
                            backgroundColor: "rgba(249, 115, 22, 0.12)",
                            border: "1px solid rgba(249, 115, 22, 0.35)",
                            borderRadius: "7px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Flame size={18} color="#f97316" />
                            <div>
                              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#ffffff", display: "block" }}>
                                Live Order In Progress
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                                Station: <strong>{statusCfg.label}</strong> • Click below to see live updates
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/order/track/${order.trackingToken || order.id}?token=${encodeURIComponent(order.trackingToken)}`}
                            style={{
                              backgroundColor: "var(--cnm-orange, #f97316)",
                              color: "#ffffff",
                              padding: "6px 14px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              boxShadow: "0 2px 6px rgba(249, 115, 22, 0.3)",
                            }}
                          >
                            <Bike size={13} />
                            <span>View Live Tracking</span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      )}

                      {/* Current Status Progress Timeline */}
                      <OrderProgressTimeline status={order.status} orderType={order.orderType} />

                      {/* Two Column Grid: Items List + Delivery & Payment Details */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {/* Column 1: Ordered Items */}
                        <div
                          style={{
                            backgroundColor: "var(--cnm-surface, #1e2230)",
                            border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                            borderRadius: "6px",
                            padding: "10px 12px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              color: "var(--cnm-text-muted, #94a3b8)",
                              display: "block",
                              marginBottom: "8px",
                              letterSpacing: "0.03em",
                            }}
                          >
                            Items Ordered ({order.items.length})
                          </span>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "6px 8px",
                                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                                  borderRadius: "5px",
                                  fontSize: "0.78rem",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                  <div>
                                    <span style={{ fontWeight: 700, color: "var(--cnm-orange, #f97316)", marginRight: "5px" }}>
                                      {item.quantity}x
                                    </span>
                                    <span style={{ fontWeight: 600 }}>{item.productName}</span>
                                    {item.variantName && (
                                      <span style={{ fontSize: "0.72rem", color: "#60a5fa", marginLeft: "4px" }}>
                                        ({item.variantName})
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                    PKR {item.lineTotalPkr?.toLocaleString()}
                                  </span>
                                </div>

                                {/* Modifiers list */}
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "3px", marginLeft: "20px" }}>
                                    {item.modifiers.map((m, mIdx) => (
                                      <span
                                        key={mIdx}
                                        style={{
                                          fontSize: "0.66rem",
                                          color: "#f97316",
                                          backgroundColor: "rgba(249, 115, 22, 0.08)",
                                          padding: "1px 4px",
                                          borderRadius: "3px",
                                        }}
                                      >
                                        + {m.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 2: Delivery & Payment Details */}
                        <div
                          style={{
                            backgroundColor: "var(--cnm-surface, #1e2230)",
                            border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          {/* Delivery info */}
                          <div>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "var(--cnm-text-muted, #94a3b8)",
                                display: "block",
                                marginBottom: "6px",
                                letterSpacing: "0.03em",
                              }}
                            >
                              Fulfillment Details
                            </span>

                            {order.orderType === "DELIVERY" ? (
                              <div style={{ fontSize: "0.76rem", lineHeight: 1.35 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "3px" }}>
                                  <MapPin size={12} color="#f97316" style={{ marginTop: "2px", flexShrink: 0 }} />
                                  <span>
                                    {order.deliveryAreaName ? <strong>{order.deliveryAreaName}: </strong> : null}
                                    {order.deliveryAddress || "Address provided at checkout"}
                                  </span>
                                </div>
                                {order.deliveryLandmark && (
                                  <div style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.7rem", marginLeft: "16px" }}>
                                    Landmark: {order.deliveryLandmark}
                                  </div>
                                )}
                              </div>
                            ) : order.orderType === "DINE_IN" ? (
                              <div style={{ fontSize: "0.76rem" }}>
                                <span>Dine-In Customer</span>
                                {order.dineInPreferredTime && (
                                  <div style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.72rem" }}>
                                    Preferred Time: {order.dineInPreferredTime}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: "0.76rem" }}>
                                <span>Store Takeaway / Pickup at Cluck n Moo Counter</span>
                              </div>
                            )}

                            {order.customerPhone && (
                              <div style={{ marginTop: "5px", fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                                Contact: {order.customerName || "Customer"} ({order.customerPhone})
                              </div>
                            )}

                            {order.specialInstructions && (
                              <div style={{ marginTop: "5px", fontSize: "0.7rem", color: "#f97316", fontStyle: "italic" }}>
                                Note: {order.specialInstructions}
                              </div>
                            )}
                          </div>

                          {/* Payment summary breakdown */}
                          <div
                            style={{
                              borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                              paddingTop: "6px",
                              fontSize: "0.74rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                              <span style={{ color: "var(--cnm-text-muted, #94a3b8)" }}>Subtotal</span>
                              <span>PKR {order.subtotalPkr?.toLocaleString() || order.totalPkr?.toLocaleString()}</span>
                            </div>

                            {order.deliveryFeePkr !== undefined && order.deliveryFeePkr > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                <span style={{ color: "var(--cnm-text-muted, #94a3b8)" }}>Delivery Fee</span>
                                <span>PKR {order.deliveryFeePkr?.toLocaleString()}</span>
                              </div>
                            )}

                            {order.discountPkr !== undefined && order.discountPkr > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", color: "#10b981" }}>
                                <span>Discount</span>
                                <span>- PKR {order.discountPkr?.toLocaleString()}</span>
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "4px",
                                paddingTop: "4px",
                                borderTop: "1px dashed var(--cnm-border, rgba(255,255,255,0.08))",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                              }}
                            >
                              <span>Total ({order.paymentMethod || "CASH"})</span>
                              <span style={{ color: "var(--cnm-orange, #f97316)" }}>
                                PKR {order.totalPkr?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "2px",
                        }}
                      >
                        {/* Reorder Button */}
                        <button
                          type="button"
                          onClick={() => handleOrderAgain(order)}
                          style={{
                            backgroundColor: "var(--cnm-surface, #1e2230)",
                            color: "var(--cnm-text-primary, #ffffff)",
                            border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                            padding: "6px 12px",
                            borderRadius: "5px",
                            fontSize: "0.76rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <RefreshCw size={12} />
                          <span>Order Again</span>
                        </button>

                        {/* Direct Navigation to Existing Designed Live Tracking Page */}
                        <Link
                          href={`/order/track/${order.trackingToken || order.id}?token=${encodeURIComponent(order.trackingToken)}`}
                          style={{
                            backgroundColor: isActive ? "var(--cnm-orange, #f97316)" : "rgba(255,255,255,0.08)",
                            color: "#ffffff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: "5px",
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {isActive ? <Bike size={13} /> : <ShoppingBag size={13} />}
                          <span>{isActive ? "View Live Tracking" : "View Tracking & Receipt"}</span>
                          <ExternalLinkIcon size={11} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer for Reordering */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={(id) => setCartItems((prev) => prev.filter((i) => i.cartItemId !== id))}
        onUpdateQuantity={(id, q) =>
          setCartItems((prev) =>
            q <= 0 ? prev.filter((i) => i.cartItemId !== id) : prev.map((i) => (i.cartItemId === id ? { ...i, quantity: q } : i))
          )
        }
        onQuickAddUpsell={(p) => {}}
        onClearCart={() => setCartItems([])}
      />

      {/* Quick Sign-In Modal */}
      {showSignInModal && (
        <div
          onClick={() => setShowSignInModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 99,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--cnm-surface, #1e2230)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.12))",
              borderRadius: "10px",
              padding: "20px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 4px" }}>Customer Sign In</h3>
            <p style={{ fontSize: "0.78rem", color: "var(--cnm-text-muted, #94a3b8)", margin: "0 0 16px" }}>
              Sign in to view your orders, live statuses, and receipts.
            </p>

            <form onSubmit={handleQuickSignIn} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "5px",
                    backgroundColor: "var(--cnm-surface-elevated, #161922)",
                    border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "5px",
                    backgroundColor: "var(--cnm-surface-elevated, #161922)",
                    border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                  }}
                />
              </div>

              {authError && (
                <div style={{ fontSize: "0.74rem", color: "#ef4444" }}>{authError}</div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  style={{
                    flex: 1,
                    backgroundColor: "var(--cnm-orange, #f97316)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: isSubmittingAuth ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmittingAuth ? "Signing in..." : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignInModal(false)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "var(--cnm-text-primary, #ffffff)",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "8px" }}>
                <Link
                  href="/account"
                  style={{ fontSize: "0.74rem", color: "var(--cnm-orange, #f97316)", textDecoration: "none" }}
                >
                  Need an account? Register on the Account page →
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <CustomerFooter />

      {/* Global & Responsive Styles */}
      <style jsx global>{`
        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #f97316;
          box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
          animation: pulse-orange 1.6s infinite;
          display: inline-block;
        }

        @keyframes pulse-orange {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
          }
        }

        .order-row-skeleton {
          animation: pulse-skeleton 1.5s ease-in-out infinite;
        }

        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .track-main-container {
          flex: 1;
          padding: 12px 14px 36px;
          max-width: 980px;
          margin: 0 auto;
          width: 100%;
        }

        .track-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .track-lookup-card {
          background-color: var(--cnm-surface, #1e2230);
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.08));
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }

        .track-lookup-form {
          display: flex;
          gap: 6px;
          width: 100%;
        }

        .track-lookup-input {
          flex: 1;
          min-width: 0;
          background-color: var(--cnm-surface-elevated, #161922);
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.8rem;
          color: var(--cnm-text-primary, #ffffff);
          outline: none;
        }

        .btn-track-lookup-submit {
          background-color: var(--cnm-orange, #f97316);
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 0.8rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        @media (max-width: 440px) {
          .track-lookup-form {
            flex-direction: column !important;
            gap: 6px !important;
          }
          .track-lookup-input {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .btn-track-lookup-submit {
            width: 100% !important;
            padding: 9px !important;
          }
        }

        @media (min-width: 641px) {
          .track-main-container {
            padding: 20px 16px 48px;
          }
          .track-header-row {
            margin-bottom: 16px;
          }
          .track-lookup-card {
            padding: 14px;
            margin-bottom: 18px;
          }
        }

        @media (max-width: 640px) {
          .hide-on-compact {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Visual Timeline Component for Inline Order Card
function OrderProgressTimeline({ status, orderType }: { status: string; orderType: string }) {
  if (status === ORDER_STATUSES.CANCELLED) {
    return (
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.75rem",
          color: "#ef4444",
        }}
      >
        <AlertTriangle size={14} />
        <span>This order was cancelled.</span>
      </div>
    );
  }

  const steps =
    orderType === "DELIVERY"
      ? [
          { key: ORDER_STATUSES.NEW, label: "Placed" },
          { key: ORDER_STATUSES.CONFIRMED, label: "Confirmed" },
          { key: ORDER_STATUSES.PREPARING, label: "In Kitchen" },
          { key: ORDER_STATUSES.READY, label: "Ready" },
          { key: ORDER_STATUSES.OUT_FOR_DELIVERY, label: "Dispatched" },
          { key: ORDER_STATUSES.COMPLETED, label: "Delivered" },
        ]
      : [
          { key: ORDER_STATUSES.NEW, label: "Placed" },
          { key: ORDER_STATUSES.CONFIRMED, label: "Confirmed" },
          { key: ORDER_STATUSES.PREPARING, label: "In Kitchen" },
          { key: ORDER_STATUSES.READY, label: "Ready for Pickup" },
          { key: ORDER_STATUSES.COMPLETED, label: "Completed" },
        ];

  const statusOrder: string[] = [
    ORDER_STATUSES.NEW,
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.PREPARING,
    ORDER_STATUSES.READY,
    ORDER_STATUSES.OUT_FOR_DELIVERY,
    ORDER_STATUSES.COMPLETED,
  ];

  const currentIndex = statusOrder.indexOf(status);

  return (
    <div style={{ padding: "6px 4px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        {steps.map((step, idx) => {
          const stepIndex = statusOrder.indexOf(step.key);
          const isDone = currentIndex > stepIndex;
          const isCurrent = currentIndex === stepIndex;

          const circleColor = isDone
            ? "#10b981"
            : isCurrent
            ? "#f97316"
            : "var(--cnm-border, rgba(255,255,255,0.15))";

          return (
            <React.Fragment key={step.key}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  zIndex: 2,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: isCurrent ? "18px" : "14px",
                    height: isCurrent ? "18px" : "14px",
                    borderRadius: "50%",
                    backgroundColor: isCurrent ? "#f97316" : isDone ? "#10b981" : "var(--cnm-surface-elevated, #161922)",
                    border: `2px solid ${circleColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isDone && <Check size={9} color="#ffffff" strokeWidth={3} />}
                </div>

                <span
                  style={{
                    fontSize: "0.64rem",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent
                      ? "#f97316"
                      : isDone
                      ? "var(--cnm-text-primary, #ffffff)"
                      : "var(--cnm-text-muted, #94a3b8)",
                    marginTop: "4px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    backgroundColor:
                      currentIndex > stepIndex
                        ? "#10b981"
                        : "var(--cnm-border, rgba(255,255,255,0.1))",
                    margin: "0 -4px 16px",
                    zIndex: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Helper: Status label, badge color & icon config
function getStatusConfig(status: string) {
  switch (status) {
    case ORDER_STATUSES.NEW:
      return {
        label: "Placed",
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        border: "rgba(245, 158, 11, 0.3)",
        icon: <Clock size={11} />,
      };
    case ORDER_STATUSES.CONFIRMED:
      return {
        label: "Confirmed",
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#60a5fa",
        border: "rgba(59, 130, 246, 0.3)",
        icon: <CheckCircle2 size={11} />,
      };
    case ORDER_STATUSES.PREPARING:
      return {
        label: "In Kitchen",
        bg: "rgba(249, 115, 22, 0.15)",
        color: "#f97316",
        border: "rgba(249, 115, 22, 0.4)",
        icon: <Flame size={11} />,
      };
    case ORDER_STATUSES.READY:
      return {
        label: "Ready",
        bg: "rgba(20, 184, 166, 0.12)",
        color: "#14b8a6",
        border: "rgba(20, 184, 166, 0.3)",
        icon: <CheckCircle2 size={11} />,
      };
    case ORDER_STATUSES.OUT_FOR_DELIVERY:
      return {
        label: "Dispatched",
        bg: "rgba(59, 130, 246, 0.15)",
        color: "#3b82f6",
        border: "rgba(59, 130, 246, 0.4)",
        icon: <Bike size={11} />,
      };
    case ORDER_STATUSES.COMPLETED:
      return {
        label: "Delivered",
        bg: "rgba(16, 185, 129, 0.12)",
        color: "#10b981",
        border: "rgba(16, 185, 129, 0.3)",
        icon: <CheckCircle2 size={11} />,
      };
    case ORDER_STATUSES.CANCELLED:
      return {
        label: "Cancelled",
        bg: "rgba(239, 68, 68, 0.12)",
        color: "#ef4444",
        border: "rgba(239, 68, 68, 0.3)",
        icon: <AlertTriangle size={11} />,
      };
    default:
      return {
        label: status,
        bg: "rgba(255, 255, 255, 0.08)",
        color: "#ffffff",
        border: "rgba(255, 255, 255, 0.15)",
        icon: <Clock size={11} />,
      };
  }
}
