"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  ShoppingBag,
  DollarSign,
  MapPin,
  ChevronRight,
  User,
} from "lucide-react";
import { EyeIcon, PackageIcon } from "./AdminIcons";

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

interface AvailableRider {
  id: string;
  fullName: string;
  phone: string | null;
  activeOrdersAssigned: number;
}

// Helpers
const isDeliveryOrder = (type?: string | null) => {
  if (!type) return false;
  return String(type).trim().toUpperCase() === "DELIVERY";
};

const isTerminalStatus = (status: OrderStatus) => {
  return status === ORDER_STATUSES.COMPLETED || status === ORDER_STATUSES.CANCELLED;
};


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

  // Selected Order for the Side Drawer
  const [selectedDrawerOrderId, setSelectedDrawerOrderId] = useState<string | null>(null);

  // Available Riders for Assignment
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [selectedRiderForAssign, setSelectedRiderForAssign] = useState<string>("");
  const [isAssigningRider, setIsAssigningRider] = useState(false);

  // Fetch active delivery riders
  useEffect(() => {
    fetch("/api/v1/admin/staff")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const riders = d.data
            .filter((s: any) => s.role === "RIDER" && s.isActive)
            .map((s: any) => ({
              id: s.id,
              fullName: s.fullName || "Delivery Rider",
              phone: s.phone || null,
              activeOrdersAssigned: Number(s.activeOrdersAssigned || 0),
            }));
          setAvailableRiders(riders);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (orderStatusFilter === "active") {
        if (isTerminalStatus(o.status)) {
          return false;
        }
      } else if (orderStatusFilter === "NEW") {
        if (o.status !== ORDER_STATUSES.NEW) return false;
      } else if (orderStatusFilter === "CONFIRMED") {
        if (o.status !== ORDER_STATUSES.CONFIRMED) return false;
      } else if (orderStatusFilter === "PREPARING") {
        if (o.status !== ORDER_STATUSES.PREPARING) return false;
      } else if (orderStatusFilter === "READY") {
        if (o.status !== ORDER_STATUSES.READY) return false;
      } else if (orderStatusFilter === "OUT_FOR_DELIVERY") {
        if (o.status !== ORDER_STATUSES.OUT_FOR_DELIVERY) return false;
      } else if (orderStatusFilter === "COMPLETED") {
        if (o.status !== ORDER_STATUSES.COMPLETED) return false;
      } else if (orderStatusFilter === "CANCELLED") {
        if (o.status !== ORDER_STATUSES.CANCELLED) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (o.orderNumber || "").toLowerCase().includes(q);
        const matchesName = (o.customerName || o.customerNameSnapshot || "").toLowerCase().includes(q);
        const matchesPhone = (o.customerPhone || o.customerPhoneSnapshot || "").toLowerCase().includes(q);
        const matchesItem = (o.items || []).some((item) =>
          (item.productName || item.productNameSnapshot || "").toLowerCase().includes(q)
        );
        const matchesReason = (o.cancellationReason || "").toLowerCase().includes(q);
        return matchesNum || matchesName || matchesPhone || matchesItem || matchesReason;
      }

      return true;
    });
  }, [orders, orderStatusFilter, searchQuery]);

  // Current order in drawer (reactive to state updates)
  const drawerOrder = useMemo(() => {
    if (!selectedDrawerOrderId) return null;
    return orders.find((o) => o.id === selectedDrawerOrderId) || null;
  }, [orders, selectedDrawerOrderId]);

  // KPIs
  const activeOrdersCount = orders.filter((o) => !isTerminalStatus(o.status)).length;
  const newOrdersCount = orders.filter((o) => o.status === ORDER_STATUSES.NEW).length;
  const kitchenCookingCount = orders.filter((o) => o.status === ORDER_STATUSES.PREPARING).length;
  const transitCount = orders.filter((o) => o.status === ORDER_STATUSES.OUT_FOR_DELIVERY).length;
  const readyCount = orders.filter((o) => o.status === ORDER_STATUSES.READY).length;
  const activePipelineCash = orders
    .filter((o) => !isTerminalStatus(o.status))
    .reduce((acc, curr) => acc + (curr.totalPkr || 0), 0);


  // Status Counts
  const countNew = orders.filter((o) => o.status === ORDER_STATUSES.NEW).length;
  const countConfirmed = orders.filter((o) => o.status === ORDER_STATUSES.CONFIRMED).length;
  const countKitchen = orders.filter((o) => o.status === ORDER_STATUSES.PREPARING).length;
  const countReady = orders.filter((o) => o.status === ORDER_STATUSES.READY).length;
  const countDispatched = orders.filter((o) => o.status === ORDER_STATUSES.OUT_FOR_DELIVERY).length;
  const countCompleted = orders.filter((o) => o.status === ORDER_STATUSES.COMPLETED).length;
  const countCancelled = orders.filter((o) => o.status === ORDER_STATUSES.CANCELLED).length;

  // Handle Assigning Rider
  const handleAssignRiderSubmit = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    setIsAssigningRider(true);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      await onUpdateOrderStatus(orderId, order.status, { assignedRiderId: riderId });
      setSelectedRiderForAssign("");
    } finally {
      setIsAssigningRider(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "New":
        return (
          <span className="pos-badge badge-new">
            <span className="live-pulse-dot" /> NEW
          </span>
        );
      case "Confirmed":
        return <span className="pos-badge badge-confirmed">CONFIRMED</span>;
      case "Preparing":
        return (
          <span className="pos-badge badge-cooking">
            <ChefHat size={12} /> KITCHEN
          </span>
        );
      case "Ready":
        return (
          <span className="pos-badge badge-ready">
            <CheckCircle size={12} /> READY
          </span>
        );
      case "Out for delivery":
        return (
          <span className="pos-badge badge-transit">
            <Bike size={12} /> IN-TRANSIT
          </span>
        );
      case "Completed":
        return <span className="pos-badge badge-completed">COMPLETED</span>;
      case "Cancelled":
        return <span className="pos-badge badge-cancelled">CANCELLED</span>;
      default:
        return <span className="pos-badge badge-default">{status}</span>;
    }
  };

  // Primary Action Button Helper
  const renderPrimaryAction = (ord: Order) => {
    const isDelivery = isDeliveryOrder(ord.orderType);

    if (ord.status === "New") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED);
          }}
          className="btn-action-primary btn-confirm"
          disabled={isUpdating}
        >
          <Phone size={14} />
          <span>CONFIRM CALL</span>
        </button>
      );
    }

    if (ord.status === "Confirmed") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING);
          }}
          className="btn-action-primary btn-kitchen"
          disabled={isUpdating}
        >
          <ChefHat size={14} />
          <span>SEND TO KITCHEN</span>
        </button>
      );
    }

    if (ord.status === "Preparing") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.READY);
          }}
          className="btn-action-primary btn-ready"
          disabled={isUpdating}
        >
          <CheckCircle size={14} />
          <span>MARK READY</span>
        </button>
      );
    }

    if (ord.status === "Ready" && isDelivery) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY);
          }}
          className="btn-action-primary btn-dispatch"
          disabled={isUpdating}
        >
          <Bike size={14} />
          <span>DISPATCH RIDER</span>
        </button>
      );
    }

    if (ord.status === "Ready" && !isDelivery) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED);
          }}
          className="btn-action-primary btn-ready"
          disabled={isUpdating}
        >
          <CheckCircle size={14} />
          <span>HAND OVER ({ord.orderType || "PICKUP"})</span>
        </button>
      );
    }

    if (ord.status === "Out for delivery") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED);
          }}
          className="btn-action-primary btn-ready"
          disabled={isUpdating}
        >
          <CheckCircle size={14} />
          <span>SETTLE &amp; COMPLETE</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="admin-orders-container">
      {/* 1. TOP EXECUTIVE KPI METRICS BAR */}
      <div className="orders-kpi-bar">
        <div className="kpi-card">
          <div className="kpi-icon-box blue">
            <ShoppingBag size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Active Orders</span>
            <span className="kpi-val">{activeOrdersCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box amber">
            <Phone size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Needs Phone Call</span>
            <span className="kpi-val text-amber">{newOrdersCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box orange">
            <ChefHat size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Kitchen Cooking</span>
            <span className="kpi-val text-orange">{kitchenCookingCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box green">
            <CheckCircle size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Food Ready</span>
            <span className="kpi-val text-emerald">{readyCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box purple">
            <Bike size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Rider In-Transit</span>
            <span className="kpi-val text-purple">{transitCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box emerald">
            <DollarSign size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Active Cash Pipeline</span>
            <span className="kpi-val text-emerald">{activePipelineCash.toLocaleString()} PKR</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="orders-control-bar">
        <div className="search-box-wrapper">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search order #, customer, phone, item, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="btn-clear-search">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="filter-pills-scroll">
          <button
            onClick={() => setOrderStatusFilter("active")}
            className={`pos-filter-pill ${orderStatusFilter === "active" ? "active" : ""}`}
          >
            <span>ALL ACTIVE</span>
            <span className="pill-count">{activeOrdersCount}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("NEW")}
            className={`pos-filter-pill ${orderStatusFilter === "NEW" ? "active" : ""}`}
          >
            <span>NEW</span>
            <span className="pill-count">{countNew}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("CONFIRMED")}
            className={`pos-filter-pill ${orderStatusFilter === "CONFIRMED" ? "active" : ""}`}
          >
            <span>CONFIRMED</span>
            <span className="pill-count">{countConfirmed}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("PREPARING")}
            className={`pos-filter-pill ${orderStatusFilter === "PREPARING" ? "active" : ""}`}
          >
            <span>KITCHEN</span>
            <span className="pill-count">{countKitchen}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("READY")}
            className={`pos-filter-pill ${orderStatusFilter === "READY" ? "active" : ""}`}
          >
            <span>READY</span>
            <span className="pill-count">{countReady}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("OUT_FOR_DELIVERY")}
            className={`pos-filter-pill ${orderStatusFilter === "OUT_FOR_DELIVERY" ? "active" : ""}`}
          >
            <span>DISPATCHED</span>
            <span className="pill-count">{countDispatched}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("COMPLETED")}
            className={`pos-filter-pill ${orderStatusFilter === "COMPLETED" ? "active" : ""}`}
          >
            <span>COMPLETED</span>
            <span className="pill-count">{countCompleted}</span>
          </button>
          <button
            onClick={() => setOrderStatusFilter("CANCELLED")}
            className={`pos-filter-pill ${orderStatusFilter === "CANCELLED" ? "active" : ""}`}
          >
            <span>CANCELLED</span>
            <span className="pill-count">{countCancelled}</span>
          </button>
        </div>

        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode("grid")}
            className={`btn-view-toggle ${viewMode === "grid" ? "active" : ""}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`btn-view-toggle ${viewMode === "table" ? "active" : ""}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* 3. COMPACT ORDER CARDS (DESKTOP & MOBILE COMPACT VIEW) */}
      {viewMode === "grid" && (
        <div className="compact-orders-grid">
          {filteredOrders.map((ord) => {
            const isDelivery = isDeliveryOrder(ord.orderType);
            const itemsCount = (ord.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
            const assignedRider = availableRiders.find((r) => r.id === ord.assignedRiderId);

            return (
              <div
                key={ord.id}
                onClick={() => setSelectedDrawerOrderId(ord.id)}
                className={`compact-order-card ${ord.status === "New" ? "is-new" : ""}`}
              >
                {/* 1. Header Row */}
                <div className="card-top-row">
                  <div className="order-id-box">
                    <span className="order-num">{ord.orderNumber}</span>
                    <span className="time-ago">{formatRelativeTime(ord.createdAt)}</span>
                  </div>

                  <div className="status-badges-group">
                    <span className={`type-badge ${isDelivery ? "delivery" : "pickup"}`}>
                      {isDelivery ? <Bike size={11} /> : <ShoppingBag size={11} />}
                      {ord.orderType || "DELIVERY"}
                    </span>
                    {renderStatusBadge(ord.status)}
                  </div>
                </div>

                {/* 2. Customer & Phone Line */}
                <div className="card-customer-row">
                  <span className="customer-name">{ord.customerName || ord.customerNameSnapshot || "Customer"}</span>
                  <a
                    href={`tel:${ord.customerPhone || ord.customerPhoneSnapshot || ""}`}
                    onClick={(e) => e.stopPropagation()}
                    className="customer-phone-chip"
                  >
                    <Phone size={11} /> {ord.customerPhone || ord.customerPhoneSnapshot}
                  </a>
                </div>

                {/* 3. Address Line (if delivery) */}
                {isDelivery && (
                  <div className="card-address-row">
                    <MapPin size={12} color="#ea580c" />
                    <span className="address-text">
                      <strong>{ord.deliveryAreaName || ord.deliveryAreaNameSnapshot || "Area"}:</strong> {ord.deliveryAddress || ord.deliveryAddressSnapshot || "Address provided"}
                    </span>
                  </div>
                )}

                {/* 4. Compact Item Summary Strip (Collapsed by default) */}
                <div className="card-item-summary-strip">
                  <div className="item-count-chip">
                    <PackageIcon size={13} color="#475569" />
                    <span>
                      {itemsCount} {itemsCount === 1 ? "Item" : "Items"} (
                      {(ord.items || [])
                        .slice(0, 2)
                        .map((it) => it.productName || it.productNameSnapshot)
                        .join(", ")}
                      {(ord.items || []).length > 2 ? "..." : ""})
                    </span>
                  </div>

                  <span className="btn-open-drawer-hint">
                    View Details <ChevronRight size={13} />
                  </span>
                </div>

                {/* 5. Assigned Rider Strip (If delivery) */}
                {isDelivery && (
                  <div className="card-rider-strip">
                    <span className="rider-label">
                      <Bike size={12} />
                      {assignedRider ? `Rider: ${assignedRider.fullName}` : "Rider: Unassigned"}
                    </span>
                  </div>
                )}

                {/* 6. Bottom Price & Primary POS Action Row */}
                <div className="card-bottom-row" onClick={(e) => e.stopPropagation()}>
                  <div className="price-block">
                    <span className="price-label">TOTAL (COD)</span>
                    <span className="price-val">{ord.totalPkr.toLocaleString()} PKR</span>
                  </div>

                  <div className="actions-block">
                    {renderPrimaryAction(ord)}

                    {/* Quick Cancel Button */}
                    {!isTerminalStatus(ord.status) && (
                      <button
                        onClick={() => onOpenCancelModal(ord)}
                        className="btn-cancel-icon"
                        title="Cancel Order"
                        disabled={isUpdating}
                      >

                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="empty-orders-state">
              <AlertCircle size={36} color="#94a3b8" />
              <h3>No Orders Found</h3>
              <p>No orders match the current filter or search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. TABLE VIEW */}
      {viewMode === "table" && (
        <div className="orders-table-wrapper">
          <table className="orders-data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Status</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Items</th>
                <th>Total PKR</th>
                <th>Assigned Rider</th>
                <th>Time</th>
                <th style={{ textAlign: "right" }}>Primary Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                const isDelivery = isDeliveryOrder(ord.orderType);
                const itemsCount = (ord.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
                const assignedRider = availableRiders.find((r) => r.id === ord.assignedRiderId);

                return (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedDrawerOrderId(ord.id)}
                    className="table-order-row"
                  >
                    <td>
                      <span className="tbl-order-num">{ord.orderNumber}</span>
                    </td>
                    <td>{renderStatusBadge(ord.status)}</td>
                    <td>
                      <span className={`type-badge ${isDelivery ? "delivery" : "pickup"}`}>
                        {ord.orderType || "DELIVERY"}
                      </span>
                    </td>
                    <td>
                      <strong>{ord.customerName}</strong>
                    </td>
                    <td>
                      <a
                        href={`tel:${ord.customerPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="customer-phone-chip"
                      >
                        {ord.customerPhone}
                      </a>
                    </td>
                    <td>
                      <span className="tbl-items-pill">
                        {itemsCount} {itemsCount === 1 ? "Item" : "Items"}
                      </span>
                    </td>
                    <td>
                      <strong>{ord.totalPkr.toLocaleString()} PKR</strong>
                    </td>
                    <td>
                      {isDelivery ? (
                        <span className={assignedRider ? "rider-tag assigned" : "rider-tag unassigned"}>
                          {assignedRider ? assignedRider.fullName : "Unassigned"}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="tbl-time">{formatRelativeTime(ord.createdAt)}</span>
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {renderPrimaryAction(ord)}
                        {!isTerminalStatus(ord.status) && (
                          <button
                            onClick={() => onOpenCancelModal(ord)}
                            className="btn-cancel-icon"
                            title="Cancel Order"
                            disabled={isUpdating}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. ORDER DETAIL SIDE DRAWER (HIGH-CONTRAST FULL POS DETAILS) */}
      {drawerOrder && (
        <div
          className="drawer-backdrop"
          onClick={() => setSelectedDrawerOrderId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 className="drawer-order-num">{drawerOrder.orderNumber}</h2>
                  {renderStatusBadge(drawerOrder.status)}
                </div>
                <span className="drawer-order-time">
                  Placed {new Date(drawerOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {formatRelativeTime(drawerOrder.createdAt)}
                </span>
              </div>

              <button
                onClick={() => setSelectedDrawerOrderId(null)}
                className="btn-close-drawer"
                title="Close drawer (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="drawer-body">
              {/* SECTION A: CUSTOMER & DESTINATION */}
              <div className="drawer-section-card">
                <h4 className="drawer-sec-title">
                  <User size={15} /> Customer &amp; Delivery Destination
                </h4>
                <div className="drawer-info-grid">
                  <div>
                    <span className="info-lbl">Customer Name</span>
                    <strong className="info-val">{drawerOrder.customerName || drawerOrder.customerNameSnapshot || "Customer"}</strong>
                  </div>
                  <div>
                    <span className="info-lbl">Phone Contact</span>
                    <a href={`tel:${drawerOrder.customerPhone || drawerOrder.customerPhoneSnapshot || ""}`} className="drawer-phone-link">
                      <Phone size={13} /> {drawerOrder.customerPhone || drawerOrder.customerPhoneSnapshot}
                    </a>
                  </div>
                  <div>
                    <span className="info-lbl">Order Type</span>
                    <span className={`type-badge ${isDeliveryOrder(drawerOrder.orderType) ? "delivery" : "pickup"}`}>
                      {drawerOrder.orderType || "DELIVERY"}
                    </span>
                  </div>
                  <div>
                    <span className="info-lbl">Delivery Area</span>
                    <span className="info-val">{drawerOrder.deliveryAreaName || drawerOrder.deliveryAreaNameSnapshot || "Default Sector"}</span>
                  </div>
                </div>

                {isDeliveryOrder(drawerOrder.orderType) && (
                  <div className="drawer-address-box">
                    <MapPin size={14} color="#ea580c" />
                    <span>{drawerOrder.deliveryAddress || drawerOrder.deliveryAddressSnapshot || "Address details"}</span>
                  </div>
                )}

                {drawerOrder.specialInstructions && (
                  <div className="drawer-kitchen-notes-box">
                    <strong>Cooking / Delivery Instructions:</strong>
                    <p>{drawerOrder.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* SECTION B: ORDER ITEMS & CUSTOMIZATIONS */}
              <div className="drawer-section-card">
                <h4 className="drawer-sec-title">
                  <PackageIcon size={15} /> Order Items ({(drawerOrder.items || []).length})
                </h4>

                <div className="drawer-items-list">
                  {(drawerOrder.items || []).map((item, idx) => {
                    const itemName = item.productName || item.productNameSnapshot || "Menu Item";
                    const itemVariant = item.variantName || item.variantNameSnapshot;
                    const unitPrice = item.unitPriceSnapshotPkr || item.unitPricePkr || 0;
                    const linePrice = item.lineTotalPkr || (unitPrice * item.quantity);
                    const dealItems = (item as any).dealItems as any[] | undefined;

                    return (
                      <div key={item.id || idx} className="drawer-item-row">
                        <div className="item-main-col">
                          <div className="item-title-line">
                            <span className="item-qty-badge">{item.quantity}x</span>
                            <strong className="item-name">{itemName}</strong>
                          </div>

                          {/* Portion Variant */}
                          {itemVariant && (
                            <div className="item-variant-chip">
                              Portion: {itemVariant}
                            </div>
                          )}

                          {/* Deal Inclusions */}
                          {dealItems && dealItems.length > 0 && (
                            <div className="drawer-deal-box">
                              <span className="deal-box-header">Deal Inclusions:</span>
                              {dealItems.map((di: any, dIdx: number) => (
                                <div key={dIdx} className="deal-bullet-item">
                                  • {di.quantity ? `${di.quantity}x ` : ""}{di.productName || di.productNameSnapshot}
                                  {di.selectedOptions && di.selectedOptions.length > 0 && (
                                    <span className="deal-sub-options">
                                      {" "}({di.selectedOptions.map((o: any) => o.optionName || o.name).join(", ")})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Modifiers / Dips */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="item-modifiers-row">
                              Add-ons: {item.modifiers.map((m) => `${m.modifierNameSnapshot || (m as any).name || "Add-on"} (+${m.priceSnapshotPkr ?? (m as any).pricePkr ?? 0} PKR)`).join(", ")}
                            </div>
                          )}
                        </div>

                        <div className="item-price-col">
                          <strong>{linePrice.toLocaleString()} PKR</strong>
                          <span className="unit-price-sub">({unitPrice} each)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: RIDER ASSIGNMENT (If Delivery) */}
              {isDeliveryOrder(drawerOrder.orderType) && (
                <div className="drawer-section-card">
                  <h4 className="drawer-sec-title">
                    <Bike size={15} /> Delivery Rider Assignment
                  </h4>

                  <div className="rider-assign-controls">
                    <select
                      value={selectedRiderForAssign || drawerOrder.assignedRiderId || ""}
                      onChange={(e) => setSelectedRiderForAssign(e.target.value)}
                      className="rider-select-input"
                    >
                      <option value="">-- Select Active Delivery Rider --</option>
                      {availableRiders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName} ({r.activeOrdersAssigned} active deliveries) {r.phone ? `• ${r.phone}` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedRiderForAssign || isAssigningRider}
                      onClick={() => handleAssignRiderSubmit(drawerOrder.id, selectedRiderForAssign)}
                      className="btn-assign-rider"
                    >
                      {isAssigningRider ? "Assigning..." : "Assign Rider"}
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION D: PAYMENT BREAKDOWN */}
              <div className="drawer-section-card">
                <h4 className="drawer-sec-title">
                  <DollarSign size={15} /> Payment Breakdown
                </h4>

                <div className="payment-summary-rows">
                  <div className="pay-row">
                    <span>Subtotal</span>
                    <span>{drawerOrder.subtotalPkr.toLocaleString()} PKR</span>
                  </div>
                  <div className="pay-row">
                    <span>Delivery Fee</span>
                    <span>+{drawerOrder.deliveryFeePkr.toLocaleString()} PKR</span>
                  </div>
                  {Number(drawerOrder.discountPkr || 0) > 0 && (
                    <div className="pay-row discount">
                      <span>Discount</span>
                      <span>-{Number(drawerOrder.discountPkr || 0).toLocaleString()} PKR</span>
                    </div>
                  )}
                  <div className="pay-row total">
                    <strong>Grand Total (COD)</strong>
                    <strong className="grand-total-val">{drawerOrder.totalPkr.toLocaleString()} PKR</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Sticky Action Footer */}
            <div className="drawer-footer">
              {renderPrimaryAction(drawerOrder)}

              {!isTerminalStatus(drawerOrder.status) && (
                <button
                  onClick={() => onOpenCancelModal(drawerOrder)}
                  className="btn-drawer-cancel"
                >
                  <X size={15} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        .admin-orders-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* 1. TOP KPI METRICS BAR */
        .orders-kpi-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .kpi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-icon-box.blue { background: #eff6ff; color: #2563eb; }
        .kpi-icon-box.amber { background: #fffbeb; color: #d97706; }
        .kpi-icon-box.orange { background: #fff7ed; color: #ea580c; }
        .kpi-icon-box.green { background: #ecfdf5; color: #059669; }
        .kpi-icon-box.purple { background: #faf5ff; color: #7c3aed; }
        .kpi-icon-box.emerald { background: #f0fdf4; color: #16a34a; }

        .kpi-body {
          display: flex;
          flex-direction: column;
        }

        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kpi-val {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          margin-top: 2px;
        }

        .text-amber { color: #d97706; }
        .text-orange { color: #ea580c; }
        .text-emerald { color: #059669; }
        .text-purple { color: #7c3aed; }

        /* 2. CONTROL BAR */
        .orders-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .search-box-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 260px;
          padding: 6px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .search-input {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
          outline: none;
        }

        .btn-clear-search {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
        }

        .filter-pills-scroll {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pos-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 800;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pos-filter-pill.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .pill-count {
          font-size: 10.5px;
          padding: 1px 5px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.08);
        }

        .pos-filter-pill.active .pill-count {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .view-mode-toggle {
          display: flex;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
        }

        .btn-view-toggle {
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
        }

        .btn-view-toggle.active {
          background: #0f172a;
          color: #ffffff;
        }

        /* 3. COMPACT ORDER CARDS */
        .compact-orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }

        .compact-order-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }

        .compact-order-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
        }

        .compact-order-card.is-new {
          border-left: 4px solid #ea580c;
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-id-box {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .order-num {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .time-ago {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 600;
        }

        .status-badges-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .type-badge.delivery {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .type-badge.pickup {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #ffedd5;
        }

        .pos-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.03em;
        }

        .badge-new { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-confirmed { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .badge-cooking { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
        .badge-ready { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-transit { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
        .badge-completed { background: #f1f5f9; color: #475569; }
        .badge-cancelled { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b45309;
          animation: pulse 1.5s infinite;
        }

        .card-customer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .customer-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .customer-phone-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #334155;
          font-size: 11.5px;
          font-weight: 700;
          text-decoration: none;
        }

        .card-address-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .address-text {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-item-summary-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .item-count-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-open-drawer-hint {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11.5px;
          font-weight: 800;
          color: #ea580c;
        }

        .card-rider-strip {
          display: flex;
          align-items: center;
          font-size: 11.5px;
          color: #64748b;
        }

        .rider-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .card-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
          margin-top: 2px;
        }

        .price-block {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.04em;
        }

        .price-val {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .actions-block {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-action-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          border: none;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .btn-confirm { background: #d97706; }
        .btn-kitchen { background: #ea580c; }
        .btn-ready { background: #059669; }
        .btn-dispatch { background: #7c3aed; }

        .btn-cancel-icon {
          padding: 7px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #dc2626;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-cancel-icon:hover {
          background: #fee2e2;
        }

        /* 4. TABLE VIEW STYLES */
        .orders-table-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow-x: auto;
        }

        .orders-data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-data-table th {
          background: #f8fafc;
          padding: 10px 14px;
          font-size: 11.5px;
          font-weight: 800;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
        }

        .orders-data-table td {
          padding: 10px 14px;
          font-size: 12.5px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }

        .table-order-row {
          cursor: pointer;
        }

        .table-order-row:hover {
          background: #f8fafc;
        }

        .tbl-order-num {
          font-size: 13.5px;
          font-weight: 900;
          color: #0f172a;
        }

        .tbl-items-pill {
          padding: 2px 6px;
          border-radius: 4px;
          background: #f1f5f9;
          font-size: 11.5px;
          font-weight: 700;
        }

        .rider-tag {
          font-size: 11.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .rider-tag.assigned {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .rider-tag.unassigned {
          background: #f1f5f9;
          color: #64748b;
        }

        .tbl-time {
          font-size: 11.5px;
          color: #64748b;
        }

        /* 5. SIDE DRAWER */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          justify-content: flex-end;
        }

        .drawer-panel {
          width: 100%;
          max-width: 520px;
          height: 100vh;
          background: #ffffff;
          box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .drawer-order-num {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }

        .drawer-order-time {
          font-size: 12px;
          color: #64748b;
          margin-top: 3px;
          display: block;
        }

        .btn-close-drawer {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .btn-close-drawer:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .drawer-body {
          padding: 16px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }

        .drawer-section-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .drawer-sec-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .drawer-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .info-lbl {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          display: block;
        }

        .info-val {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
          display: block;
        }

        .drawer-phone-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 800;
          color: #ea580c;
          text-decoration: none;
          margin-top: 2px;
        }

        .drawer-address-box {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 8px 10px;
          background: #f8fafc;
          border-radius: 6px;
          font-size: 12.5px;
          color: #334155;
        }

        .drawer-kitchen-notes-box {
          padding: 8px 10px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          font-size: 12px;
          color: #78350f;
        }

        .drawer-kitchen-notes-box p {
          margin: 3px 0 0;
          font-weight: 600;
        }

        .drawer-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .drawer-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
        }

        .drawer-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .item-main-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .item-title-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .item-qty-badge {
          padding: 1px 6px;
          border-radius: 4px;
          background: #ffedd5;
          color: #c2410c;
          font-size: 11px;
          font-weight: 800;
        }

        .item-name {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
        }

        .item-variant-chip {
          font-size: 11.5px;
          font-weight: 700;
          color: #475569;
        }

        .drawer-deal-box {
          margin-top: 4px;
          padding: 6px 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          font-size: 11.5px;
          color: #78350f;
        }

        .deal-box-header {
          font-weight: 800;
          display: block;
          margin-bottom: 2px;
        }

        .deal-bullet-item {
          line-height: 1.35;
        }

        .deal-sub-options {
          color: #92400e;
          font-style: italic;
        }

        .item-modifiers-row {
          font-size: 11.5px;
          color: #64748b;
        }

        .item-price-col {
          text-align: right;
          font-size: 13.5px;
          color: #0f172a;
        }

        .unit-price-sub {
          display: block;
          font-size: 11px;
          color: #64748b;
        }

        .rider-assign-controls {
          display: flex;
          gap: 8px;
        }

        .rider-select-input {
          flex: 1;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 12.5px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .btn-assign-rider {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: #0f172a;
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-assign-rider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .payment-summary-rows {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12.5px;
          color: #475569;
        }

        .pay-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pay-row.discount {
          color: #059669;
        }

        .pay-row.total {
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          font-size: 14px;
          color: #0f172a;
        }

        .grand-total-val {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .drawer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .btn-drawer-cancel {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #dc2626;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .empty-orders-state {
          grid-column: 1 / -1;
          padding: 60px 16px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-orders-state h3 {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
