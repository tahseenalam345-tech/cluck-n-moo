"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import {
  Phone,
  Clock,
  CheckCircle2,
  Bike,
  ChefHat,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Flame,
  Check,
  Sun,
  Moon,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationOptInPrompt } from "@/components/NotificationOptInPrompt";
import { OrderTrackTimeline } from "@/components/OrderTrackTimeline";
import { getLocalOrders, updateLocalOrderStatus } from "@/lib/orderHistory";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { theme, toggleTheme } = useTheme();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const fetchOrder = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        let token = searchParams.get("token");
        if (!token && typeof window !== "undefined") {
          const local = getLocalOrders();
          const found = local.find(
            (o) => o.orderNumber === id || o.orderId === id || o.trackingToken === id
          );
          if (found) token = found.trackingToken;
        }

        const url = token
          ? `/api/v1/orders/${id}/track?token=${encodeURIComponent(token)}`
          : `/api/v1/orders/${id}/track`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);
          if (data.data.trackingToken && data.data.status) {
            updateLocalOrderStatus(data.data.trackingToken, data.data.status);
          }
        } else {
          setError(data.error?.message || "Order not found");
        }
      } catch {
        setError("Unable to connect to server. Please check your connection.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, searchParams]
  );

  // Initial load and fast 3s active polling for live updates without refresh
  useEffect(() => {
    fetchOrder();

    // Active polling every 3 seconds while order is in flight
    const interval = setInterval(() => {
      fetchOrder();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchOrder]);

  // Supabase Realtime subscription for instant push updates
  useEffect(() => {
    if (!order?.id) return;
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`order-track-realtime-${order.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${order.id}`,
          },
          () => {
            fetchOrder();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Fallback is handled by 3s interval polling
    }
  }, [order?.id, fetchOrder]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          backgroundColor: "var(--cnm-bg)",
        }}
      >
        <RefreshCw className="spin" size={32} color="var(--cnm-orange)" />
        <p style={{ marginTop: "14px", color: "var(--cnm-text-muted)", fontSize: "14px", fontWeight: 600 }}>
          Connecting to live order tracker...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="app-container" style={{ padding: "32px 16px", textAlign: "center", backgroundColor: "var(--cnm-bg)" }}>
        <AlertTriangle size={48} color="var(--status-cancelled)" style={{ margin: "40px auto 16px" }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", marginBottom: "8px", color: "var(--cnm-text-primary)" }}>
          Order Not Found
        </h2>
        <p style={{ color: "var(--cnm-text-muted)", marginBottom: "24px" }}>{error}</p>
        <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
          Return to Menu
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
  const isCompleted = order.status === ORDER_STATUSES.COMPLETED;
  const customerPhone = order.customerPhone || (order as any).customerPhoneSnapshot || "your phone";
  const customerName = order.customerName || (order as any).customerNameSnapshot || "Customer";
  const deliveryArea = order.deliveryAreaName || (order as any).deliveryAreaNameSnapshot || "Kharian Area";
  const deliveryAddress = order.deliveryAddress || (order as any).deliveryAddressSnapshot || "";

  const getStatusHeadline = () => {
    switch (order.status) {
      case ORDER_STATUSES.NEW:
        return {
          title: "ORDER PLACED — AWAITING CALL",
          desc: `We will call you on ${customerPhone} to verify before cooking.`,
          color: "var(--status-new)",
          icon: Phone,
        };
      case ORDER_STATUSES.CONFIRMED:
        return {
          title: "ORDER CONFIRMED & QUEUED",
          desc: "Phone verification verified. Your ticket is sent to the kitchen line!",
          color: "var(--status-confirmed)",
          icon: Check,
        };
      case ORDER_STATUSES.PREPARING:
        return {
          title: "SIZZLING FRESH ON THE GRILL",
          desc: "Smashing patties and frying chicken fresh to order right now!",
          color: "var(--cnm-orange)",
          icon: Flame,
        };
      case ORDER_STATUSES.READY:
        return {
          title: order.orderType === "DELIVERY" ? "FOOD PACKED & SEALED" : "FRESH & READY FOR PICKUP!",
          desc:
            order.orderType === "DELIVERY"
              ? "Packed in thermal bags, assigned to rider."
              : "Ready at the counter! Show your order number to collect.",
          color: "var(--status-ready)",
          icon: ChefHat,
        };
      case ORDER_STATUSES.OUT_FOR_DELIVERY:
        return {
          title: "RIDER ON THE ROAD!",
          desc: `Rider is cruising to ${deliveryArea} with your feast.`,
          color: "var(--status-delivery)",
          icon: Bike,
        };
      case ORDER_STATUSES.COMPLETED:
        return {
          title: "ORDER DELIVERED & COMPLETED",
          desc: "Thank you for choosing Cluck N Moo Kharian! Enjoy your juicy feast!",
          color: "var(--status-ready)",
          icon: CheckCircle2,
        };
      case ORDER_STATUSES.CANCELLED:
        return {
          title: "ORDER CANCELLED",
          desc: order.cancellationReason || "This order was cancelled by branch.",
          color: "var(--status-cancelled)",
          icon: AlertTriangle,
        };
      default:
        return {
          title: order.status,
          desc: "Your order is being processed.",
          color: "var(--cnm-orange)",
          icon: Clock,
        };
    }
  };

  const headline = getStatusHeadline();
  const HeadlineIcon = headline.icon;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cnm-bg)",
        color: "var(--cnm-text-primary)",
        paddingBottom: "32px",
      }}
    >
      {/* 1. Sleek Compact Header with Theme Toggle in Corner */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--cnm-border)",
          backgroundColor: "var(--cnm-surface)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "var(--cnm-text-primary)",
            fontSize: "13px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          <span>Menu</span>
        </Link>

        {/* Brand Logo in Center */}
        <Link href="/" aria-label="Home" style={{ display: "flex", alignItems: "center" }}>
          <BrandLogo size="sm" showTagline={false} />
        </Link>

        {/* Right Corner Controls: Live Beacon, Theme Toggle, Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Live indicator badge */}
          {!isCompleted && !isCancelled && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "var(--status-ready)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "3px 8px",
                borderRadius: "var(--radius-full)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "var(--status-ready)",
                  display: "inline-block",
                  boxShadow: "0 0 6px var(--status-ready)",
                }}
              />
              <span>LIVE</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            {theme === "dark" ? (
              <Sun size={15} style={{ color: "#FBBF24" }} />
            ) : (
              <Moon size={15} style={{ color: "var(--cnm-text-secondary)" }} />
            )}
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchOrder(true)}
            aria-label="Refresh Status"
            title="Refresh Status"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? "spin" : ""} />
          </button>
        </div>
      </header>

      {/* Main Content Area - Mobile-First Compact Container */}
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "12px 14px" }}>
        {/* Opt-in Prompt (Non-intrusive) */}
        <NotificationOptInPrompt />

        {/* 2. Top Order Status Headline Card */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            marginBottom: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Top Bar: Order Number & Type Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
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
                  color: "var(--cnm-text-muted)",
                  fontWeight: 600,
                }}
              >
                • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <span
              className="badge"
              style={{
                backgroundColor:
                  order.orderType === "DELIVERY"
                    ? "rgba(255, 130, 67, 0.15)"
                    : order.orderType === "DINE_IN"
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(16, 185, 129, 0.15)",
                color:
                  order.orderType === "DELIVERY"
                    ? "var(--cnm-orange)"
                    : order.orderType === "DINE_IN"
                    ? "var(--status-confirmed)"
                    : "var(--status-ready)",
                border: "1px solid currentColor",
                fontSize: "11px",
                fontWeight: 900,
                padding: "3px 9px",
                borderRadius: "var(--radius-full)",
              }}
            >
              {order.orderType}
            </span>
          </div>

          {/* Dynamic Headline Lockup */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: headline.color,
                flexShrink: 0,
                marginTop: "2px",
              }}
            >
              <HeadlineIcon size={20} />
            </div>

            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "var(--cnm-text-primary)",
                  margin: 0,
                  letterSpacing: "0.02em",
                  lineHeight: 1.25,
                }}
              >
                {headline.title}
              </h1>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "var(--cnm-text-secondary)",
                  margin: "3px 0 0",
                  lineHeight: 1.35,
                }}
              >
                {headline.desc}
              </p>
            </div>
          </div>
        </div>

        {/* 3. The Visual Train Progress Track (Unless Cancelled) */}
        {!isCancelled ? (
          <OrderTrackTimeline order={order} />
        ) : (
          <div
            style={{
              padding: "14px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--status-cancelled)",
              borderRadius: "var(--radius-md)",
              color: "var(--status-cancelled)",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertTriangle size={18} />
            <span>Order Cancelled: {order.cancellationReason || "Contact branch for assistance."}</span>
          </div>
        )}

        {/* 4. Compact Quick Actions Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <a
            href={`tel:${BRAND.branch.phone}`}
            className="btn btn-primary"
            style={{
              padding: "10px 12px",
              fontSize: "13px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Phone size={14} />
            <span>Call Branch</span>
          </a>

          <button
            onClick={handleCopyLink}
            className="btn btn-secondary"
            style={{
              padding: "10px 12px",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              backgroundColor: "var(--cnm-surface)",
            }}
          >
            {copySuccess ? (
              <Check size={14} color="var(--status-ready)" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
            <span>{copySuccess ? "Link Copied!" : "Share Link"}</span>
          </button>
        </div>

        {/* 5. Destination & Payment Snapshot (Compact) */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            marginBottom: "12px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                {order.orderType === "DELIVERY" ? "DELIVERY TO" : "ORDER FOR"}
              </span>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
                {customerName} • {customerPhone}
              </div>
              {order.orderType === "DELIVERY" && (
                <div style={{ fontSize: "12px", color: "var(--cnm-text-secondary)", marginTop: "2px" }}>
                  📍 {deliveryArea}: {deliveryAddress}
                </div>
              )}
              {order.orderType === "DINE_IN" && order.dineInPreferredTime && (
                <div style={{ fontSize: "12px", color: "var(--status-confirmed)", marginTop: "2px" }}>
                  🍽️ Preferred Dine-In Time: {order.dineInPreferredTime}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: "10px", color: "var(--cnm-text-muted)", textTransform: "uppercase", fontWeight: 800 }}>
                TOTAL (CASH)
              </span>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "var(--cnm-text-primary)",
                  lineHeight: 1.1,
                }}
              >
                {order.totalPkr.toLocaleString()} PKR
              </div>
            </div>
          </div>
        </div>

        {/* 6. Collapsible Itemized Receipt Accordion */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            marginBottom: "16px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <button
            onClick={() => setIsReceiptOpen(!isReceiptOpen)}
            style={{
              width: "100%",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--cnm-text-primary)",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Order Breakdown ({order.items?.length || 0} items)
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--cnm-orange)", fontSize: "12px", fontWeight: 700 }}>
              <span>{isReceiptOpen ? "Hide" : "View"}</span>
              <ChevronDown
                size={16}
                style={{
                  transform: isReceiptOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </div>
          </button>

          {isReceiptOpen && (
            <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--cnm-border)" }}>
              {/* Item Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "10px" }}>
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      paddingBottom: "8px",
                      borderBottom: "1px solid var(--cnm-border)",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                        {item.quantity}x {item.productNameSnapshot || item.productName}
                      </span>
                      {(item.variantNameSnapshot || item.variantName) && (
                        <span style={{ display: "block", fontSize: "11.5px", color: "var(--cnm-text-secondary)" }}>
                          • Size: {item.variantNameSnapshot || item.variantName}
                        </span>
                      )}
                      {item.modifiers?.map((m) => (
                        <span key={m.id} style={{ display: "block", fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                          + {m.modifierNameSnapshot || (m as any).name}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)", flexShrink: 0 }}>
                      {item.lineTotalPkr.toLocaleString()} PKR
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotals */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
                  <span>Subtotal</span>
                  <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>{order.subtotalPkr.toLocaleString()} PKR</span>
                </div>

                {order.discountPkr && order.discountPkr > 0 ? (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--status-ready)", fontWeight: 700 }}>
                    <span>Custom Deal Discount</span>
                    <span>-{order.discountPkr.toLocaleString()} PKR</span>
                  </div>
                ) : null}

                {order.orderType === "DELIVERY" && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
                    <span>Delivery Fee ({deliveryArea})</span>
                    <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>{order.deliveryFeePkr.toLocaleString()} PKR</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 7. Footer Return to Menu Button */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/"
            className="btn btn-secondary btn-block"
            style={{
              padding: "12px",
              fontSize: "13.5px",
              fontWeight: 800,
              backgroundColor: "var(--cnm-surface)",
              color: "var(--cnm-text-primary)",
            }}
          >
            ← Back to Cluck N Moo Menu
          </Link>
        </div>
      </main>
    </div>
  );
}
