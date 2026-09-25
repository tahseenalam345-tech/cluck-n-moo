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
  MapPin,
  Sparkles,
  DollarSign,
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

// Helper to check if an order is for DELIVERY
const isDeliveryOrder = (type?: string | null) => {
  if (!type) return false;
  return String(type).trim().toUpperCase() === "DELIVERY";
};

// Format relative time helper
const formatRelativeTime = (dateStr: string) => {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
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

  // Instant (0ms) Filtered Orders
  const filteredOrders = useMemo(() => {
    let list = orders;

    if (orderStatusFilter === "active") {
      list = list.filter(
        (o) => o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED
      );
    } else if (orderStatusFilter !== "all") {
      list = list.filter((o) => o.status.toLowerCase() === orderStatusFilter.toLowerCase());
    }

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
    <div className="admin-orders-scope">
      {/* 1. EXECUTIVE KPI METRICS BAR */}
      <div className="kpi-metrics-grid">
        {/* Metric 1: Active Orders */}
        <div className="kpi-metric-card" onClick={() => setOrderStatusFilter("active")}>
          <div className="kpi-card-top">
            <span className="kpi-card-title">Active Orders</span>
            <div className="kpi-card-icon blue">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-card-num">{kpiMetrics.activeCount}</div>
          <div className="kpi-card-sub text-slate-500">Pipeline in motion</div>
        </div>

        {/* Metric 2: Needs Call */}
        <div className="kpi-metric-card amber" onClick={() => setOrderStatusFilter("New")}>
          <div className="kpi-card-top">
            <span className="kpi-card-title">Needs Phone Call</span>
            <div className="kpi-card-icon amber">
              <Phone size={18} />
            </div>
          </div>
          <div className="kpi-card-num text-amber-600">{kpiMetrics.newCount}</div>
          <div className="kpi-card-sub text-amber-700">Awaiting phone verification</div>
        </div>

        {/* Metric 3: Kitchen Preparing */}
        <div className="kpi-metric-card orange" onClick={() => setOrderStatusFilter("Preparing")}>
          <div className="kpi-card-top">
            <span className="kpi-card-title">Kitchen Cooking</span>
            <div className="kpi-card-icon orange">
              <ChefHat size={18} />
            </div>
          </div>
          <div className="kpi-card-num text-orange-600">{kpiMetrics.kitchenCount}</div>
          <div className="kpi-card-sub text-orange-700">Currently in the kitchen</div>
        </div>

        {/* Metric 4: Rider In-Transit */}
        <div className="kpi-metric-card purple" onClick={() => setOrderStatusFilter("Out for delivery")}>
          <div className="kpi-card-top">
            <span className="kpi-card-title">Rider In-Transit</span>
            <div className="kpi-card-icon purple">
              <Bike size={18} />
            </div>
          </div>
          <div className="kpi-card-num text-purple-600">{kpiMetrics.riderCount}</div>
          <div className="kpi-card-sub text-purple-700">Dispatched out for delivery</div>
        </div>

        {/* Metric 5: Active Cash Pipeline */}
        <div className="kpi-metric-card green">
          <div className="kpi-card-top">
            <span className="kpi-card-title">Active Cash Pipeline</span>
            <div className="kpi-card-icon green">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-card-num text-emerald-700">{kpiMetrics.totalCash.toLocaleString()} <span className="currency-label">PKR</span></div>
          <div className="kpi-card-sub text-emerald-800">Pending COD collection</div>
        </div>
      </div>

      {/* 2. CONTROLS BAR: INSTANT SEARCH, STATUS FILTER PILLS & VIEW TOGGLE */}
      <div className="orders-toolbar-bar">
        {/* Search Input */}
        <div className="orders-search-wrapper">
          <Search size={16} className="search-icon-fixed" />
          <input
            type="text"
            placeholder="Search order #, customer name, phone, dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="orders-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="search-clear-btn"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="orders-filter-pills-row">
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
                type="button"
                onClick={() => setOrderStatusFilter(f.key)}
                className={`order-filter-pill ${isSelected ? "active" : ""}`}
              >
                <span>{f.label}</span>
                <span className={`pill-counter ${isSelected ? "counter-active" : ""}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Expand Controls */}
        <div className="orders-view-controls">
          <button
            type="button"
            onClick={toggleExpandAll}
            className="btn-toggle-expand"
            title="Expand or collapse full itemized details on all cards"
          >
            {expandedOrderIds.size > 0 ? (
              <>
                <ChevronUp size={14} />
                <span>Collapse Details</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Expand Details</span>
              </>
            )}
          </button>

          <div className="view-mode-toggle-group">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* 3. ORDERS RENDER AREA */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty-state">
          <Clock size={44} className="empty-clock-icon" />
          <h3 className="empty-title">No Orders Found</h3>
          <p className="empty-desc">
            {searchQuery
              ? `No orders matching query "${searchQuery}"`
              : `No orders in status "${orderStatusFilter}"`}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* A. HIGH-CONTRAST POS CARD GRID */
        <div className="orders-card-grid">
          {filteredOrders.map((ord) => {
            const isExpanded = expandedOrderIds.has(ord.id);
            const isAnimating = !!animatingOrders[ord.id];
            const isDelivery = isDeliveryOrder(ord.orderType);
            const isDineIn = String(ord.orderType).toUpperCase() === "DINE_IN";

            // Status Badge styling helper
            const getStatusBadge = () => {
              switch (ord.status) {
                case "New":
                  return {
                    label: "NEW ORDER",
                    className: "badge-status-new",
                    showPulse: true,
                    topColor: "#f59e0b",
                  };
                case "Confirmed":
                  return {
                    label: "CONFIRMED",
                    className: "badge-status-confirmed",
                    showPulse: false,
                    topColor: "#0284c7",
                  };
                case "Preparing":
                  return {
                    label: "KITCHEN COOKING",
                    className: "badge-status-preparing",
                    showPulse: true,
                    topColor: "#ea580c",
                  };
                case "Ready":
                  return {
                    label: "FOOD READY",
                    className: "badge-status-ready",
                    showPulse: false,
                    topColor: "#10b981",
                  };
                case "Out for delivery":
                  return {
                    label: "RIDER DISPATCHED",
                    className: "badge-status-delivery",
                    showPulse: true,
                    topColor: "#6366f1",
                  };
                case "Completed":
                  return {
                    label: "COMPLETED",
                    className: "badge-status-completed",
                    showPulse: false,
                    topColor: "#64748b",
                  };
                case "Cancelled":
                  return {
                    label: "CANCELLED",
                    className: "badge-status-cancelled",
                    showPulse: false,
                    topColor: "#ef4444",
                  };
                default:
                  return {
                    label: ord.status,
                    className: "badge-status-completed",
                    showPulse: false,
                    topColor: "#cbd5e1",
                  };
              }
            };

            const statusBadge = getStatusBadge();

            return (
              <div
                key={ord.id}
                className={`order-pos-card ${isAnimating ? "anim-card-pulse" : ""}`}
                style={{ borderTop: `4px solid ${statusBadge.topColor}` }}
              >
                {/* 1. Header Row */}
                <div className="card-header-row">
                  <div className="order-id-group">
                    <span className="order-id-text">#{ord.orderNumber}</span>
                    <div className="order-time-tag">
                      <Clock size={11} />
                      <span>{new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} PKT</span>
                      <span className="time-relative-dot">·</span>
                      <span className="time-relative-text">{formatRelativeTime(ord.createdAt)}</span>
                    </div>
                  </div>

                  <div className="order-badges-group">
                    {/* Fulfillment Type */}
                    <span className={`badge-type ${isDelivery ? "delivery" : isDineIn ? "dine-in" : "pickup"}`}>
                      {isDelivery ? <Bike size={12} /> : isDineIn ? <Utensils size={12} /> : <ShoppingBag size={12} />}
                      <span>{ord.orderType || "PICKUP"}</span>
                    </span>

                    {/* Status Badge */}
                    <span className={`badge-status-pill ${statusBadge.className}`}>
                      {statusBadge.showPulse && <span className="status-live-dot" />}
                      <span>{statusBadge.label}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Customer & Address Information Box */}
                <div className="customer-info-box">
                  <div className="customer-primary-row">
                    <div className="customer-name-label">
                      👤 <strong>{ord.customerNameSnapshot || ord.customerName || "Guest Customer"}</strong>
                    </div>

                    <a
                      href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`}
                      className="customer-call-btn"
                      title="Tap to call customer"
                    >
                      <Phone size={12} className="phone-icon" />
                      <span>{ord.customerPhoneSnapshot || ord.customerPhone}</span>
                    </a>
                  </div>

                  {isDelivery && (
                    <div className="customer-delivery-address">
                      <MapPin size={13} className="pin-icon" />
                      <div>
                        <strong className="address-area">{ord.deliveryAreaNameSnapshot || ord.deliveryAreaName}:</strong>{" "}
                        <span className="address-details">{ord.deliveryAddressSnapshot || ord.deliveryAddress}</span>
                        {ord.deliveryLandmarkSnapshot && (
                          <span className="address-landmark"> (Near: {ord.deliveryLandmarkSnapshot})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {isDineIn && (
                    <div className="customer-dinein-note">
                      🍽️ Dine-in: <strong>{ord.dineInPreferredTime || "ASAP"}</strong> ({ord.paymentLocation || "Table Service"})
                    </div>
                  )}
                </div>

                {/* Cancellation Alert Callout */}
                {ord.status === "Cancelled" && (
                  <div className="order-cancelled-notice">
                    <XCircle size={15} className="cancel-icon" />
                    <div>
                      <strong>Cancellation Reason: </strong>
                      <span>{ord.cancellationReason || "No specific reason provided"}</span>
                    </div>
                  </div>
                )}

                {/* Special Instructions Callout */}
                {ord.specialInstructions && (
                  <div className="order-special-note">
                    <AlertCircle size={14} className="note-icon" />
                    <div>
                      <strong>Customer Special Note: </strong>
                      <span>{ord.specialInstructions}</span>
                    </div>
                  </div>
                )}

                {/* 3. Items Header */}
                <div className="items-header-bar">
                  <span className="items-count-heading">
                    ORDER ITEMS ({ord.items?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleOrderExpand(ord.id)}
                    className="btn-expand-card-items"
                  >
                    <span>{isExpanded ? "Collapse" : "Expand All"}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* 4. Items List with High-Contrast Legibility */}
                <div className={`order-items-wrapper ${isExpanded ? "expanded" : "compact"}`}>
                  {ord.items?.map((item, idx) => {
                    const variantText = item.variantNameSnapshot || item.variantName;
                    const isDeal = variantText && (variantText.includes("•") || variantText.includes("+") || item.productName?.toLowerCase().includes("deal"));

                    return (
                      <div key={idx} className="order-item-row">
                        <div className="item-title-row">
                          <div className="item-name-col">
                            <span className="item-qty-badge">{item.quantity}x</span>
                            <span className="item-name-text">
                              {item.productNameSnapshot || item.productName}
                            </span>
                          </div>
                          <span className="item-price-text">{item.lineTotalPkr.toLocaleString()} PKR</span>
                        </div>

                        {/* Variant / Size Tag or Deal Contents */}
                        {variantText && (
                          isDeal ? (
                            /* Deal Contents Box */
                            <div className="item-deal-inclusions-box">
                              <span className="deal-box-label">Included Items:</span>
                              <div className="deal-box-content">{variantText}</div>
                            </div>
                          ) : (
                            /* Size Variant Tag */
                            <div className="item-size-tag-wrap">
                              <span className="item-size-pill">{variantText}</span>
                            </div>
                          )
                        )}

                        {/* Modifiers & Extra Toppings */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="item-modifiers-box">
                            {item.modifiers.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="modifier-item-line">
                                <span className="modifier-name">+ {m.name || m.modifierNameSnapshot}</span>
                                <span className="modifier-price">
                                  {(m.pricePkr || m.priceSnapshotPkr || 0) > 0
                                    ? `+${m.pricePkr || m.priceSnapshotPkr} PKR`
                                    : "Included"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 5. Card Footer: Pricing & Action Controls */}
                <div className="card-bottom-pinned">
                  {/* Financial Breakdown (When Expanded) */}
                  {isExpanded && (
                    <div className="order-fee-breakdown">
                      <div className="fee-line">
                        <span>Subtotal</span>
                        <span>{ord.subtotalPkr.toLocaleString()} PKR</span>
                      </div>
                      {ord.deliveryFeePkr > 0 && (
                        <div className="fee-line">
                          <span>Delivery Fee</span>
                          <span>+{ord.deliveryFeePkr} PKR</span>
                        </div>
                      )}
                      {(ord.discountPkr || 0) > 0 && (
                        <div className="fee-line discount">
                          <span>Discount Applied</span>
                          <span>-{ord.discountPkr} PKR</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cash Total Bar */}
                  <div className="total-cash-bar">
                    <span className="total-label">TOTAL (CASH ON DELIVERY)</span>
                    <span className="total-val">{ord.totalPkr.toLocaleString()} PKR</span>
                  </div>

                  {/* Operational POS Action Buttons */}
                  <div className="action-buttons-rack">
                    {/* 1. NEW -> CONFIRMED */}
                    {ord.status === "New" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                        className="btn-action-pos btn-confirm-call"
                        disabled={isUpdating}
                      >
                        <Phone size={14} />
                        <span>CONFIRM PHONE CALL</span>
                      </button>
                    )}

                    {/* 2. CONFIRMED -> PREPARING (Kitchen) */}
                    {ord.status === "Confirmed" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                        className="btn-action-pos btn-send-kitchen"
                        disabled={isUpdating}
                      >
                        <ChefHat size={15} />
                        <span>SEND TO KITCHEN</span>
                      </button>
                    )}

                    {/* 3. PREPARING -> READY */}
                    {ord.status === "Preparing" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                        className="btn-action-pos btn-mark-ready"
                        disabled={isUpdating}
                      >
                        <CheckCircle size={15} />
                        <span>MARK AS READY</span>
                      </button>
                    )}

                    {/* 4A. READY + DELIVERY -> OUT FOR DELIVERY (Rider) */}
                    {ord.status === "Ready" && isDelivery && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                        className="btn-action-pos btn-dispatch-rider"
                        disabled={isUpdating}
                      >
                        <Bike size={15} />
                        <span>DISPATCH RIDER</span>
                      </button>
                    )}

                    {/* 4B. READY + PICKUP/DINE_IN -> COMPLETED */}
                    {ord.status === "Ready" && !isDelivery && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                        className="btn-action-pos btn-mark-ready"
                        disabled={isUpdating}
                      >
                        <CheckCircle size={15} />
                        <span>HAND OVER ({ord.orderType || "PICKUP"})</span>
                      </button>
                    )}

                    {/* 5. OUT FOR DELIVERY -> COMPLETED */}
                    {ord.status === "Out for delivery" && (
                      <button
                        onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                        className="btn-action-pos btn-mark-ready"
                        disabled={isUpdating}
                      >
                        <CheckCircle size={15} />
                        <span>SETTLE &amp; COMPLETE</span>
                      </button>
                    )}

                    {/* Cancel Button */}
                    {ord.status !== "Completed" && ord.status !== "Cancelled" && (
                      <button
                        type="button"
                        onClick={() => onOpenCancelModal(ord)}
                        className="btn-action-cancel"
                        title="Cancel Order"
                      >
                        <XCircle size={14} />
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
        /* B. DENSE DATA TABLE VIEW */
        <div className="orders-table-wrapper">
          <table className="orders-data-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}></th>
                <th>Order #</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Type &amp; Destination</th>
                <th>Items Summary</th>
                <th>Total Cash</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
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
                      className={`orders-table-row ${isAnimating ? "anim-card-pulse" : ""}`}
                      onClick={() => toggleOrderExpand(ord.id)}
                    >
                      <td style={{ textAlign: "center" }}>
                        <button type="button" className="table-expand-arrow">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>
                      <td>
                        <strong className="table-order-num">#{ord.orderNumber}</strong>
                      </td>
                      <td>
                        <div className="table-time-text">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="table-time-rel">{formatRelativeTime(ord.createdAt)}</div>
                      </td>
                      <td>
                        <div className="table-cust-name">{ord.customerNameSnapshot || ord.customerName || "Guest"}</div>
                        <a
                          href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="table-cust-phone"
                        >
                          {ord.customerPhoneSnapshot || ord.customerPhone}
                        </a>
                      </td>
                      <td>
                        <span className={`table-badge-type ${isDelivery ? "delivery" : "pickup"}`}>
                          {ord.orderType}
                        </span>
                        <div className="table-area-text">
                          {ord.deliveryAreaNameSnapshot || ord.deliveryAreaName || "Storefront Counter"}
                        </div>
                      </td>
                      <td>
                        <div className="table-items-summary">
                          {ord.items?.map((it) => `${it.quantity}x ${it.productNameSnapshot || it.productName}`).join(", ")}
                        </div>
                      </td>
                      <td>
                        <strong className="table-cash-num">{ord.totalPkr.toLocaleString()} PKR</strong>
                      </td>
                      <td>
                        <span className={`table-status-pill ${ord.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions-cluster">
                          {ord.status === "New" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                              className="btn-table-action confirm"
                            >
                              Confirm
                            </button>
                          )}
                          {ord.status === "Confirmed" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                              className="btn-table-action kitchen"
                            >
                              Kitchen
                            </button>
                          )}
                          {ord.status === "Preparing" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                              className="btn-table-action ready"
                            >
                              Ready
                            </button>
                          )}
                          {ord.status === "Ready" && isDelivery && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                              className="btn-table-action dispatch"
                            >
                              Dispatch
                            </button>
                          )}
                          {ord.status === "Ready" && !isDelivery && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                              className="btn-table-action ready"
                            >
                              Handover
                            </button>
                          )}
                          {ord.status === "Out for delivery" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                              className="btn-table-action ready"
                            >
                              Settle
                            </button>
                          )}
                          {ord.status !== "Completed" && ord.status !== "Cancelled" && (
                            <button
                              onClick={() => onOpenCancelModal(ord)}
                              className="btn-table-action cancel"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Table Row Accordion Expansion */}
                    {isExpanded && (
                      <tr className="table-expanded-row">
                        <td colSpan={9}>
                          <div className="table-expanded-content">
                            <div className="expanded-details-grid">
                              {/* Left: Items Breakdown */}
                              <div>
                                <h4 className="expanded-box-heading">Itemized Order Breakdown</h4>
                                <div className="expanded-items-list">
                                  {ord.items?.map((it, itIdx) => (
                                    <div key={itIdx} className="expanded-item-row">
                                      <div>
                                        <strong className="expanded-qty">{it.quantity}x</strong>{" "}
                                        <span className="expanded-name">{it.productNameSnapshot || it.productName}</span>
                                        {(it.variantNameSnapshot || it.variantName) && (
                                          <div className="expanded-variant">{it.variantNameSnapshot || it.variantName}</div>
                                        )}
                                      </div>
                                      <strong className="expanded-line-total">{it.lineTotalPkr.toLocaleString()} PKR</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Address & Instructions */}
                              <div className="expanded-right-col">
                                <h4 className="expanded-box-heading">Fulfillment Details</h4>
                                <div className="expanded-info-item">
                                  <span>Customer:</span>
                                  <strong>{ord.customerNameSnapshot || ord.customerName}</strong>
                                </div>
                                <div className="expanded-info-item">
                                  <span>Phone:</span>
                                  <strong>{ord.customerPhoneSnapshot || ord.customerPhone}</strong>
                                </div>
                                {isDelivery && (
                                  <div className="expanded-info-item">
                                    <span>Delivery Address:</span>
                                    <strong>
                                      {ord.deliveryAreaNameSnapshot || ord.deliveryAreaName} — {ord.deliveryAddressSnapshot || ord.deliveryAddress}
                                    </strong>
                                  </div>
                                )}
                                {ord.specialInstructions && (
                                  <div className="expanded-note-box">
                                    <strong>Customer Note:</strong> {ord.specialInstructions}
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

      {/* Scoped CSS Styles for Crystal Clear Visibility */}
      <style jsx>{`
        .admin-orders-scope {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* 1. KPI Cards */
        .kpi-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
          gap: 12px;
        }
        .kpi-metric-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .kpi-metric-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }
        .kpi-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .kpi-card-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .kpi-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-card-icon.blue { background: #eff6ff; color: #2563eb; }
        .kpi-card-icon.amber { background: #fef3c7; color: #d97706; }
        .kpi-card-icon.orange { background: #ffedd5; color: #ea580c; }
        .kpi-card-icon.purple { background: #f3e8ff; color: #9333ea; }
        .kpi-card-icon.green { background: #ecfdf5; color: #059669; }

        .kpi-card-num {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .currency-label {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }
        .kpi-card-sub {
          font-size: 11.5px;
          font-weight: 600;
          margin-top: 4px;
        }

        /* 2. Toolbar & Filters */
        .orders-toolbar-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }
        .orders-search-wrapper {
          position: relative;
          width: 320px;
          max-width: 100%;
        }
        :global(.search-icon-fixed) {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .orders-search-input {
          width: 100%;
          padding: 8px 34px 8px 36px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .orders-search-input:focus {
          border-color: #ff6b35;
          background: #ffffff;
        }
        .search-clear-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .orders-filter-pills-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .order-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .order-filter-pill:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .order-filter-pill.active {
          background: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
          box-shadow: 0 2px 6px rgba(255, 107, 53, 0.25);
        }
        .pill-counter {
          font-size: 10px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 10px;
          background: #e2e8f0;
          color: #475569;
        }
        .counter-active {
          background: rgba(0, 0, 0, 0.25);
          color: #ffffff;
        }

        .orders-view-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-toggle-expand {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 7px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 11.5px;
          font-weight: 750;
          cursor: pointer;
        }
        .view-mode-toggle-group {
          display: inline-flex;
          background: #f1f5f9;
          border-radius: 7px;
          padding: 2px;
          border: 1px solid #e2e8f0;
        }
        .view-mode-btn {
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 750;
          border-radius: 5px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
        }
        .view-mode-btn.active {
          background: #ffffff;
          color: #ff6b35;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        /* 3. Empty State */
        .orders-empty-state {
          text-align: center;
          padding: 64px 20px;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
        }
        :global(.empty-clock-icon) {
          margin: 0 auto 12px;
          color: #94a3b8;
        }
        .empty-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .empty-desc {
          font-size: 13px;
          color: #64748b;
        }

        /* 4. POS Card Grid */
        .orders-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .order-pos-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          position: relative;
        }
        .order-pos-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
        }
        .anim-card-pulse {
          animation: cardSuccessPulse 0.5s ease-out forwards;
        }
        @keyframes cardSuccessPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { transform: scale(1.015); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        /* Header Row */
        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 8px;
        }
        .order-id-group {
          display: flex;
          flex-direction: column;
        }
        .order-id-text {
          font-family: var(--font-display, inherit);
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .order-time-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }
        .time-relative-dot {
          color: #cbd5e1;
        }
        .time-relative-text {
          color: #475569;
          font-weight: 700;
        }

        .order-badges-group {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .badge-type {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 5px;
          letter-spacing: 0.03em;
        }
        .badge-type.delivery {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .badge-type.pickup {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .badge-type.dine-in {
          background: #faf5ff;
          color: #7e22ce;
          border: 1px solid #e9d5ff;
        }

        .badge-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 5px;
          letter-spacing: 0.03em;
        }
        .badge-status-new {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        .badge-status-confirmed {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .badge-status-preparing {
          background: #ffedd5;
          color: #c2410c;
          border: 1px solid #fdba74;
        }
        .badge-status-ready {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .badge-status-delivery {
          background: #e0e7ff;
          color: #4338ca;
          border: 1px solid #a5b4fc;
        }
        .badge-status-completed {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .badge-status-cancelled {
          background: #ffe4e6;
          color: #be123c;
          border: 1px solid #fca5a5;
        }
        .status-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d97706;
          box-shadow: 0 0 6px #d97706;
          animation: pulseDot 1.4s infinite;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        /* Customer Box */
        .customer-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .customer-primary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .customer-name-label {
          font-size: 13px;
          color: #0f172a;
        }
        .customer-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 750;
          font-size: 12px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .customer-call-btn:hover {
          border-color: #16a34a;
          color: #16a34a;
          background: #f0fdf4;
        }
        :global(.phone-icon) {
          color: #16a34a;
        }

        .customer-delivery-address {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 11.5px;
          color: #334155;
          line-height: 1.35;
        }
        :global(.pin-icon) {
          color: #ea580c;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .address-area {
          color: #0f172a;
        }
        .address-details {
          color: #334155;
        }
        .address-landmark {
          color: #64748b;
          font-style: italic;
        }
        .customer-dinein-note {
          font-size: 11.5px;
          color: #7e22ce;
          font-weight: 600;
        }

        /* Notices */
        .order-cancelled-notice {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 11.5px;
          color: #be123c;
          margin-bottom: 10px;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        :global(.cancel-icon) {
          color: #be123c;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .order-special-note {
          background: #fefce8;
          border: 1px solid #fef08a;
          border-left: 3px solid #eab308;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 11.5px;
          color: #713f12;
          margin-bottom: 10px;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        :global(.note-icon) {
          color: #ca8a04;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Items Section */
        .items-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .items-count-heading {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .btn-expand-card-items {
          background: none;
          border: none;
          color: #ff6b35;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 2px 4px;
        }

        /* Items Content */
        .order-items-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
          transition: all 0.2s ease;
        }
        .order-items-wrapper.compact {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .order-items-wrapper.expanded {
          max-height: 500px;
          overflow-y: auto;
        }

        .order-item-row {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .item-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .item-name-col {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex: 1;
        }
        .item-qty-badge {
          background: #ffedd5;
          color: #c2410c;
          border: 1px solid #fed7aa;
          font-size: 11.5px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .item-name-text {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }
        .item-price-text {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          flex-shrink: 0;
        }

        /* Deal Inclusions Clean Box */
        .item-deal-inclusions-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 6px 8px;
          margin-top: 5px;
          font-size: 11px;
          line-height: 1.4;
        }
        .deal-box-label {
          font-weight: 800;
          color: #92400e;
          display: block;
          margin-bottom: 2px;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: 0.04em;
        }
        .deal-box-content {
          color: #78350f;
          font-weight: 600;
        }

        /* Size Pill */
        .item-size-tag-wrap {
          margin-top: 4px;
        }
        .item-size-pill {
          display: inline-block;
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          font-size: 11px;
          font-weight: 750;
          padding: 1px 6px;
          border-radius: 4px;
        }

        /* Modifiers List */
        .item-modifiers-box {
          margin-top: 6px;
          padding-left: 8px;
          border-left: 2px solid #ff6b35;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .modifier-item-line {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #475569;
        }
        .modifier-name {
          font-weight: 600;
        }
        .modifier-price {
          font-weight: 750;
          color: #0f172a;
        }

        /* Pinned Footer */
        .card-bottom-pinned {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px dashed #e2e8f0;
        }
        .order-fee-breakdown {
          background: #f8fafc;
          border-radius: 6px;
          padding: 6px 8px;
          margin-bottom: 8px;
          font-size: 11.5px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fee-line {
          display: flex;
          justify-content: space-between;
        }
        .fee-line.discount {
          color: #15803d;
          font-weight: 750;
        }

        .total-cash-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .total-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.04em;
        }
        .total-val {
          font-family: var(--font-display, inherit);
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        /* POS Action Buttons */
        .action-buttons-rack {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-action-pos {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 42px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 850;
          border: none;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: transform 0.1s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-action-pos:active {
          transform: scale(0.98);
        }
        .btn-action-pos:hover {
          filter: brightness(1.06);
        }

        .btn-confirm-call {
          background: #ff6b35;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
        }
        .btn-send-kitchen {
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
        }
        .btn-mark-ready {
          background: #10b981;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        }
        .btn-dispatch-rider {
          background: #4f46e5;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
        }

        .btn-action-cancel {
          height: 42px;
          padding: 0 14px;
          background: #ffffff;
          border: 1px solid #fecdd3;
          color: #e11d48;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
        }
        .btn-action-cancel:hover {
          background: #fff1f2;
          border-color: #fda4af;
          color: #be123c;
        }

        /* 5. Dense Data Table */
        .orders-table-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }
        .orders-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
        }
        .orders-data-table thead tr {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .orders-data-table th {
          padding: 12px 14px;
          font-weight: 800;
          color: #475569;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .orders-table-row {
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .orders-table-row:hover {
          background: #f8fafc;
        }
        .orders-data-table td {
          padding: 12px 14px;
        }
        .table-expand-arrow {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }
        .table-order-num {
          font-weight: 900;
          color: #0f172a;
          font-size: 13.5px;
        }
        .table-time-text {
          font-weight: 700;
          color: #0f172a;
        }
        .table-time-rel {
          font-size: 11px;
          color: #64748b;
        }
        .table-cust-name {
          font-weight: 800;
          color: #0f172a;
        }
        .table-cust-phone {
          color: #16a34a;
          font-weight: 700;
          font-size: 11.5px;
          text-decoration: none;
        }
        .table-badge-type {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 2px;
        }
        .table-badge-type.delivery { background: #eff6ff; color: #1d4ed8; }
        .table-badge-type.pickup { background: #ecfdf5; color: #047857; }
        .table-area-text {
          font-size: 11px;
          color: #64748b;
        }
        .table-items-summary {
          font-size: 12px;
          color: #334155;
          max-width: 240px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .table-cash-num {
          font-weight: 900;
          color: #0f172a;
          font-size: 13px;
        }
        .table-status-pill {
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 5px;
          display: inline-block;
        }
        .table-status-pill.new { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
        .table-status-pill.confirmed { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
        .table-status-pill.preparing { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
        .table-status-pill.ready { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .table-status-pill.out-for-delivery { background: #e0e7ff; color: #4338ca; border: 1px solid #a5b4fc; }
        .table-status-pill.completed { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .table-status-pill.cancelled { background: #ffe4e6; color: #be123c; border: 1px solid #fca5a5; }

        .table-actions-cluster {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: flex-end;
        }
        .btn-table-action {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          border: none;
          cursor: pointer;
        }
        .btn-table-action.confirm { background: #ff6b35; color: #ffffff; }
        .btn-table-action.kitchen { background: #ea580c; color: #ffffff; }
        .btn-table-action.ready { background: #10b981; color: #ffffff; }
        .btn-table-action.dispatch { background: #4f46e5; color: #ffffff; }
        .btn-table-action.cancel { background: #ffffff; border: 1px solid #fecdd3; color: #e11d48; }

        .table-expanded-row {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .table-expanded-content {
          padding: 14px 20px;
        }
        .expanded-details-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        .expanded-box-heading {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
          letter-spacing: 0.04em;
        }
        .expanded-items-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .expanded-item-row {
          display: flex;
          justify-content: space-between;
          padding-bottom: 4px;
          border-bottom: 1px dashed #e2e8f0;
          font-size: 12.5px;
        }
        .expanded-qty { color: #ea580c; }
        .expanded-name { font-weight: 750; color: #0f172a; }
        .expanded-variant { font-size: 11px; color: #64748b; margin-top: 1px; }
        .expanded-line-total { color: #0f172a; font-weight: 800; }

        .expanded-right-col {
          border-left: 1px solid #e2e8f0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
        }
        .expanded-info-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .expanded-info-item span { color: #64748b; font-size: 11px; }
        .expanded-info-item strong { color: #0f172a; }
        .expanded-note-box {
          background: #fefce8;
          border: 1px solid #fef08a;
          padding: 6px 10px;
          border-radius: 6px;
          color: #713f12;
          font-size: 11.5px;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
