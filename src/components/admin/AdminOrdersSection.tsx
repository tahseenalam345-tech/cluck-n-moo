"use client";

import React, { useState, useMemo } from "react";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import {
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Bike,
  ChefHat,
  AlertCircle,
  Search,
  X,
  Utensils,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AdminOrdersSectionProps {
  orders: Order[];
  onUpdateOrderStatus: (
    orderId: string,
    targetStatus: OrderStatus,
    options?: { cancellationReason?: string; note?: string; assignedRiderId?: string }
  ) => Promise<void>;
  animatingOrders: Record<string, { targetStatus: OrderStatus; timestamp: number }>;
  onOpenCancelModal: (order: Order) => void;
  isUpdating?: boolean;
}

// Safe helper to check if an order is for DELIVERY
const isDeliveryOrder = (type?: string | null) => {
  if (!type) return false;
  return String(type).trim().toUpperCase() === "DELIVERY";
};

export function AdminOrdersSection({
  orders,
  onUpdateOrderStatus,
  animatingOrders,
  onOpenCancelModal,
  isUpdating = false,
}: AdminOrdersSectionProps) {
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Toggle order expansion
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

  // Toggle expand all
  const toggleExpandAll = () => {
    if (expandedOrderIds.size > 0) {
      setExpandedOrderIds(new Set());
    } else {
      setExpandedOrderIds(new Set(orders.map((o) => o.id)));
    }
  };

  // Operational KPI metrics and category count tallies
  const kpiMetrics = useMemo(() => {
    const active = orders.filter(
      (o) => o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED
    );
    const newCount = orders.filter((o) => o.status === ORDER_STATUSES.NEW).length;
    const confirmedCount = orders.filter((o) => o.status === ORDER_STATUSES.CONFIRMED).length;
    const kitchenCount = orders.filter((o) => o.status === ORDER_STATUSES.PREPARING).length;
    const readyCount = orders.filter((o) => o.status === ORDER_STATUSES.READY).length;
    const riderCount = orders.filter((o) => o.status === ORDER_STATUSES.OUT_FOR_DELIVERY).length;
    const completedCount = orders.filter((o) => o.status === ORDER_STATUSES.COMPLETED).length;
    const cancelledCount = orders.filter((o) => o.status === ORDER_STATUSES.CANCELLED).length;
    const totalCash = active.reduce((sum, o) => sum + (o.totalPkr || 0), 0);

    return {
      activeCount: active.length,
      newCount,
      confirmedCount,
      kitchenCount,
      readyCount,
      riderCount,
      completedCount,
      cancelledCount,
      totalCash,
    };
  }, [orders]);

  // Instant (0ms) In-Memory Filtered Orders
  const filteredOrders = useMemo(() => {
    let list = orders;

    // Status category filter
    if (orderStatusFilter === "active") {
      list = list.filter(
        (o) => o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED
      );
    } else if (orderStatusFilter !== "all") {
      list = list.filter((o) => o.status.toLowerCase() === orderStatusFilter.toLowerCase());
    }

    // Search query filter across all fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => {
        const num = (o.orderNumber || "").toLowerCase();
        const name = (o.customerNameSnapshot || o.customerName || "").toLowerCase();
        const phone = (o.customerPhoneSnapshot || o.customerPhone || "").toLowerCase();
        const area = (o.deliveryAreaNameSnapshot || o.deliveryAreaName || "").toLowerCase();
        const addr = (o.deliveryAddressSnapshot || o.deliveryAddress || "").toLowerCase();
        const cancelReason = (o.cancellationReason || "").toLowerCase();
        const itemsMatch = o.items?.some(
          (it: any) =>
            it.productName?.toLowerCase().includes(q) ||
            it.productNameSnapshot?.toLowerCase().includes(q) ||
            it.variantName?.toLowerCase().includes(q) ||
            it.variantNameSnapshot?.toLowerCase().includes(q)
        );
        return (
          num.includes(q) ||
          name.includes(q) ||
          phone.includes(q) ||
          area.includes(q) ||
          addr.includes(q) ||
          cancelReason.includes(q) ||
          itemsMatch
        );
      });
    }

    return list;
  }, [orders, orderStatusFilter, searchQuery]);

  return (
    <div>
      {/* 1. EXECUTIVE KPI METRICS BAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        {/* Metric 1: Active Total */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-text-muted)" }}>
            Active Orders
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 900, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
            {kpiMetrics.activeCount}
          </div>
        </div>

        {/* Metric 2: Needs Call */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            borderLeft: "4px solid var(--status-new)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--status-new)" }}>
            Needs Phone Call
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 900, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
            {kpiMetrics.newCount}
          </div>
        </div>

        {/* Metric 3: Kitchen Cooking */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            borderLeft: "4px solid var(--cnm-orange)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-orange)" }}>
            Kitchen Cooking
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 900, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
            {kpiMetrics.kitchenCount}
          </div>
        </div>

        {/* Metric 4: Rider In-Transit */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            borderLeft: "4px solid var(--status-delivery)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--status-delivery)" }}>
            Rider In-Transit
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 900, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
            {kpiMetrics.riderCount}
          </div>
        </div>

        {/* Metric 5: Active Cash */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-text-muted)" }}>
            Active Cash Pipeline
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 900, color: "var(--cnm-text-primary)", marginTop: "2px" }}>
            {kpiMetrics.totalCash.toLocaleString()} PKR
          </div>
        </div>
      </div>

      {/* 2. CONTROLS BAR: INSTANT SEARCH, STATUS FILTER PILLS & VIEW TOGGLE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            width: "320px",
            maxWidth: "100%",
          }}
        >
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--cnm-text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search order #, customer, item, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 32px 8px 34px",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              borderRadius: "var(--radius-full)",
              fontSize: "12.5px",
              color: "var(--cnm-text-primary)",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--cnm-text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills with Instant 0ms Tally Badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {[
            { key: "active", label: "All Active", count: kpiMetrics.activeCount },
            { key: "New", label: "New", count: kpiMetrics.newCount },
            { key: "Confirmed", label: "Confirmed", count: kpiMetrics.confirmedCount },
            { key: "Preparing", label: "Kitchen", count: kpiMetrics.kitchenCount },
            { key: "Ready", label: "Ready", count: kpiMetrics.readyCount },
            { key: "Out for delivery", label: "Dispatched", count: kpiMetrics.riderCount },
            { key: "Completed", label: "Completed", count: kpiMetrics.completedCount },
            { key: "Cancelled", label: "Cancelled", count: kpiMetrics.cancelledCount },
          ].map((f) => {
            const isSelected = orderStatusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setOrderStatusFilter(f.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--cnm-orange)" : "var(--cnm-surface)",
                  color: isSelected ? "#ffffff" : "var(--cnm-text-secondary)",
                  border: `1px solid ${isSelected ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                  transition: "background-color 0.15s ease, color 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    padding: "1px 6px",
                    borderRadius: "10px",
                    backgroundColor: isSelected ? "rgba(0,0,0,0.2)" : "var(--cnm-surface-elevated)",
                    color: isSelected ? "#ffffff" : "var(--cnm-text-muted)",
                  }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Expand-All Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Expand All / Collapse All Toggle */}
          <button
            onClick={toggleExpandAll}
            style={{
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-secondary)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Expand or collapse full itemized breakdown on all cards"
          >
            {expandedOrderIds.size > 0 ? (
              <>
                <ChevronUp size={14} />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Expand All</span>
              </>
            )}
          </button>

          {/* Grid vs Table View Mode */}
          <div
            style={{
              display: "inline-flex",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--cnm-border)",
              backgroundColor: "var(--cnm-surface)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 800,
                borderRadius: "var(--radius-xs)",
                backgroundColor: viewMode === "grid" ? "var(--cnm-surface-elevated)" : "transparent",
                color: viewMode === "grid" ? "var(--cnm-orange)" : "var(--cnm-text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 800,
                borderRadius: "var(--radius-xs)",
                backgroundColor: viewMode === "table" ? "var(--cnm-surface-elevated)" : "transparent",
                color: viewMode === "table" ? "var(--cnm-orange)" : "var(--cnm-text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* 3. ORDERS RENDER AREA */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "var(--cnm-surface)",
            border: "1px dashed var(--cnm-border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--cnm-text-muted)",
            animation: "fadeInFast 0.2s ease",
          }}
        >
          <Clock size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--cnm-text-primary)", marginBottom: "4px" }}>
            No Orders Found
          </h3>
          <p style={{ fontSize: "13px" }}>
            {searchQuery ? `No orders matching query "${searchQuery}"` : `No orders with status "${orderStatusFilter}"`}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* A. UNIFORM CARD GRID WITH EXPANDABLE BREAKDOWN */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          {filteredOrders.map((ord) => {
            const isExpanded = expandedOrderIds.has(ord.id);
            const isAnimating = !!animatingOrders[ord.id];
            const isDelivery = isDeliveryOrder(ord.orderType);

            const getStatusAccent = () => {
              switch (ord.status) {
                case "New":
                  return "var(--status-new)";
                case "Confirmed":
                  return "var(--status-confirmed)";
                case "Preparing":
                  return "var(--cnm-orange)";
                case "Ready":
                  return "var(--status-ready)";
                case "Out for delivery":
                  return "var(--status-delivery)";
                case "Completed":
                  return "var(--status-ready)";
                case "Cancelled":
                  return "var(--status-cancelled)";
                default:
                  return "var(--cnm-border)";
              }
            };

            const accentColor = getStatusAccent();

            return (
              <div
                key={ord.id}
                className={`order-card-transition ${isAnimating ? "anim-optimistic-pulse" : "anim-fade-in"}`}
                style={{
                  backgroundColor: "var(--cnm-surface)",
                  border: "1px solid var(--cnm-border)",
                  borderTop: `4px solid ${accentColor}`,
                  borderRadius: "14px",
                  boxShadow: "var(--shadow-sm)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  position: "relative",
                }}
              >
                {/* Top Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "17px",
                        fontWeight: 900,
                        color: "var(--cnm-text-primary)",
                        letterSpacing: "0.02em",
                        lineHeight: 1.2,
                      }}
                    >
                      {ord.orderNumber}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        color: "var(--cnm-text-muted)",
                        fontWeight: 600,
                        marginTop: "2px",
                      }}
                    >
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} PKT
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: "rgba(255, 130, 67, 0.12)",
                        color: "var(--cnm-orange)",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      {isDelivery ? <Bike size={11} /> : String(ord.orderType).toUpperCase() === "DINE_IN" ? <Utensils size={11} /> : <ShoppingBag size={11} />}
                      <span>{ord.orderType}</span>
                    </span>

                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-xs)",
                        backgroundColor: ord.status === "Cancelled" ? "rgba(239, 68, 68, 0.15)" : isAnimating ? "rgba(46, 204, 113, 0.2)" : "var(--cnm-surface-elevated)",
                        color: ord.status === "Cancelled" ? "var(--status-cancelled)" : isAnimating ? "var(--status-ready)" : "var(--cnm-text-primary)",
                        border: `1px solid ${ord.status === "Cancelled" ? "var(--status-cancelled)" : "var(--cnm-border)"}`,
                        textTransform: "uppercase",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>

                {/* Customer & Location Box */}
                <div
                  style={{
                    backgroundColor: "var(--cnm-surface-elevated)",
                    border: "1px solid var(--cnm-border)",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                      {ord.customerNameSnapshot || ord.customerName}
                    </span>
                    <a
                      href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--cnm-orange)",
                        fontWeight: 800,
                        fontSize: "12px",
                        textDecoration: "none",
                      }}
                    >
                      <Phone size={12} />
                      <span>{ord.customerPhoneSnapshot || ord.customerPhone}</span>
                    </a>
                  </div>

                  {isDelivery && (
                    <div style={{ fontSize: "11.5px", color: "var(--cnm-text-secondary)" }}>
                      📍 <span style={{ fontWeight: 700 }}>{ord.deliveryAreaNameSnapshot || ord.deliveryAreaName}:</span>{" "}
                      {ord.deliveryAddressSnapshot || ord.deliveryAddress}
                      {ord.deliveryLandmarkSnapshot && (
                        <span style={{ color: "var(--cnm-text-muted)" }}> (Near: {ord.deliveryLandmarkSnapshot})</span>
                      )}
                    </div>
                  )}

                  {String(ord.orderType).toUpperCase() === "DINE_IN" && (
                    <div style={{ fontSize: "11.5px", color: "var(--status-confirmed)" }}>
                      🍽️ Dine-in: {ord.dineInPreferredTime} ({ord.paymentLocation || "On Table"})
                    </div>
                  )}
                </div>

                {/* Cancellation Reason Banner (when cancelled) */}
                {ord.status === "Cancelled" && (
                  <div
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      borderRadius: "var(--radius-xs)",
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "var(--status-cancelled)",
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <XCircle size={15} style={{ flexShrink: 0, marginTop: "2px", color: "var(--status-cancelled)" }} />
                    <div>
                      <span style={{ fontWeight: 800 }}>Cancellation Reason: </span>
                      <span style={{ fontWeight: 600 }}>{ord.cancellationReason || "No specific reason provided"}</span>
                    </div>
                  </div>
                )}

                {/* Customer Special Instructions Alert */}
                {ord.specialInstructions && (
                  <div
                    style={{
                      backgroundColor: "rgba(255, 193, 7, 0.12)",
                      border: "1px solid rgba(255, 193, 7, 0.35)",
                      borderRadius: "var(--radius-xs)",
                      padding: "6px 10px",
                      fontSize: "11.5px",
                      color: "var(--cnm-text-primary)",
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                    }}
                  >
                    <AlertCircle size={13} style={{ color: "var(--status-new)", flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <span style={{ fontWeight: 800, color: "var(--status-new)" }}>Customer Note: </span>
                      <span>{ord.specialInstructions}</span>
                    </div>
                  </div>
                )}

                {/* Items Section Header with Expand / Collapse Button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-text-muted)" }}>
                    Order Items ({ord.items?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleOrderExpand(ord.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--cnm-orange)",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 4px",
                    }}
                  >
                    <span>{isExpanded ? "Collapse" : "Expand Details"}</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Items List */}
                <div
                  style={{
                    maxHeight: isExpanded ? "400px" : "90px",
                    height: isExpanded ? "auto" : "90px",
                    overflowY: "auto",
                    paddingRight: "4px",
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isExpanded ? "8px" : "5px",
                    transition: "max-height 0.25s ease",
                  }}
                >
                  {ord.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: isExpanded ? "var(--cnm-surface-elevated)" : "transparent",
                        padding: isExpanded ? "8px" : "0",
                        borderRadius: "var(--radius-xs)",
                        border: isExpanded ? "1px solid var(--cnm-border)" : "none",
                        fontSize: "12px",
                        lineHeight: 1.3,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ paddingRight: "6px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                          <span style={{ fontWeight: 800, color: "var(--cnm-orange)" }}>{item.quantity}x</span>{" "}
                          {item.productNameSnapshot || item.productName}
                          {(item.variantNameSnapshot || item.variantName) && (
                            <span
                              style={{
                                display: "inline-block",
                                marginLeft: "4px",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                backgroundColor: "rgba(255, 130, 67, 0.1)",
                                color: "var(--cnm-orange)",
                                fontSize: "10.5px",
                                fontWeight: 800,
                              }}
                            >
                              {item.variantNameSnapshot || item.variantName}
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 800, flexShrink: 0, color: "var(--cnm-text-primary)" }}>
                          {item.lineTotalPkr} PKR
                        </span>
                      </div>

                      {/* Full Modifiers & Addons breakdown when expanded */}
                      {isExpanded && item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ marginTop: "4px", paddingLeft: "12px", borderLeft: "2px solid var(--cnm-orange)" }}>
                          {item.modifiers.map((m: any, mIdx: number) => (
                            <div
                              key={mIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "11px",
                                color: "var(--cnm-text-secondary)",
                              }}
                            >
                              <span>+ {m.name || m.modifierNameSnapshot}</span>
                              <span>{(m.pricePkr || m.priceSnapshotPkr || 0) > 0 ? `+${m.pricePkr || m.priceSnapshotPkr} PKR` : "Included"}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && (
                        <div style={{ fontSize: "10.5px", color: "var(--cnm-text-muted)", marginTop: "2px" }}>
                          Unit: {item.unitPriceSnapshotPkr || item.unitPricePkr} PKR
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Footer */}
                <div style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px dashed var(--cnm-border)" }}>
                  {/* Subtotal, Fee, Discount breakdown when expanded */}
                  {isExpanded && (
                    <div style={{ marginBottom: "8px", fontSize: "11.5px", color: "var(--cnm-text-secondary)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span>Subtotal</span>
                        <span>{ord.subtotalPkr} PKR</span>
                      </div>
                      {ord.deliveryFeePkr > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span>Delivery Fee</span>
                          <span>+{ord.deliveryFeePkr} PKR</span>
                        </div>
                      )}
                      {(ord.discountPkr || 0) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", color: "var(--status-ready)", fontWeight: 700 }}>
                          <span>Discount</span>
                          <span>-{ord.discountPkr} PKR</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Amount Cash */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      Total Cash
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 900, color: "var(--cnm-text-primary)" }}>
                      {ord.totalPkr.toLocaleString()} PKR
                    </span>
                  </div>

                  {/* Action Buttons: Strict State Machine Workflow */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {/* 1. NEW -> CONFIRMED */}
                    {ord.status === "New" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, backgroundColor: "var(--status-new)", color: "#000", fontWeight: 800, padding: "7px 10px" }}
                      >
                        <Phone size={13} />
                        <span>CONFIRM CALL</span>
                      </button>
                    )}

                    {/* 2. CONFIRMED -> PREPARING (Send to Kitchen) */}
                    {ord.status === "Confirmed" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, padding: "7px 10px" }}
                      >
                        <ChefHat size={14} />
                        <span>SEND KITCHEN</span>
                      </button>
                    )}

                    {/* 3. PREPARING (Kitchen) -> READY */}
                    {ord.status === "Preparing" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                      >
                        <CheckCircle size={14} />
                        <span>MARK READY</span>
                      </button>
                    )}

                    {/* 4A. READY + DELIVERY -> OUT FOR DELIVERY (Rider Dispatch ONLY) */}
                    {ord.status === "Ready" && isDelivery && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, padding: "7px 10px", backgroundColor: "var(--status-delivery)" }}
                      >
                        <Bike size={14} />
                        <span>DISPATCH RIDER</span>
                      </button>
                    )}

                    {/* 4B. READY + PICKUP/DINE_IN -> COMPLETED */}
                    {ord.status === "Ready" && !isDelivery && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                      >
                        <CheckCircle size={14} />
                        <span>HAND OVER ({ord.orderType})</span>
                      </button>
                    )}

                    {/* 5. OUT FOR DELIVERY -> COMPLETED */}
                    {ord.status === "Out for delivery" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                      >
                        <CheckCircle size={14} />
                        <span>SETTLE & COMPLETE</span>
                      </button>
                    )}

                    {/* CANCEL BUTTON */}
                    {ord.status !== "Completed" && ord.status !== "Cancelled" && (
                      <button
                        onClick={() => onOpenCancelModal(ord)}
                        className="btn btn-sm btn-secondary"
                        style={{ color: "var(--status-cancelled)", padding: "7px 10px" }}
                      >
                        <XCircle size={13} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* B. DENSE DATA TABLE VIEW WITH ACCORDION ROW EXPANSION */
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "14px",
            overflowX: "auto",
            boxShadow: "var(--shadow-sm)",
            animation: "fadeInFast 0.2s ease",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--cnm-surface-elevated)", borderBottom: "1px solid var(--cnm-border)" }}>
                <th style={{ padding: "12px 10px", width: "40px" }}></th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Order #</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Time</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Customer</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Type & Area</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Items Summary</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Cash Total</th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Status</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                const isExpanded = expandedOrderIds.has(ord.id);
                const isAnimating = !!animatingOrders[ord.id];
                const isDelivery = isDeliveryOrder(ord.orderType);

                return (
                  <React.Fragment key={ord.id}>
                    <tr
                      className={isAnimating ? "anim-optimistic-pulse" : ""}
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid var(--cnm-border)",
                        backgroundColor: isExpanded ? "var(--cnm-surface-elevated)" : "transparent",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      onClick={() => toggleOrderExpand(ord.id)}
                    >
                      <td style={{ padding: "12px 10px", textAlign: "center" }}>
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cnm-text-muted)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 900, fontFamily: "var(--font-display)" }}>
                        {ord.orderNumber}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--cnm-text-muted)", fontSize: "12px" }}>
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700 }}>{ord.customerNameSnapshot || ord.customerName}</div>
                        <a
                          href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "var(--cnm-orange)", fontSize: "12px", textDecoration: "none" }}
                        >
                          {ord.customerPhoneSnapshot || ord.customerPhone}
                        </a>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                        <span style={{ fontWeight: 700 }}>{ord.orderType}</span>
                        <div style={{ color: "var(--cnm-text-muted)" }}>{ord.deliveryAreaNameSnapshot || ord.deliveryAreaName || "Branch"}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                        {ord.items?.map((it) => `${it.quantity}x ${it.productNameSnapshot || it.productName}`).join(", ")}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 900 }}>{ord.totalPkr} PKR</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "var(--radius-xs)",
                            backgroundColor: ord.status === "Cancelled" ? "rgba(239, 68, 68, 0.15)" : isAnimating ? "rgba(46, 204, 113, 0.2)" : "var(--cnm-surface-elevated)",
                            color: ord.status === "Cancelled" ? "var(--status-cancelled)" : isAnimating ? "var(--status-ready)" : "var(--cnm-text-primary)",
                            border: `1px solid ${ord.status === "Cancelled" ? "var(--status-cancelled)" : "var(--cnm-border)"}`,
                          }}
                        >
                          {ord.status}
                        </span>
                        {ord.status === "Cancelled" && ord.cancellationReason && (
                          <div style={{ fontSize: "11px", color: "var(--status-cancelled)", marginTop: "3px", maxWidth: "160px", lineHeight: 1.2 }}>
                            Reason: {ord.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        {ord.status === "New" && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                            className="btn btn-sm btn-primary"
                            style={{ backgroundColor: "var(--status-new)", color: "#000", fontSize: "11px" }}
                          >
                            Confirm
                          </button>
                        )}
                        {ord.status === "Confirmed" && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: "11px" }}
                          >
                            Kitchen
                          </button>
                        )}
                        {ord.status === "Preparing" && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                            className="btn btn-sm btn-primary"
                            style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                          >
                            Ready
                          </button>
                        )}
                        {ord.status === "Ready" && isDelivery && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: "11px", backgroundColor: "var(--status-delivery)" }}
                          >
                            Dispatch
                          </button>
                        )}
                        {ord.status === "Ready" && !isDelivery && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                            className="btn btn-sm btn-primary"
                            style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                          >
                            Handover
                          </button>
                        )}
                        {ord.status === "Out for delivery" && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                            className="btn btn-sm btn-primary"
                            style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                          >
                            Settle
                          </button>
                        )}
                        {ord.status !== "Completed" && ord.status !== "Cancelled" && (
                          <button
                            onClick={() => onOpenCancelModal(ord)}
                            className="btn btn-sm btn-secondary"
                            style={{ color: "var(--status-cancelled)", fontSize: "11px", marginLeft: "4px" }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Full Details Row */}
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--cnm-border)", backgroundColor: "var(--cnm-surface-elevated)" }}>
                        <td colSpan={9} style={{ padding: "0 14px 16px 50px" }}>
                          <div
                            style={{
                              backgroundColor: "var(--cnm-surface)",
                              border: "1px solid var(--cnm-border)",
                              borderRadius: "var(--radius-sm)",
                              padding: "14px",
                            }}
                          >
                            {/* Cancellation reason callout if cancelled */}
                            {ord.status === "Cancelled" && (
                              <div
                                style={{
                                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  borderRadius: "var(--radius-xs)",
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  color: "var(--status-cancelled)",
                                  marginBottom: "12px",
                                }}
                              >
                                <span style={{ fontWeight: 800 }}>⚠️ Cancellation Reason: </span>
                                <span style={{ fontWeight: 600 }}>{ord.cancellationReason || "No specific reason provided"}</span>
                              </div>
                            )}

                            {/* Special Instructions callout */}
                            {ord.specialInstructions && (
                              <div
                                style={{
                                  backgroundColor: "rgba(255, 193, 7, 0.12)",
                                  border: "1px solid rgba(255, 193, 7, 0.35)",
                                  borderRadius: "var(--radius-xs)",
                                  padding: "6px 10px",
                                  fontSize: "12px",
                                  color: "var(--cnm-text-primary)",
                                  marginBottom: "12px",
                                }}
                              >
                                <span style={{ fontWeight: 800, color: "var(--status-new)" }}>📝 Customer Note: </span>
                                <span>{ord.specialInstructions}</span>
                              </div>
                            )}

                            {/* Itemized Grid Breakdown */}
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                              <div>
                                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-text-muted)", marginBottom: "6px" }}>
                                  Itemized Breakdown
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {ord.items?.map((item, itIdx) => (
                                    <div
                                      key={itIdx}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "12.5px",
                                        borderBottom: "1px dashed var(--cnm-border)",
                                        paddingBottom: "4px",
                                      }}
                                    >
                                      <div>
                                        <span style={{ fontWeight: 800, color: "var(--cnm-orange)" }}>{item.quantity}x</span>{" "}
                                        <span style={{ fontWeight: 700 }}>{item.productNameSnapshot || item.productName}</span>{" "}
                                        {(item.variantNameSnapshot || item.variantName) && (
                                          <span style={{ color: "var(--cnm-text-muted)", fontSize: "11.5px" }}>
                                            ({item.variantNameSnapshot || item.variantName})
                                          </span>
                                        )}
                                        {/* Modifiers */}
                                        {item.modifiers && item.modifiers.length > 0 && (
                                          <div style={{ fontSize: "11px", color: "var(--cnm-text-secondary)", paddingLeft: "8px" }}>
                                            {item.modifiers.map((m: any, mIdx: number) => (
                                              <span key={mIdx} style={{ marginRight: "8px" }}>
                                                + {m.name || m.modifierNameSnapshot}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ fontWeight: 800 }}>{item.lineTotalPkr} PKR</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Financial Breakdown & Address */}
                              <div style={{ borderLeft: "1px solid var(--cnm-border)", paddingLeft: "16px", fontSize: "12px" }}>
                                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--cnm-text-muted)", marginBottom: "6px" }}>
                                  Fulfillment & Total
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                  <span>Subtotal:</span>
                                  <span>{ord.subtotalPkr} PKR</span>
                                </div>
                                {ord.deliveryFeePkr > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                    <span>Delivery Fee:</span>
                                    <span>+{ord.deliveryFeePkr} PKR</span>
                                  </div>
                                )}
                                {(ord.discountPkr || 0) > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", color: "var(--status-ready)" }}>
                                    <span>Discount:</span>
                                    <span>-{ord.discountPkr} PKR</span>
                                  </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", paddingTop: "4px", borderTop: "1px solid var(--cnm-border)", fontWeight: 900, fontSize: "13px" }}>
                                  <span>Total Cash:</span>
                                  <span>{ord.totalPkr} PKR</span>
                                </div>

                                {ord.deliveryAddressSnapshot && (
                                  <div style={{ marginTop: "10px", fontSize: "11.5px", color: "var(--cnm-text-secondary)" }}>
                                    <strong>Address:</strong> {ord.deliveryAddressSnapshot}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
