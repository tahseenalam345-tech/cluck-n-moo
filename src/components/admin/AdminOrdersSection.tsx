"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { useTheme } from "@/context/ThemeContext";
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
  Sparkles,
} from "lucide-react";
import { EyeIcon, PackageIcon } from "./AdminIcons";

function CardsGridIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ColumnsBoardIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

function TableListIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  );
}

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "columns" | "table">("grid");

  // Selected Order for the Center Modal Dialog
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

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedDrawerOrderId(null);
      }
    };
    if (selectedDrawerOrderId) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawerOrderId]);

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

  // Current order in Center Modal
  const modalOrder = useMemo(() => {
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
            <ChefHat size={11} /> KITCHEN
          </span>
        );
      case "Ready":
        return (
          <span className="pos-badge badge-ready">
            <CheckCircle size={11} /> READY
          </span>
        );
      case "Out for delivery":
        return (
          <span className="pos-badge badge-transit">
            <Bike size={11} /> IN-TRANSIT
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
          title="Confirm customer phone call"
        >
          <Phone size={13} />
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
          title="Send order ticket to kitchen"
        >
          <ChefHat size={13} />
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
          title="Mark food ready from kitchen"
        >
          <CheckCircle size={13} />
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
          title="Dispatch rider for delivery"
        >
          <Bike size={13} />
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
          title="Hand over to pickup customer"
        >
          <CheckCircle size={13} />
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
          title="Mark settled & complete"
        >
          <CheckCircle size={13} />
          <span>SETTLE &amp; COMPLETE</span>
        </button>
      );
    }

    if (ord.status === "Completed") {
      return (
        <span className="btn-action-terminal terminal-completed">
          <CheckCircle size={12} />
          <span>COMPLETED</span>
        </span>
      );
    }

    if (ord.status === "Cancelled") {
      return (
        <span className="btn-action-terminal terminal-cancelled">
          <XCircle size={12} />
          <span>CANCELLED</span>
        </span>
      );
    }

    return null;
  };

  // Stage columns definition for Columns View
  const stageColumns = useMemo(() => {
    const active = filteredOrders.filter((o) => !isTerminalStatus(o.status));
    return [
      {
        id: "col_confirm",
        title: "Confirm Call",
        subtitle: "Awaiting phone verification",
        badgeColor: "#b45309",
        badgeBg: isDark ? "#451a03" : "#fef3c7",
        badgeBorder: isDark ? "#78350f" : "#fde68a",
        icon: Phone,
        orders: active.filter((o) => o.status === "New"),
      },
      {
        id: "col_kitchen",
        title: "Kitchen Cooking",
        subtitle: "Cooking & prep in progress",
        badgeColor: "#ea580c",
        badgeBg: isDark ? "#431407" : "#ffedd5",
        badgeBorder: isDark ? "#7c2d12" : "#fed7aa",
        icon: ChefHat,
        orders: active.filter((o) => o.status === "Confirmed" || o.status === "Preparing"),
      },
      {
        id: "col_ready",
        title: "Food Ready",
        subtitle: "Ready for pickup or rider",
        badgeColor: "#059669",
        badgeBg: isDark ? "#064e3b" : "#dcfce7",
        badgeBorder: isDark ? "#065f46" : "#bbf7d0",
        icon: CheckCircle,
        orders: active.filter((o) => o.status === "Ready"),
      },
      {
        id: "col_dispatch",
        title: "Dispatched",
        subtitle: "Rider in transit",
        badgeColor: "#7c3aed",
        badgeBg: isDark ? "#3b0764" : "#f3e8ff",
        badgeBorder: isDark ? "#581c87" : "#e9d5ff",
        icon: Bike,
        orders: active.filter((o) => o.status === "Out for delivery"),
      },
    ];
  }, [filteredOrders, isDark]);

  // Standardized Card Renderer with Fixed Slots (never jumping or overlapping)
  const renderOrderCard = (ord: Order) => {
    const isDelivery = isDeliveryOrder(ord.orderType);
    const itemsCount = (ord.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    const assignedRider = availableRiders.find((r) => r.id === ord.assignedRiderId);

    return (
      <div
        key={ord.id}
        onClick={() => setSelectedDrawerOrderId(ord.id)}
        className={`compact-order-card ${ord.status === "New" ? "is-new" : ""}`}
      >
        {/* SLOT 1: Header Row (Order #, Time, Mode & Status Badges) */}
        <div className="card-slot card-top-row">
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

        {/* SLOT 2: Customer Name & Phone */}
        <div className="card-slot card-customer-row">
          <span className="customer-name" title={ord.customerName || ord.customerNameSnapshot || "Customer"}>
            {ord.customerName || ord.customerNameSnapshot || "Customer"}
          </span>
          <a
            href={`tel:${ord.customerPhone || ord.customerPhoneSnapshot || ""}`}
            onClick={(e) => e.stopPropagation()}
            className="customer-phone-chip"
            title="Dial customer phone"
          >
            <Phone size={11} /> {ord.customerPhone || ord.customerPhoneSnapshot || "No Phone"}
          </a>
        </div>

        {/* SLOT 3: Delivery Address / Store Pickup (Fixed height - NEVER collapses) */}
        <div className="card-slot card-address-row">
          {isDelivery ? (
            <>
              <MapPin size={12} className="slot-icon map-icon" />
              <span
                className="address-text"
                title={`${ord.deliveryAreaName || ord.deliveryAreaNameSnapshot || "Area"}: ${ord.deliveryAddress || ord.deliveryAddressSnapshot || "Address"}`}
              >
                <strong>{ord.deliveryAreaName || ord.deliveryAreaNameSnapshot || "Area"}:</strong>{" "}
                {ord.deliveryAddress || ord.deliveryAddressSnapshot || "Address provided"}
              </span>
            </>
          ) : (
            <div className="slot-empty-placeholder">
              <ShoppingBag size={12} className="slot-icon" />
              <span>Store Counter Pickup</span>
            </div>
          )}
        </div>

        {/* SLOT 4: Rider Assignment (Fixed height - NEVER collapses) */}
        <div className="card-slot card-rider-strip">
          {isDelivery ? (
            <span className="rider-label">
              <Bike size={12} className="slot-icon" />
              <span className={assignedRider ? "rider-assigned" : "rider-unassigned"}>
                {assignedRider ? `Rider: ${assignedRider.fullName}` : "Rider: Unassigned"}
              </span>
            </span>
          ) : (
            <div className="slot-empty-placeholder">
              <User size={12} className="slot-icon" />
              <span>Customer Self-Pickup</span>
            </div>
          )}
        </div>

        {/* SLOT 5: Items Summary & View Details (Fixed layout - NEVER wraps) */}
        <div className="card-slot card-item-summary-strip">
          <div className="item-count-chip">
            <PackageIcon size={13} className="slot-icon" />
            <span className="items-text-snippet">
              {itemsCount} {itemsCount === 1 ? "Item" : "Items"} (
              {(ord.items || [])
                .slice(0, 2)
                .map((it) => it.productName || it.productNameSnapshot)
                .join(", ")}
              {(ord.items || []).length > 2 ? "..." : ""})
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDrawerOrderId(ord.id);
            }}
            className="btn-open-drawer-hint"
            title="View complete order details in popup"
          >
            <span>View Details</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* SLOT 6: Bottom Price & Fixed Action Row (Locked to bottom) */}
        <div className="card-slot card-bottom-row" onClick={(e) => e.stopPropagation()}>
          <div className="price-block">
            <span className="price-label">TOTAL (COD)</span>
            <span className="price-val">{ord.totalPkr.toLocaleString()} PKR</span>
          </div>

          <div className="actions-block">
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
        </div>
      </div>
    );
  };

  return (
    <div className={`admin-orders-container ${isDark ? "theme-dark" : "theme-light"}`}>
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
          <Search size={15} className="search-icon-svg" />
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

        {/* View Mode Toggle: Right-side, icons-only on mobile */}
        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode("grid")}
            className={`btn-view-toggle ${viewMode === "grid" ? "active" : ""}`}
            title="Card Grid View"
          >
            <CardsGridIcon size={14} />
            <span className="btn-toggle-label">Cards</span>
          </button>
          <button
            onClick={() => setViewMode("columns")}
            className={`btn-view-toggle ${viewMode === "columns" ? "active" : ""}`}
            title="Columns Stage View"
          >
            <ColumnsBoardIcon size={14} />
            <span className="btn-toggle-label">Columns</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`btn-view-toggle ${viewMode === "table" ? "active" : ""}`}
            title="Data Table View"
          >
            <TableListIcon size={14} />
            <span className="btn-toggle-label">Table</span>
          </button>
        </div>
      </div>

      {/* 3. VIEW 1: COMPACT ORDER CARDS (GRID VIEW - 2x2 ON MOBILE) */}
      {viewMode === "grid" && (
        <div className="compact-orders-grid">
          {filteredOrders.map((ord) => renderOrderCard(ord))}

          {filteredOrders.length === 0 && (
            <div className="empty-orders-state">
              <AlertCircle size={36} color="#94a3b8" />
              <h3>No Orders Found</h3>
              <p>No orders match the current filter or search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW 2: STAGE COLUMNS VIEW (CONFIRM CALL | KITCHEN | READY | DISPATCH) */}
      {viewMode === "columns" && (
        <div className="orders-columns-board">
          {stageColumns.map((col) => (
            <div key={col.id} className="stage-column">
              <div className="stage-column-header">
                <div className="stage-title-wrap">
                  <div
                    className="stage-icon-box"
                    style={{ background: col.badgeBg, color: col.badgeColor }}
                  >
                    <col.icon size={15} />
                  </div>
                  <div>
                    <h3 className="stage-title">{col.title}</h3>
                    <span className="stage-subtitle">{col.subtitle}</span>
                  </div>
                </div>
                <span
                  className="stage-count-badge"
                  style={{
                    background: col.badgeBg,
                    color: col.badgeColor,
                    border: `1px solid ${col.badgeBorder}`,
                  }}
                >
                  {col.orders.length}
                </span>
              </div>

              <div className="stage-column-cards">
                {col.orders.map((ord) => renderOrderCard(ord))}
                {col.orders.length === 0 && (
                  <div className="stage-empty-slot">
                    <p>No orders in this stage</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. VIEW 3: TABLE VIEW */}
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
                      <strong>{ord.customerName || ord.customerNameSnapshot || "Customer"}</strong>
                    </td>
                    <td>
                      <a
                        href={`tel:${ord.customerPhone || ord.customerPhoneSnapshot || ""}`}
                        onClick={(e) => e.stopPropagation()}
                        className="customer-phone-chip"
                      >
                        {ord.customerPhone || ord.customerPhoneSnapshot}
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

      {/* 6. CENTERED ORDER DETAIL MODAL DIALOG */}
      {modalOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setSelectedDrawerOrderId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="order-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="order-modal-header">
              <div className="modal-header-left">
                <div className="modal-title-row">
                  <h2 className="modal-order-num">{modalOrder.orderNumber}</h2>
                  <span
                    className={`type-badge ${isDeliveryOrder(modalOrder.orderType) ? "delivery" : "pickup"}`}
                  >
                    {isDeliveryOrder(modalOrder.orderType) ? (
                      <Bike size={12} />
                    ) : (
                      <ShoppingBag size={12} />
                    )}
                    {modalOrder.orderType || "DELIVERY"}
                  </span>
                  {renderStatusBadge(modalOrder.status)}
                </div>
                <span className="modal-order-time">
                  Placed{" "}
                  {new Date(modalOrder.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • {formatRelativeTime(modalOrder.createdAt)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDrawerOrderId(null)}
                className="btn-close-modal"
                title="Close (Esc or click outside)"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body with smooth scrolling */}
            <div className="order-modal-body">
              {/* SECTION A: Customer & Delivery Info */}
              <div className="modal-section-card">
                <h4 className="modal-sec-title">
                  <User size={15} /> Customer &amp; Delivery Destination
                </h4>
                <div className="modal-info-grid">
                  <div>
                    <span className="info-lbl">Customer Name</span>
                    <strong className="info-val">
                      {modalOrder.customerName || modalOrder.customerNameSnapshot || "Customer"}
                    </strong>
                  </div>
                  <div>
                    <span className="info-lbl">Phone Contact</span>
                    <a
                      href={`tel:${modalOrder.customerPhone || modalOrder.customerPhoneSnapshot || ""}`}
                      className="modal-phone-link"
                    >
                      <Phone size={13} />{" "}
                      {modalOrder.customerPhone || modalOrder.customerPhoneSnapshot || "No phone"}
                    </a>
                  </div>
                  <div>
                    <span className="info-lbl">Order Mode</span>
                    <span className="info-val">{modalOrder.orderType || "DELIVERY"}</span>
                  </div>
                  <div>
                    <span className="info-lbl">Delivery Area</span>
                    <span className="info-val">
                      {modalOrder.deliveryAreaName ||
                        modalOrder.deliveryAreaNameSnapshot ||
                        (isDeliveryOrder(modalOrder.orderType) ? "Default Sector" : "Counter Pickup")}
                    </span>
                  </div>
                </div>

                {isDeliveryOrder(modalOrder.orderType) && (
                  <div className="modal-address-box">
                    <MapPin size={14} color="#ea580c" />
                    <span>
                      {modalOrder.deliveryAddress ||
                        modalOrder.deliveryAddressSnapshot ||
                        "Address provided by customer"}
                    </span>
                  </div>
                )}

                {modalOrder.specialInstructions && (
                  <div className="modal-notes-box">
                    <strong>Special Instructions:</strong>
                    <p>{modalOrder.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* SECTION B: Ordered Items */}
              <div className="modal-section-card">
                <h4 className="modal-sec-title">
                  <PackageIcon size={15} /> Ordered Items ({(modalOrder.items || []).length})
                </h4>

                <div className="modal-items-list">
                  {(modalOrder.items || []).map((item, idx) => {
                    const itemName = item.productName || item.productNameSnapshot || "Menu Item";
                    const itemVariant = item.variantName || item.variantNameSnapshot;
                    const unitPrice = item.unitPriceSnapshotPkr || item.unitPricePkr || 0;
                    const linePrice = item.lineTotalPkr || unitPrice * item.quantity;
                    const dealItems = (item as any).dealItems as any[] | undefined;

                    return (
                      <div key={item.id || idx} className="modal-item-row">
                        <div className="item-main-col">
                          <div className="item-title-line">
                            <span className="item-qty-badge">{item.quantity}x</span>
                            <strong className="item-name">{itemName}</strong>
                          </div>

                          {itemVariant && (
                            <div className="item-variant-chip">Size / Option: {itemVariant}</div>
                          )}

                          {dealItems && dealItems.length > 0 && (
                            <div className="modal-deal-box">
                              <span className="deal-box-header">Deal Selections:</span>
                              {dealItems.map((di: any, dIdx: number) => (
                                <div key={dIdx} className="deal-bullet-item">
                                  • {di.quantity ? `${di.quantity}x ` : ""}
                                  {di.productName || di.productNameSnapshot}
                                  {di.selectedOptions && di.selectedOptions.length > 0 && (
                                    <span className="deal-sub-options">
                                      {" "}
                                      (
                                      {di.selectedOptions
                                        .map((o: any) => o.optionName || o.name)
                                        .join(", ")}
                                      )
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="item-modifiers-row">
                              Add-ons:{" "}
                              {item.modifiers
                                .map(
                                  (m) =>
                                    `${m.modifierNameSnapshot || (m as any).name || "Add-on"} (+${m.priceSnapshotPkr ?? (m as any).pricePkr ?? 0} PKR)`
                                )
                                .join(", ")}
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

              {/* SECTION C: Rider Assignment (If Delivery) */}
              {isDeliveryOrder(modalOrder.orderType) && (
                <div className="modal-section-card">
                  <h4 className="modal-sec-title">
                    <Bike size={15} /> Delivery Rider Assignment
                  </h4>

                  <div className="rider-assign-controls">
                    <select
                      value={selectedRiderForAssign || modalOrder.assignedRiderId || ""}
                      onChange={(e) => setSelectedRiderForAssign(e.target.value)}
                      className="rider-select-input"
                    >
                      <option value="">-- Select Active Delivery Rider --</option>
                      {availableRiders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName} ({r.activeOrdersAssigned} active deliveries){" "}
                          {r.phone ? `• ${r.phone}` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedRiderForAssign || isAssigningRider}
                      onClick={() => handleAssignRiderSubmit(modalOrder.id, selectedRiderForAssign)}
                      className="btn-assign-rider"
                    >
                      {isAssigningRider ? "Assigning..." : "Assign Rider"}
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION D: Payment Breakdown */}
              <div className="modal-section-card">
                <h4 className="modal-sec-title">
                  <DollarSign size={15} /> Payment Summary
                </h4>

                <div className="payment-summary-rows">
                  <div className="pay-row">
                    <span>Subtotal</span>
                    <span>{modalOrder.subtotalPkr.toLocaleString()} PKR</span>
                  </div>
                  <div className="pay-row">
                    <span>Delivery Fee</span>
                    <span>+{modalOrder.deliveryFeePkr.toLocaleString()} PKR</span>
                  </div>
                  {Number(modalOrder.discountPkr || 0) > 0 && (
                    <div className="pay-row discount">
                      <span>Discount</span>
                      <span>-{Number(modalOrder.discountPkr || 0).toLocaleString()} PKR</span>
                    </div>
                  )}
                  <div className="pay-row total">
                    <strong>Grand Total (COD)</strong>
                    <strong className="grand-total-val">
                      {modalOrder.totalPkr.toLocaleString()} PKR
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="order-modal-footer">
              {!isTerminalStatus(modalOrder.status) && (
                <button
                  type="button"
                  onClick={() => {
                    const orderToCancel = modalOrder;
                    setSelectedDrawerOrderId(null);
                    onOpenCancelModal(orderToCancel);
                  }}
                  className="btn-modal-cancel"
                >
                  <X size={15} /> Cancel Order
                </button>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                {renderPrimaryAction(modalOrder)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE STYLES (LIGHT + DARK MODE READY) */}
      <style jsx>{`
        .admin-orders-container {
          display: flex;
          flex-direction: column;
          gap: 16px;

          /* LIGHT MODE TOKENS */
          --ord-card-bg: #ffffff;
          --ord-card-border: #cbd5e1;
          --ord-card-hover: #94a3b8;
          --ord-card-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04);
          --ord-text-main: #0f172a;
          --ord-text-sub: #334155;
          --ord-text-muted: #64748b;
          --ord-strip-bg: #f8fafc;
          --ord-strip-border: #e2e8f0;
          --ord-divider: #e2e8f0;
          --ord-kpi-bg: #ffffff;
          --ord-kpi-border: #cbd5e1;
          --ord-input-bg: #ffffff;
          --ord-input-border: #cbd5e1;
          --ord-pill-bg: #ffffff;
          --ord-pill-border: #cbd5e1;
          --ord-pill-text: #475569;
          --ord-table-bg: #ffffff;
          --ord-table-header-bg: #f8fafc;
          --ord-table-border: #e2e8f0;
          --ord-table-hover: #f1f5f9;
          --ord-modal-bg: #ffffff;
          --ord-modal-header: #f8fafc;
          --ord-modal-border: #cbd5e1;
          --ord-column-bg: #f1f5f9;
        }

        /* DARK MODE TOKENS (Comprehensive dark mode across cards, text, inputs, tables, modals) */
        :global([data-theme="dark"]) .admin-orders-container,
        :global(.theme-dark) .admin-orders-container,
        .admin-orders-container.theme-dark {
          --ord-card-bg: #141416;
          --ord-card-border: #27272a;
          --ord-card-hover: #3f3f46;
          --ord-card-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          --ord-text-main: #f4f4f5;
          --ord-text-sub: #d4d4d8;
          --ord-text-muted: #a1a1aa;
          --ord-strip-bg: #09090b;
          --ord-strip-border: #27272a;
          --ord-divider: #27272a;
          --ord-kpi-bg: #141416;
          --ord-kpi-border: #27272a;
          --ord-input-bg: #09090b;
          --ord-input-border: #27272a;
          --ord-pill-bg: #141416;
          --ord-pill-border: #27272a;
          --ord-pill-text: #d4d4d8;
          --ord-table-bg: #141416;
          --ord-table-header-bg: #09090b;
          --ord-table-border: #27272a;
          --ord-table-hover: #1f1f23;
          --ord-modal-bg: #141416;
          --ord-modal-header: #09090b;
          --ord-modal-border: #27272a;
          --ord-column-bg: #09090b;
        }

        /* 1. TOP KPI METRICS BAR */
        .orders-kpi-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--ord-kpi-bg);
          border: 1px solid var(--ord-kpi-border);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .kpi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .kpi-icon-box.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .kpi-icon-box.amber { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .kpi-icon-box.orange { background: rgba(234, 88, 12, 0.15); color: #ea580c; }
        .kpi-icon-box.green { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .kpi-icon-box.purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
        .kpi-icon-box.emerald { background: rgba(16, 185, 129, 0.15); color: #10b981; }

        .kpi-body {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--ord-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .kpi-val {
          font-size: 19px;
          font-weight: 900;
          color: var(--ord-text-main);
          letter-spacing: -0.02em;
        }

        .text-amber { color: #d97706 !important; }
        .text-orange { color: #ea580c !important; }
        .text-emerald { color: #059669 !important; }
        .text-purple { color: #7c3aed !important; }

        /* 2. CONTROL BAR */
        .orders-control-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box-wrapper {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-box-wrapper :global(.search-icon-svg) {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--ord-text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 32px 8px 36px;
          background: var(--ord-input-bg);
          border: 1px solid var(--ord-input-border);
          border-radius: 8px;
          font-size: 12.5px;
          color: var(--ord-text-main);
          outline: none;
          transition: border-color 0.2s ease;
        }

        .search-input:focus {
          border-color: #ea580c;
        }

        .btn-clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--ord-text-muted);
          cursor: pointer;
          display: flex;
        }

        .filter-pills-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .pos-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          background: var(--ord-pill-bg);
          border: 1px solid var(--ord-pill-border);
          color: var(--ord-pill-text);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .pos-filter-pill:hover {
          border-color: #ea580c;
          color: #ea580c;
        }

        .pos-filter-pill.active {
          background: #ea580c !important;
          color: #ffffff !important;
          border-color: #ea580c !important;
        }

        .pill-count {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.08);
        }

        .pos-filter-pill.active .pill-count {
          background: rgba(255, 255, 255, 0.3);
          color: #ffffff;
        }

        /* View Mode Toggle: Float right on mobile with icon-only view */
        .view-mode-toggle {
          display: flex;
          border: 1px solid var(--ord-pill-border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--ord-pill-bg);
          flex-shrink: 0;
          margin-left: auto;
        }

        .btn-view-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          background: transparent;
          color: var(--ord-pill-text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-view-toggle.active {
          background: #ea580c;
          color: #ffffff;
        }

        /* 3. ORDER CARDS GRID (DESKTOP: MULTI-COLUMN, MOBILE: 2-IN-ROW 2x2) */
        .compact-orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }

        /* Card Container - Visibly Separated from Page Background */
        .compact-order-card {
          background: var(--ord-card-bg);
          border: 1.5px solid var(--ord-card-border);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          min-height: 250px;
          box-shadow: var(--ord-card-shadow);
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          position: relative;
        }

        .compact-order-card:hover {
          border-color: var(--ord-card-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.12);
        }

        .compact-order-card.is-new {
          border-left: 4px solid #ea580c;
        }

        /* Standardized Card Slots */
        .card-slot {
          width: 100%;
        }

        /* Slot 1: Top Row */
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 28px;
          margin-bottom: 6px;
        }

        .order-id-box {
          display: flex;
          align-items: baseline;
          gap: 6px;
          min-width: 0;
        }

        .order-num {
          font-size: 15px;
          font-weight: 900;
          color: var(--ord-text-main);
          letter-spacing: -0.02em;
        }

        .time-ago {
          font-size: 11px;
          color: var(--ord-text-muted);
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badges-group {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
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
          border: 1px solid #fed7aa;
        }

        .pos-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.02em;
        }

        .badge-new { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-confirmed { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .badge-cooking { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
        .badge-ready { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-transit { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
        .badge-completed { background: #f1f5f9; color: #475569; }
        .badge-cancelled { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

        /* Dark mode badge colors */
        :global([data-theme="dark"]) .badge-new,
        :global(.theme-dark) .badge-new,
        .admin-orders-container.theme-dark .badge-new {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.4);
        }
        :global([data-theme="dark"]) .badge-confirmed,
        :global(.theme-dark) .badge-confirmed,
        .admin-orders-container.theme-dark .badge-confirmed {
          background: rgba(14, 165, 233, 0.2);
          color: #38bdf8;
          border-color: rgba(14, 165, 233, 0.4);
        }
        :global([data-theme="dark"]) .badge-cooking,
        :global(.theme-dark) .badge-cooking,
        .admin-orders-container.theme-dark .badge-cooking {
          background: rgba(249, 115, 22, 0.2);
          color: #fb923c;
          border-color: rgba(249, 115, 22, 0.4);
        }
        :global([data-theme="dark"]) .badge-ready,
        :global(.theme-dark) .badge-ready,
        .admin-orders-container.theme-dark .badge-ready {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.4);
        }
        :global([data-theme="dark"]) .badge-transit,
        :global(.theme-dark) .badge-transit,
        .admin-orders-container.theme-dark .badge-transit {
          background: rgba(168, 85, 247, 0.2);
          color: #c084fc;
          border-color: rgba(168, 85, 247, 0.4);
        }
        :global([data-theme="dark"]) .badge-completed,
        :global(.theme-dark) .badge-completed,
        .admin-orders-container.theme-dark .badge-completed {
          background: rgba(148, 163, 184, 0.2);
          color: #cbd5e1;
        }
        :global([data-theme="dark"]) .badge-cancelled,
        :global(.theme-dark) .badge-cancelled,
        .admin-orders-container.theme-dark .badge-cancelled {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.4);
        }
        :global([data-theme="dark"]) .type-badge.delivery,
        :global(.theme-dark) .type-badge.delivery,
        .admin-orders-container.theme-dark .type-badge.delivery {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.4);
        }
        :global([data-theme="dark"]) .type-badge.pickup,
        :global(.theme-dark) .type-badge.pickup,
        .admin-orders-container.theme-dark .type-badge.pickup {
          background: rgba(249, 115, 22, 0.2);
          color: #fb923c;
          border-color: rgba(249, 115, 22, 0.4);
        }

        .live-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b45309;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        /* Slot 2: Customer Name & Phone */
        .card-customer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          height: 24px;
          margin-bottom: 4px;
        }

        .customer-name {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--ord-text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .customer-phone-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--ord-strip-bg);
          border: 1px solid var(--ord-strip-border);
          color: var(--ord-text-sub);
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          flex-shrink: 0;
        }

        /* Slot 3: Address Row (Fixed Height - Never Collapses) */
        .card-address-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--ord-text-sub);
          height: 22px;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .map-icon {
          color: #ea580c;
          flex-shrink: 0;
        }

        .address-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .slot-empty-placeholder {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--ord-text-muted);
          font-style: italic;
        }

        /* Slot 4: Rider Assignment (Fixed Height - Never Collapses) */
        .card-rider-strip {
          display: flex;
          align-items: center;
          font-size: 11.5px;
          color: var(--ord-text-muted);
          height: 22px;
          margin-bottom: 6px;
        }

        .rider-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rider-assigned {
          color: #2563eb;
          font-weight: 700;
        }

        .rider-unassigned {
          color: var(--ord-text-muted);
        }

        /* Slot 5: Items Summary & View Details (Fixed Height - Never Wraps) */
        .card-item-summary-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--ord-strip-bg);
          border-radius: 6px;
          border: 1px solid var(--ord-strip-border);
          height: 32px;
          margin-bottom: 8px;
          gap: 6px;
        }

        .item-count-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--ord-text-sub);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }

        .items-text-snippet {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-open-drawer-hint {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 800;
          color: #ea580c;
          background: transparent;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
          white-space: nowrap;
        }

        .btn-open-drawer-hint:hover {
          text-decoration: underline;
        }

        /* Slot 6: Bottom Price & Fixed Action Row */
        .card-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--ord-divider);
          margin-top: auto;
          height: 38px;
        }

        .price-block {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 9.5px;
          font-weight: 800;
          color: var(--ord-text-muted);
          letter-spacing: 0.03em;
        }

        .price-val {
          font-size: 14.5px;
          font-weight: 900;
          color: var(--ord-text-main);
        }

        .actions-block {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .btn-action-terminal {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .terminal-completed {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .terminal-cancelled {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        /* Distinct High-Contrast Action Buttons */
        .btn-action-primary {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 11.5px;
          font-weight: 800;
          border: none;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16);
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .btn-action-primary:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .btn-confirm { background: #d97706; }
        .btn-kitchen { background: #ea580c; }
        .btn-ready { background: #059669; }
        .btn-dispatch { background: #7c3aed; }

        /* Prominent Cancel Button */
        .btn-cancel-icon {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          border: 1.5px solid #fecaca;
          background: #fef2f2;
          color: #dc2626;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .btn-cancel-icon:hover {
          background: #fee2e2;
          border-color: #f87171;
          color: #b91c1c;
          transform: translateY(-1px);
        }

        :global([data-theme="dark"]) .btn-cancel-icon,
        :global(.theme-dark) .btn-cancel-icon,
        .admin-orders-container.theme-dark .btn-cancel-icon {
          background: rgba(220, 38, 38, 0.2);
          border-color: #ef4444;
          color: #f87171;
        }

        /* 4. COLUMNS VIEW (STAGE-WISE BOARDS) */
        .orders-columns-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          align-items: start;
        }

        .stage-column {
          background: var(--ord-column-bg);
          border: 1px solid var(--ord-card-border);
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stage-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--ord-divider);
        }

        .stage-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stage-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stage-title {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--ord-text-main);
          margin: 0;
        }

        .stage-subtitle {
          font-size: 10px;
          color: var(--ord-text-muted);
          display: block;
        }

        .stage-count-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
        }

        .stage-column-cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: calc(100vh - 280px);
          overflow-y: auto;
        }

        .stage-empty-slot {
          padding: 30px 12px;
          text-align: center;
          font-size: 12px;
          color: var(--ord-text-muted);
          font-style: italic;
        }

        /* 5. TABLE VIEW STYLES */
        .orders-table-wrapper {
          background: var(--ord-table-bg);
          border: 1px solid var(--ord-table-border);
          border-radius: 12px;
          overflow-x: auto;
        }

        .orders-data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-data-table th {
          background: var(--ord-table-header-bg);
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 800;
          color: var(--ord-text-muted);
          border-bottom: 1px solid var(--ord-table-border);
          text-transform: uppercase;
        }

        .orders-data-table td {
          padding: 10px 14px;
          font-size: 12px;
          color: var(--ord-text-main);
          border-bottom: 1px solid var(--ord-divider);
        }

        .table-order-row {
          cursor: pointer;
        }

        .table-order-row:hover {
          background: var(--ord-table-hover);
        }

        .tbl-order-num {
          font-size: 13px;
          font-weight: 900;
          color: var(--ord-text-main);
        }

        .tbl-items-pill {
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--ord-strip-bg);
          font-size: 11px;
          font-weight: 700;
          color: var(--ord-text-sub);
        }

        .rider-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .rider-tag.assigned {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .rider-tag.unassigned {
          background: var(--ord-strip-bg);
          color: var(--ord-text-muted);
        }

        .tbl-time {
          font-size: 11px;
          color: var(--ord-text-muted);
        }

        /* 6. CENTERED ORDER DETAIL MODAL DIALOG */
        .order-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(5px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .order-modal-card {
          width: 100%;
          max-width: 620px;
          max-height: 88vh;
          background: var(--ord-modal-bg);
          border: 1px solid var(--ord-modal-border);
          border-radius: 16px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          animation: modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        @keyframes modalPopIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .order-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 20px;
          border-bottom: 1px solid var(--ord-divider);
          background: var(--ord-modal-header);
        }

        .modal-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .modal-order-num {
          font-size: 20px;
          font-weight: 900;
          color: var(--ord-text-main);
          margin: 0;
        }

        .modal-order-time {
          font-size: 11.5px;
          color: var(--ord-text-muted);
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          color: var(--ord-text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .btn-close-modal:hover {
          background: var(--ord-strip-bg);
          color: var(--ord-text-main);
        }

        .order-modal-body {
          padding: 18px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-section-card {
          background: var(--ord-strip-bg);
          border: 1px solid var(--ord-strip-border);
          border-radius: 10px;
          padding: 12px 14px;
        }

        .modal-sec-title {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--ord-text-main);
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .modal-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          font-size: 12px;
        }

        .info-lbl {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--ord-text-muted);
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }

        .info-val {
          font-weight: 800;
          color: var(--ord-text-main);
        }

        .modal-phone-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          font-weight: 800;
          text-decoration: none;
        }

        .modal-phone-link:hover {
          text-decoration: underline;
        }

        .modal-address-box {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--ord-divider);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--ord-text-main);
        }

        .modal-notes-box {
          margin-top: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 12px;
        }

        :global([data-theme="dark"]) .modal-notes-box,
        :global(.theme-dark) .modal-notes-box,
        .admin-orders-container.theme-dark .modal-notes-box {
          background: #451a03;
          border-color: #78350f;
          color: #fde68a;
        }

        .modal-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .modal-item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid var(--ord-divider);
        }

        .modal-item-row:last-child {
          border-bottom: none;
        }

        .item-main-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-title-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .item-qty-badge {
          font-size: 11px;
          font-weight: 800;
          color: #ea580c;
          background: rgba(234, 88, 12, 0.12);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .item-name {
          font-size: 13px;
          color: var(--ord-text-main);
        }

        .item-variant-chip {
          font-size: 11px;
          color: var(--ord-text-muted);
          font-weight: 600;
        }

        .modal-deal-box {
          margin-top: 4px;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.04);
          font-size: 11px;
          color: var(--ord-text-sub);
        }

        .deal-box-header {
          font-weight: 700;
          color: #ea580c;
          display: block;
          margin-bottom: 2px;
        }

        .deal-bullet-item {
          font-size: 11px;
          line-height: 1.4;
        }

        .deal-sub-options {
          color: var(--ord-text-muted);
          font-style: italic;
        }

        .item-modifiers-row {
          font-size: 11px;
          color: var(--ord-text-muted);
          margin-top: 2px;
        }

        .item-price-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          color: var(--ord-text-main);
          font-size: 13px;
          flex-shrink: 0;
        }

        .unit-price-sub {
          font-size: 10px;
          color: var(--ord-text-muted);
        }

        .rider-assign-controls {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .rider-select-input {
          flex: 1;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--ord-input-border);
          background: var(--ord-input-bg);
          color: var(--ord-text-main);
          font-size: 12px;
          outline: none;
        }

        .btn-assign-rider {
          padding: 8px 14px;
          border-radius: 6px;
          background: #7c3aed;
          color: #ffffff;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .payment-summary-rows {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: var(--ord-text-sub);
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
          border-top: 1px solid var(--ord-divider);
          font-size: 13.5px;
          color: var(--ord-text-main);
        }

        .grand-total-val {
          font-size: 16px;
          font-weight: 900;
          color: var(--ord-text-main);
        }

        .order-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--ord-divider);
          background: var(--ord-modal-header);
        }

        .btn-modal-cancel {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 7px 12px;
          border-radius: 7px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #dc2626;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        :global([data-theme="dark"]) .btn-modal-cancel,
        :global(.theme-dark) .btn-modal-cancel,
        .admin-orders-container.theme-dark .btn-modal-cancel {
          background: rgba(220, 38, 38, 0.2);
          border-color: #ef4444;
          color: #f87171;
        }

        .empty-orders-state {
          grid-column: 1 / -1;
          padding: 60px 16px;
          text-align: center;
          color: var(--ord-text-muted);
          background: var(--ord-card-bg);
          border: 1.5px dashed var(--ord-card-border);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-orders-state h3 {
          margin: 4px 0 0;
          color: var(--ord-text-main);
          font-size: 16px;
          font-weight: 800;
        }

        /* RESPONSIVE MEDIA QUERIES */
        @media (max-width: 1024px) {
          .orders-columns-board {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* MOBILE VIEWPORT OPTIMIZATIONS (2x2 GRID, ICON-ONLY TOGGLE) */
        @media (max-width: 768px) {
          .compact-orders-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .compact-order-card {
            padding: 9px 8px !important;
            border-radius: 10px !important;
            min-height: 230px !important;
          }

          .order-num {
            font-size: 12px !important;
          }

          .time-ago {
            font-size: 9.5px !important;
          }

          .type-badge, .pos-badge {
            font-size: 8.5px !important;
            padding: 1px 4px !important;
          }

          .customer-name {
            font-size: 11.5px !important;
          }

          .customer-phone-chip {
            font-size: 9.5px !important;
            padding: 1px 4px !important;
          }

          .card-address-row, .card-rider-strip {
            font-size: 10px !important;
          }

          .card-item-summary-strip {
            padding: 4px 6px !important;
            height: 28px !important;
          }

          .item-count-chip {
            font-size: 10px !important;
          }

          .btn-open-drawer-hint {
            font-size: 9.5px !important;
          }

          .card-bottom-row {
            flex-direction: column !important;
            align-items: stretch !important;
            height: auto !important;
            gap: 5px !important;
            padding-top: 6px !important;
          }

          .price-block {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: baseline !important;
          }

          .price-label {
            font-size: 8.5px !important;
          }

          .price-val {
            font-size: 12.5px !important;
          }

          .actions-block {
            display: flex !important;
            width: 100% !important;
            gap: 5px !important;
          }

          .btn-action-primary {
            flex: 1 !important;
            justify-content: center !important;
            padding: 5px 6px !important;
            font-size: 10px !important;
            gap: 4px !important;
          }

          .btn-cancel-icon {
            width: 28px !important;
            height: 28px !important;
            flex-shrink: 0 !important;
          }

          .orders-columns-board {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .orders-control-bar {
            flex-wrap: wrap;
            gap: 8px;
          }

          .search-box-wrapper {
            order: 1;
            width: 100%;
            flex: 1 1 100%;
          }

          .filter-pills-scroll {
            order: 2;
            flex: 1;
            min-width: 0;
          }

          .view-mode-toggle {
            order: 3;
            margin-left: auto;
            flex-shrink: 0;
          }

          .btn-toggle-label {
            display: none !important;
          }

          .btn-view-toggle {
            padding: 6px 8px !important;
          }

          .modal-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
