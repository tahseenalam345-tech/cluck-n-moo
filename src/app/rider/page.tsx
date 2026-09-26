"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import {
  Bike,
  ArrowLeft,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  Clock,
} from "lucide-react";
import { EyeIcon, ExternalLinkIcon, RiderIcon } from "@/components/admin/AdminIcons";

interface StaffRider {
  id: string;
  fullName: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  activeOrdersAssigned?: number;
}

export default function RiderPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Authentication & session state
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    role: "ADMIN" | "RIDER" | string;
  } | null>(null);

  // Admin View Mode: Admin can view full dispatch or simulate rider's view
  const [viewMode, setViewMode] = useState<"ALL_DISPATCH" | "MY_RUNS">("ALL_DISPATCH");

  // Data & loading state
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRiders, setActiveRiders] = useState<StaffRider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Status updates lock map to prevent background polling from reversing optimistic state
  const recentStatusUpdatesRef = useRef<Map<string, { status: string; assignedRiderId?: string; timestamp: number }>>(new Map());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("ALL");
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"OLDEST" | "NEWEST" | "ORDER_NO" | "TOTAL">("NEWEST");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Selected Order for Detail Drawer / Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Check Supabase Auth and verify RIDER or ADMIN role
  useEffect(() => {
    const checkRiderAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/staff/login");
          return;
        }

        const res = await fetch("/api/v1/account/profile");
        const data = await res.json();
        const userRole = data.data?.profile?.role;

        if (data.success && (userRole === "RIDER" || userRole === "ADMIN")) {
          setCurrentUser({
            id: user.id,
            fullName: data.data.profile.fullName || user.email?.split("@")[0] || "Staff Rider",
            role: userRole,
          });
          if (userRole === "RIDER") {
            setViewMode("MY_RUNS");
          }
          setAuthStatus("authorized");
        } else if (userRole === "KITCHEN_STAFF") {
          // Kitchen Staff belongs to Kitchen Display
          router.replace("/kitchen");
          return;
        } else {
          router.replace("/staff/login");
          setAuthStatus("unauthorized");
        }
      } catch {
        router.replace("/staff/login");
        setAuthStatus("unauthorized");
      }
    };

    checkRiderAuth();
  }, [router]);

  // Load active riders list (for Admin assignment dropdown)
  const loadActiveRiders = async () => {
    try {
      const res = await fetch("/api/v1/admin/staff", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const riders = data.data.filter(
          (s: any) => s.role === "RIDER" && s.isActive
        );
        setActiveRiders(riders);
      }
    } catch (err) {
      console.warn("Failed to load riders list:", err);
    }
  };

  // Load active delivery orders
  const loadDeliveryOrders = async (silent = false) => {
    if (authStatus !== "authorized") return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/v1/ops/orders?orderType=DELIVERY");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const now = Date.now();
        // Lock merge: NEVER let server response reverse an in-flight status or rider assignment!
        const mergedOrders = data.data.map((ord: Order) => {
          const lock = recentStatusUpdatesRef.current.get(ord.id);
          if (lock) {
            if (now - lock.timestamp < 15000) {
              const statusMatched = ord.status === lock.status;
              const riderMatched =
                lock.assignedRiderId === undefined || ord.assignedRiderId === lock.assignedRiderId;
              if (statusMatched && riderMatched) {
                recentStatusUpdatesRef.current.delete(ord.id);
                return ord;
              } else {
                return {
                  ...ord,
                  status: lock.status as any,
                  assignedRiderId:
                    lock.assignedRiderId !== undefined ? lock.assignedRiderId : ord.assignedRiderId,
                };
              }
            } else {
              recentStatusUpdatesRef.current.delete(ord.id);
            }
          }
          return ord;
        });

        setOrders(mergedOrders);

        if (selectedOrder) {
          const updated = mergedOrders.find((o: Order) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load delivery orders:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial load and periodic sync
  useEffect(() => {
    if (authStatus === "authorized") {
      loadDeliveryOrders();
      if (currentUser?.role === "ADMIN") {
        loadActiveRiders();
      }
      const interval = setInterval(() => loadDeliveryOrders(true), 6000);
      return () => clearInterval(interval);
    }
  }, [authStatus, currentUser?.role]);

  // Handle status update (Optimistic Update & Lock)
  const handleStatusUpdate = async (orderId: string, targetStatus: string) => {
    if (actionInProgress === orderId) return;
    setActionInProgress(orderId);

    const prevOrders = [...orders];

    // 1. Lock immediately so background polling NEVER reverts this status
    recentStatusUpdatesRef.current.set(orderId, {
      status: targetStatus,
      timestamp: Date.now(),
    });

    // 2. Immediate optimistic update in UI (< 10ms)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus as any } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: targetStatus as any } : null));
    }

    // 3. Background server persistence
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update delivery status");
      }
    } catch (err: any) {
      console.error("Rider status update error:", err);
      recentStatusUpdatesRef.current.delete(orderId);
      setOrders(prevOrders);
      if (selectedOrder && selectedOrder.id === orderId) {
        const orig = prevOrders.find((o) => o.id === orderId);
        if (orig) setSelectedOrder(orig);
      }
      alert(err.message || "Could not update delivery status. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Rider Assignment (Admin action with Lock)
  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (actionInProgress === orderId) return;
    setActionInProgress(orderId);

    const prevOrders = [...orders];
    const rider = activeRiders.find((r) => r.id === riderId);
    const riderName = rider ? rider.fullName : riderId ? "Assigned Rider" : null;
    const riderPhone = rider?.phone || null;
    const targetOrder = orders.find((o) => o.id === orderId);

    // 1. Lock immediately so background polling NEVER reverts this rider assignment
    recentStatusUpdatesRef.current.set(orderId, {
      status: targetOrder?.status || ORDER_STATUSES.READY,
      assignedRiderId: riderId || undefined,
      timestamp: Date.now(),
    });

    // 2. Optimistic update in UI
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedRiderId: riderId || null,
              assignedRiderName: riderName,
              assignedRiderPhone: riderPhone,
            }
          : o
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              assignedRiderId: riderId || null,
              assignedRiderName: riderName,
              assignedRiderPhone: riderPhone,
            }
          : null
      );
    }

    // 3. Background server persistence
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: targetOrder?.status || ORDER_STATUSES.READY,
          assignedRiderId: riderId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to assign rider");
      }
    } catch (err: any) {
      console.error("Assign rider error:", err);
      recentStatusUpdatesRef.current.delete(orderId);
      setOrders(prevOrders);
      if (selectedOrder && selectedOrder.id === orderId) {
        const orig = prevOrders.find((o) => o.id === orderId);
        if (orig) setSelectedOrder(orig);
      }
      alert(err.message || "Failed to assign rider. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    let unassigned = 0;
    let ready = 0;
    let inTransit = 0;
    let completedToday = 0;

    const todayStr = new Date().toDateString();

    orders.forEach((o) => {
      const isToday = new Date(o.createdAt).toDateString() === todayStr;

      if (!o.assignedRiderId && o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED) {
        unassigned++;
      }
      if (o.status === ORDER_STATUSES.READY) ready++;
      if (o.status === ORDER_STATUSES.OUT_FOR_DELIVERY) inTransit++;
      if (o.status === ORDER_STATUSES.COMPLETED && isToday) completedToday++;
    });

    return {
      unassigned,
      ready,
      inTransit,
      completedToday,
      totalActiveRiders: activeRiders.length,
      totalActiveDeliveries: orders.filter(
        (o) => o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED
      ).length,
    };
  }, [orders, activeRiders]);

  // Filtered & Sorted Deliveries
  const filteredDeliveries = useMemo(() => {
    return orders
      .filter((o) => {
        if (viewMode === "MY_RUNS" && currentUser) {
          const isMyRun = o.assignedRiderId === currentUser.id;
          const isUnassignedReady = !o.assignedRiderId && o.status === ORDER_STATUSES.READY;
          if (!isMyRun && !isUnassignedReady) return false;
        }

        if (statusFilter !== "ALL") {
          if (statusFilter === "READY" && o.status !== ORDER_STATUSES.READY) return false;
          if (statusFilter === "OUT_FOR_DELIVERY" && o.status !== ORDER_STATUSES.OUT_FOR_DELIVERY) return false;
          if (statusFilter === "COMPLETED" && o.status !== ORDER_STATUSES.COMPLETED) return false;
          if (statusFilter === "ACTIVE" && [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED].includes(o.status as any)) return false;
        }

        if (assignmentFilter === "UNASSIGNED" && o.assignedRiderId) return false;
        if (assignmentFilter === "ASSIGNED" && !o.assignedRiderId) return false;

        if (selectedRiderFilter !== "ALL" && o.assignedRiderId !== selectedRiderFilter) return false;

        if (debouncedSearch) {
          const matchOrderNo = o.orderNumber?.toLowerCase().includes(debouncedSearch);
          const matchCustName = (o.customerNameSnapshot || o.customerName || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchCustPhone = (o.customerPhoneSnapshot || o.customerPhone || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchArea = (o.deliveryAreaNameSnapshot || o.deliveryAreaName || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchAddress = (o.deliveryAddressSnapshot || o.deliveryAddress || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchRider = (o.assignedRiderName || "").toLowerCase().includes(debouncedSearch);

          if (!matchOrderNo && !matchCustName && !matchCustPhone && !matchArea && !matchAddress && !matchRider) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aIsTerminal = [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED].includes(a.status as any);
        const bIsTerminal = [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED].includes(b.status as any);

        // Active deliveries first, completed/cancelled last
        if (!aIsTerminal && bIsTerminal) return -1;
        if (aIsTerminal && !bIsTerminal) return 1;

        if (sortBy === "OLDEST") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === "TOTAL") {
          return (b.totalPkr || 0) - (a.totalPkr || 0);
        } else if (sortBy === "ORDER_NO") {
          return (a.orderNumber || "").localeCompare(b.orderNumber || "");
        } else {
          // Default: NEWEST first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [orders, viewMode, currentUser, statusFilter, assignmentFilter, selectedRiderFilter, debouncedSearch, sortBy]);

  const hasActiveFilters =
    debouncedSearch !== "" ||
    statusFilter !== "ALL" ||
    assignmentFilter !== "ALL" ||
    selectedRiderFilter !== "ALL" ||
    sortBy !== "NEWEST";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setAssignmentFilter("ALL");
    setSelectedRiderFilter("ALL");
    setSortBy("NEWEST");
  };

  if (authStatus === "loading") {
    return (
      <div
        style={{
          backgroundColor: "var(--cnm-bg, #0f1117)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cnm-text-primary, #ffffff)",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <RefreshCw
            className="spin"
            size={32}
            style={{ color: "var(--cnm-orange, #f97316)", margin: "0 auto 16px" }}
          />
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "4px" }}>
            Connecting to Rider Delivery Dispatch...
          </h2>
          <p style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.82rem" }}>
            Verifying rider credentials & active dispatch routes
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div
        style={{
          backgroundColor: "var(--cnm-bg, #0f1117)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cnm-text-primary, #ffffff)",
          padding: "24px",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            textAlign: "center",
            backgroundColor: "var(--cnm-surface, #1e2230)",
            padding: "32px",
            borderRadius: "10px",
            border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          }}
        >
          <AlertTriangle
            size={42}
            style={{ color: "var(--cnm-orange, #f97316)", margin: "0 auto 14px" }}
          />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px" }}>
            403 — Dispatch Access Restricted
          </h2>
          <p
            style={{
              color: "var(--cnm-text-muted, #94a3b8)",
              fontSize: "0.85rem",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
          >
            The Rider Delivery Portal requires verified <strong>RIDER</strong> or{" "}
            <strong>ADMIN</strong> credentials.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <Link
              href="/staff/login"
              style={{
                backgroundColor: "#f97316",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              STAFF LOGIN
            </Link>
            <Link
              href="/"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              STOREFRONT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rider-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}
      style={{
        backgroundColor: "var(--cnm-bg, #0f1117)",
        minHeight: "100vh",
        color: "var(--cnm-text-primary, #ffffff)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. TOP DISPATCH HEADER */}
      <header
        style={{
          backgroundColor: "var(--cnm-surface, #1e2230)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {currentUser?.role === "ADMIN" && (
            <Link
              href="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                textDecoration: "none",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
              }}
              title="Back to Admin Center"
              aria-label="Back to Admin Center"
            >
              <ArrowLeft size={16} />
            </Link>
          )}

          <div
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bike size={18} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                RIDER DISPATCH
              </h1>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                {currentUser?.fullName && (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--cnm-text-primary, #ffffff)",
                    }}
                  >
                    {currentUser.fullName}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.65rem",
                    backgroundColor: currentUser?.role === "ADMIN" ? "rgba(59, 130, 246, 0.18)" : "rgba(16, 185, 129, 0.18)",
                    color: currentUser?.role === "ADMIN" ? "#60a5fa" : "#10b981",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  {currentUser?.role === "ADMIN" && <ShieldCheck size={10} />}
                  {currentUser?.role || "RIDER"}
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--cnm-text-muted, #94a3b8)",
                display: "block",
                marginTop: "1px",
              }}
            >
              Live dispatch queue
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Admin View Mode Toggle */}
          {currentUser?.role === "ADMIN" && (
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--cnm-bg, #0f1117)",
                borderRadius: "5px",
                padding: "2px",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("ALL_DISPATCH")}
                style={{
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: viewMode === "ALL_DISPATCH" ? "#3b82f6" : "transparent",
                  color: viewMode === "ALL_DISPATCH" ? "#ffffff" : "var(--cnm-text-muted, #94a3b8)",
                }}
              >
                All Dispatch
              </button>
              <button
                type="button"
                onClick={() => setViewMode("MY_RUNS")}
                style={{
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: viewMode === "MY_RUNS" ? "#3b82f6" : "transparent",
                  color: viewMode === "MY_RUNS" ? "#ffffff" : "var(--cnm-text-muted, #94a3b8)",
                }}
              >
                Rider Mode
              </button>
            </div>
          )}

          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
              color: "var(--cnm-text-primary, #ffffff)",
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadDeliveryOrders(false)}
            disabled={isLoading}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
              color: "var(--cnm-text-primary, #ffffff)",
              padding: "5px 10px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "spin" : ""} />
            <span className="hide-on-mobile">Sync</span>
          </button>
        </div>
      </header>

      {/* 2. KPI METRICS SUMMARY BAR */}
      {/* 2. KPI METRICS SUMMARY BAR */}
      <div className="rider-kpi-bar">
        {/* KPI: Unassigned Deliveries (Admin only) */}
        {currentUser?.role === "ADMIN" && (
          <div
            className={`rider-kpi-chip ${assignmentFilter === "UNASSIGNED" ? "is-active" : ""} ${kpis.unassigned > 0 ? "has-alert" : ""}`}
            onClick={() => {
              if (assignmentFilter === "UNASSIGNED") {
                setAssignmentFilter("ALL");
              } else {
                setAssignmentFilter("UNASSIGNED");
                setStatusFilter("ALL");
              }
            }}
          >
            <span className="rider-kpi-label" style={{ color: kpis.unassigned > 0 ? "#ef4444" : "var(--cnm-text-muted)" }}>
              Unassigned
            </span>
            <span className="rider-kpi-val" style={{ color: kpis.unassigned > 0 ? "#ef4444" : "inherit" }}>
              {kpis.unassigned}
            </span>
          </div>
        )}

        {/* KPI: Ready for Pickup */}
        <div
          className={`rider-kpi-chip ${statusFilter === "READY" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter(statusFilter === "READY" ? "ALL" : "READY");
            setAssignmentFilter("ALL");
          }}
        >
          <span className="rider-kpi-label" style={{ color: "#f97316" }}>Ready</span>
          <span className="rider-kpi-val">{kpis.ready}</span>
        </div>

        {/* KPI: Out for Delivery */}
        <div
          className={`rider-kpi-chip ${statusFilter === "OUT_FOR_DELIVERY" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter(statusFilter === "OUT_FOR_DELIVERY" ? "ALL" : "OUT_FOR_DELIVERY");
            setAssignmentFilter("ALL");
          }}
        >
          <span className="rider-kpi-label" style={{ color: "#60a5fa" }}>In Transit</span>
          <span className="rider-kpi-val">{kpis.inTransit}</span>
        </div>

        {/* KPI: Completed Today */}
        <div
          className={`rider-kpi-chip ${statusFilter === "COMPLETED" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter(statusFilter === "COMPLETED" ? "ALL" : "COMPLETED");
            setAssignmentFilter("ALL");
          }}
        >
          <span className="rider-kpi-label" style={{ color: "#10b981" }}>Delivered</span>
          <span className="rider-kpi-val">{kpis.completedToday}</span>
        </div>

        {/* KPI: Active Riders */}
        <div className="rider-kpi-chip">
          <span className="rider-kpi-label" style={{ color: "var(--cnm-text-muted)" }}>Fleet Riders</span>
          <span className="rider-kpi-val">{activeRiders.length}</span>
        </div>
      </div>

      {/* 3. MOBILE STATUS TABS (Active on mobile screens <= 768px) */}
      <div className="rider-mobile-status-tabs show-on-mobile">
        <button
          type="button"
          className={`rider-status-tab ${statusFilter === "ALL" && assignmentFilter === "ALL" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter("ALL");
            setAssignmentFilter("ALL");
          }}
        >
          <span>All</span>
          <span className="tab-pill">{orders.length}</span>
        </button>

        {currentUser?.role === "ADMIN" && (
          <button
            type="button"
            className={`rider-status-tab ${assignmentFilter === "UNASSIGNED" ? "is-active" : ""}`}
            onClick={() => {
              setAssignmentFilter("UNASSIGNED");
              setStatusFilter("ALL");
            }}
          >
            <span>Unassigned</span>
            <span className="tab-pill" style={{ color: "#ef4444" }}>{kpis.unassigned}</span>
          </button>
        )}

        <button
          type="button"
          className={`rider-status-tab ${statusFilter === "READY" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter("READY");
            setAssignmentFilter("ALL");
          }}
        >
          <span>Ready</span>
          <span className="tab-pill" style={{ color: "#f97316" }}>{kpis.ready}</span>
        </button>

        <button
          type="button"
          className={`rider-status-tab ${assignmentFilter === "ASSIGNED" ? "is-active" : ""}`}
          onClick={() => {
            setAssignmentFilter("ASSIGNED");
            setStatusFilter("ALL");
          }}
        >
          <span>Assigned</span>
        </button>

        <button
          type="button"
          className={`rider-status-tab ${statusFilter === "OUT_FOR_DELIVERY" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter("OUT_FOR_DELIVERY");
            setAssignmentFilter("ALL");
          }}
        >
          <span>In Transit</span>
          <span className="tab-pill" style={{ color: "#60a5fa" }}>{kpis.inTransit}</span>
        </button>

        <button
          type="button"
          className={`rider-status-tab ${statusFilter === "COMPLETED" ? "is-active" : ""}`}
          onClick={() => {
            setStatusFilter("COMPLETED");
            setAssignmentFilter("ALL");
          }}
        >
          <span>Delivered</span>
          <span className="tab-pill" style={{ color: "#10b981" }}>{kpis.completedToday}</span>
        </button>
      </div>

      {/* 4. SEARCH & DISPATCH FILTERS */}
      <div className="rider-controls-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "9px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cnm-text-muted, #94a3b8)",
              }}
            />
            <input
              type="text"
              placeholder="Search order #, customer, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px 6px 28px",
                backgroundColor: "var(--cnm-bg, #0f1117)",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                borderRadius: "5px",
                color: "var(--cnm-text-primary, #ffffff)",
                fontSize: "0.8rem",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Desktop Filter Selectors */}
          <div className="rider-desktop-filters hide-on-mobile">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rider-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">All Active</option>
              <option value="READY">Ready for Pickup</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="COMPLETED">Delivered</option>
            </select>

            {/* Rider Filter (Admin only) */}
            {currentUser?.role === "ADMIN" && activeRiders.length > 0 && (
              <select
                value={selectedRiderFilter}
                onChange={(e) => setSelectedRiderFilter(e.target.value)}
                className="rider-select"
              >
                <option value="ALL">All Riders</option>
                {activeRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            )}

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rider-select"
            >
              <option value="OLDEST">Oldest Placed (Priority)</option>
              <option value="NEWEST">Newest Placed</option>
              <option value="TOTAL">Highest Cash</option>
              <option value="ORDER_NO">Order Number</option>
            </select>
          </div>

          {/* Mobile Filters Toggle Button */}
          <button
            type="button"
            className="rider-mobile-filter-btn show-on-mobile"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <span>Filters</span>
            {hasActiveFilters && <span className="active-dot" />}
          </button>
        </div>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rider-reset-filters-btn"
          >
            <X size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Mobile Collapsible Filters Panel */}
      {mobileFiltersOpen && (
        <div className="rider-mobile-filters-drawer show-on-mobile">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <div style={{ flex: "1 1 120px" }}>
              <label style={{ fontSize: "0.68rem", color: "var(--cnm-text-muted)", display: "block", marginBottom: "3px" }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rider-select"
                style={{ width: "100%" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">All Active</option>
                <option value="READY">Ready for Pickup</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="COMPLETED">Delivered</option>
              </select>
            </div>

            {currentUser?.role === "ADMIN" && activeRiders.length > 0 && (
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: "0.68rem", color: "var(--cnm-text-muted)", display: "block", marginBottom: "3px" }}>
                  Rider
                </label>
                <select
                  value={selectedRiderFilter}
                  onChange={(e) => setSelectedRiderFilter(e.target.value)}
                  className="rider-select"
                  style={{ width: "100%" }}
                >
                  <option value="ALL">All Riders</option>
                  {activeRiders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ flex: "1 1 120px" }}>
              <label style={{ fontSize: "0.68rem", color: "var(--cnm-text-muted)", display: "block", marginBottom: "3px" }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rider-select"
                style={{ width: "100%" }}
              >
                <option value="OLDEST">Oldest Placed (Priority)</option>
                <option value="NEWEST">Newest Placed</option>
                <option value="TOTAL">Highest Cash</option>
                <option value="ORDER_NO">Order Number</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPACT DISPATCH LIST / BOARD */}
      <main style={{ padding: "12px 14px", flex: 1 }}>
        {filteredDeliveries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              color: "var(--cnm-text-muted, #94a3b8)",
              backgroundColor: "var(--cnm-surface, #1e2230)",
              borderRadius: "10px",
              border: "1px dashed var(--cnm-border, rgba(255,255,255,0.1))",
              maxWidth: "460px",
              margin: "30px auto",
            }}
          >
            <Bike size={36} style={{ margin: "0 auto 10px", opacity: 0.3, color: "#3b82f6" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--cnm-text-primary, #fff)" }}>
              {hasActiveFilters ? "No Deliveries Matching Filter" : "No Active Delivery Orders"}
            </h3>
            <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
              {hasActiveFilters
                ? "Try resetting filters to show all active dispatch tickets."
                : "When customers place delivery orders and kitchen prepares them, they will appear here."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  marginTop: "12px",
                  padding: "6px 12px",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Dispatch Grid */}
            <div className="rider-delivery-grid hide-on-mobile">
              {filteredDeliveries.map((delivery) => (
                <RiderDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  currentUser={currentUser}
                  activeRiders={activeRiders}
                  onStatusUpdate={handleStatusUpdate}
                  onAssignRider={handleAssignRider}
                  onViewDetails={() => setSelectedOrder(delivery)}
                  isUpdating={actionInProgress === delivery.id}
                />
              ))}
            </div>

            {/* Mobile Single-Column Compact Delivery Rows */}
            <div className="rider-mobile-delivery-list show-on-mobile">
              {filteredDeliveries.map((delivery) => (
                <RiderDeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  currentUser={currentUser}
                  activeRiders={activeRiders}
                  onStatusUpdate={handleStatusUpdate}
                  onAssignRider={handleAssignRider}
                  onViewDetails={() => setSelectedOrder(delivery)}
                  isUpdating={actionInProgress === delivery.id}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* 5. DELIVERY DETAIL DRAWER / MOBILE BOTTOM SHEET */}
      {selectedOrder && (
        <div
          className="modal-backdrop rider-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 100,
          }}
        >
          <div
            className="modal-box rider-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--cnm-surface, #1e2230)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="rider-sheet-handle-bar show-on-mobile">
              <span className="rider-sheet-handle-pill" />
            </div>

            {/* Modal Header */}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                    {selectedOrder.orderNumber}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      backgroundColor:
                        selectedOrder.status === ORDER_STATUSES.OUT_FOR_DELIVERY
                          ? "#3b82f6"
                          : selectedOrder.status === ORDER_STATUSES.COMPLETED
                          ? "#10b981"
                          : "#f97316",
                      color: "#ffffff",
                    }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--cnm-text-muted, #94a3b8)",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  Placed: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: "5px",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Customer Contact & Call */}
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "6px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem" }}>
                    {selectedOrder.customerNameSnapshot || selectedOrder.customerName || "Customer"}
                  </span>
                  <span style={{ fontSize: "0.76rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                    Phone: {selectedOrder.customerPhoneSnapshot || selectedOrder.customerPhone || "N/A"}
                  </span>
                </div>

                {(selectedOrder.customerPhoneSnapshot || selectedOrder.customerPhone) && (
                  <a
                    href={`tel:${selectedOrder.customerPhoneSnapshot || selectedOrder.customerPhone}`}
                    style={{
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      textDecoration: "none",
                      padding: "6px 12px",
                      borderRadius: "5px",
                      fontWeight: 600,
                      fontSize: "0.76rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Phone size={13} />
                    <span>Call Customer</span>
                  </a>
                )}
              </div>

              {/* Delivery Address & Google Maps link */}
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "6px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <MapPin size={16} color="#f97316" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: "#f97316", fontSize: "0.8rem" }}>
                      Area: {selectedOrder.deliveryAreaNameSnapshot || selectedOrder.deliveryAreaName || "General Area"}
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", lineHeight: 1.4 }}>
                      {selectedOrder.deliveryAddressSnapshot || selectedOrder.deliveryAddress || "Address on record"}
                    </p>
                    {(selectedOrder.deliveryLandmarkSnapshot || selectedOrder.deliveryLandmark) && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--cnm-text-muted, #94a3b8)",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        Landmark: {selectedOrder.deliveryLandmarkSnapshot || selectedOrder.deliveryLandmark}
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedOrder.deliveryAddressSnapshot || selectedOrder.deliveryAddress || ""}, Kharian`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#60a5fa",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    alignSelf: "flex-start",
                    marginTop: "2px",
                    marginLeft: "22px",
                  }}
                >
                  <span>Open in Google Maps</span>
                  <ExternalLinkIcon size={11} />
                </a>
              </div>

              {/* Rider Assignment Section */}
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "#60a5fa",
                      textTransform: "uppercase",
                      display: "block",
                    }}
                  >
                    Assigned Delivery Rider
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    {selectedOrder.assignedRiderName || "Unassigned"}
                  </span>
                  {selectedOrder.assignedRiderPhone && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--cnm-text-muted, #94a3b8)",
                        display: "block",
                      }}
                    >
                      Phone: {selectedOrder.assignedRiderPhone}
                    </span>
                  )}
                </div>

                {currentUser?.role === "ADMIN" && activeRiders.length > 0 && (
                  <select
                    value={selectedOrder.assignedRiderId || ""}
                    onChange={(e) => handleAssignRider(selectedOrder.id, e.target.value)}
                    disabled={actionInProgress === selectedOrder.id}
                    style={{
                      padding: "5px 8px",
                      backgroundColor: "var(--cnm-surface, #1e2230)",
                      border: "1px solid var(--cnm-border, rgba(255,255,255,0.2))",
                      borderRadius: "5px",
                      color: "var(--cnm-text-primary, #ffffff)",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                    }}
                  >
                    <option value="">-- Unassigned --</option>
                    {activeRiders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName} ({r.activeOrdersAssigned || 0} active)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cash to Collect Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "rgba(249, 115, 22, 0.1)",
                  border: "1px dashed #f97316",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  CASH TO COLLECT
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f97316" }}>
                  {selectedOrder.totalPkr?.toLocaleString()} PKR
                </span>
              </div>

              {/* Item summary */}
              <div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--cnm-text-muted, #94a3b8)",
                    letterSpacing: "0.03em",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Order Items ({selectedOrder.items?.length || 0})
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "7px 9px",
                        backgroundColor: "var(--cnm-surface-elevated, #161922)",
                        borderRadius: "5px",
                        fontSize: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        <strong>{item.quantity}x</strong> {item.productNameSnapshot || item.productName}
                        {(item.variantNameSnapshot || item.variantName) && (
                          <span style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.72rem", marginLeft: "5px" }}>
                            ({item.variantNameSnapshot || item.variantName})
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {item.lineTotalPkr?.toLocaleString()} PKR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: "12px 18px",
                borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              {selectedOrder.status === ORDER_STATUSES.READY && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedOrder.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                  disabled={actionInProgress === selectedOrder.id}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Bike size={15} />
                  <span>Pick Up & Start Delivery</span>
                </button>
              )}

              {selectedOrder.status === ORDER_STATUSES.OUT_FOR_DELIVERY && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedOrder.id, ORDER_STATUSES.COMPLETED)}
                  disabled={actionInProgress === selectedOrder.id}
                  style={{
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Mark Delivered & Cash Collected</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "var(--cnm-text-primary, #ffffff)",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontWeight: 500,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX for Responsive Grid and Themes */}
      <style jsx global>{`
        .rider-root.theme-dark {
          --cnm-bg: #0f1117;
          --cnm-surface: #1e2230;
          --cnm-surface-elevated: #161922;
          --cnm-border: rgba(255, 255, 255, 0.08);
          --cnm-text-primary: #ffffff;
          --cnm-text-muted: #94a3b8;
          --card-bg: #1e2230;
        }

        .rider-root.theme-light {
          --cnm-bg: #f8fafc;
          --cnm-surface: #ffffff;
          --cnm-surface-elevated: #f1f5f9;
          --cnm-border: #e2e8f0;
          --cnm-text-primary: #0f172a;
          --cnm-text-muted: #64748b;
          --card-bg: #ffffff;
        }

        .show-on-mobile {
          display: none !important;
        }

        .rider-kpi-bar {
          background-color: var(--cnm-surface-elevated, #161922);
          border-bottom: 1px solid var(--cnm-border, rgba(255,255,255,0.06));
          padding: 8px 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
        }

        .rider-kpi-chip {
          padding: 6px 10px;
          background-color: var(--cnm-surface, #1e2230);
          border: 1px solid var(--cnm-border, rgba(255,255,255,0.06));
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rider-kpi-chip.is-active {
          border-color: var(--cnm-orange, #f97316);
          background-color: rgba(249, 115, 22, 0.15);
        }

        .rider-kpi-chip.has-alert {
          border-color: rgba(239, 68, 68, 0.4);
          background-color: rgba(239, 68, 68, 0.12);
        }

        .rider-kpi-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          display: block;
        }

        .rider-kpi-val {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .rider-controls-bar {
          padding: 8px 16px;
          background-color: var(--cnm-surface, #1e2230);
          border-bottom: 1px solid var(--cnm-border, rgba(255,255,255,0.06));
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justifyContent: space-between;
          gap: 8px;
        }

        .rider-desktop-filters {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rider-select {
          padding: 6px 8px;
          background-color: var(--cnm-bg, #0f1117);
          border: 1px solid var(--cnm-border, rgba(255,255,255,0.1));
          border-radius: 5px;
          color: var(--cnm-text-primary, #ffffff);
          font-size: 0.78rem;
          font-weight: 500;
        }

        .rider-reset-filters-btn {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #ef4444;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rider-delivery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 360px));
          gap: 12px;
        }

        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: flex !important;
          }
          .show-on-mobile.rider-mobile-delivery-list {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
            width: 100%;
          }
          .show-on-mobile.rider-card-mobile-summary {
            display: block !important;
          }
          .rider-kpi-bar {
            display: flex;
            overflow-x: auto;
            gap: 6px;
            padding: 6px 12px;
            scrollbar-width: none;
          }
          .rider-kpi-bar::-webkit-scrollbar {
            display: none;
          }
          .rider-kpi-chip {
            flex: 0 0 auto;
            min-width: 90px;
            padding: 5px 8px;
          }
          .rider-kpi-label {
            font-size: 0.6rem;
          }
          .rider-kpi-val {
            font-size: 0.95rem;
          }
          .rider-mobile-status-tabs {
            display: flex !important;
            gap: 6px;
            padding: 6px 12px;
            background-color: var(--cnm-surface);
            border-bottom: 1px solid var(--cnm-border);
            overflow-x: auto;
            scrollbar-width: none;
          }
          .rider-mobile-status-tabs::-webkit-scrollbar {
            display: none;
          }
          .rider-status-tab {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid var(--cnm-border);
            background-color: var(--cnm-bg);
            color: var(--cnm-text-muted);
            font-size: 0.74rem;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .rider-status-tab.is-active {
            background-color: var(--cnm-surface-elevated);
            color: var(--cnm-text-primary);
            border-color: var(--cnm-orange, #f97316);
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          }
          .rider-status-tab .tab-pill {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 10px;
            background: rgba(255,255,255,0.08);
          }
          .rider-controls-bar {
            padding: 6px 12px;
          }
          .rider-mobile-filter-btn {
            background: var(--cnm-surface-elevated);
            border: 1px solid var(--cnm-border);
            color: var(--cnm-text-primary);
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.74rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .rider-mobile-filter-btn .active-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--cnm-orange, #f97316);
          }
          .rider-mobile-filters-drawer {
            display: block !important;
            padding: 8px 12px;
            background-color: var(--cnm-surface-elevated);
            border-bottom: 1px solid var(--cnm-border);
          }

          /* Bottom Sheet for Delivery Details */
          .rider-modal-backdrop {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          .rider-modal-box {
            max-width: 100% !important;
            max-height: 85vh !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            animation: riderSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .rider-sheet-handle-bar {
            display: flex !important;
            align-items: center;
            justify-content: center;
            padding: 8px 0 4px;
            cursor: grab;
          }
          .rider-sheet-handle-pill {
            width: 38px;
            height: 4px;
            border-radius: 2px;
            background-color: var(--cnm-text-muted);
            opacity: 0.35;
          }
        }

        @keyframes riderSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Compact Rider Delivery Card Component with Prominent Admin Rider Assignment
function RiderDeliveryCard({
  delivery,
  currentUser,
  activeRiders,
  onStatusUpdate,
  onAssignRider,
  onViewDetails,
  isUpdating,
}: {
  delivery: Order;
  currentUser: { id: string; fullName: string; role: string } | null;
  activeRiders: StaffRider[];
  onStatusUpdate: (orderId: string, targetStatus: string) => Promise<void>;
  onAssignRider: (orderId: string, riderId: string) => Promise<void>;
  onViewDetails: () => void;
  isUpdating: boolean;
}) {
  const isInTransit = delivery.status === ORDER_STATUSES.OUT_FOR_DELIVERY;
  const isDelivered = delivery.status === ORDER_STATUSES.COMPLETED;
  const isReady = delivery.status === ORDER_STATUSES.READY;
  const isUnassigned = !delivery.assignedRiderId;
  const isAdmin = currentUser?.role === "ADMIN";

  // Status color
  const statusColor = isInTransit
    ? "#3b82f6"
    : isDelivered
    ? "#10b981"
    : "#f97316";

  const customerPhone = delivery.customerPhoneSnapshot || delivery.customerPhone;
  const addressText = delivery.deliveryAddressSnapshot || delivery.deliveryAddress || "Address on record";
  const areaName = delivery.deliveryAreaNameSnapshot || delivery.deliveryAreaName || "Area";

  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #1e2230)",
        borderRadius: "7px",
        border: isInTransit
          ? "1.5px solid #3b82f6"
          : isUnassigned && !isDelivered
          ? "1.5px solid #ef4444"
          : "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
        boxShadow: isInTransit
          ? "0 3px 10px rgba(59, 130, 246, 0.12)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.15s ease",
      }}
    >
      {/* Top Banner with Order #, Placed Time, and Status */}
      <div
        style={{
          padding: "6px 9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
            {delivery.orderNumber}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--cnm-text-muted, #94a3b8)",
            }}
          >
            ({new Date(delivery.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
          </span>
        </div>

        <span
          style={{
            fontSize: "0.66rem",
            fontWeight: 600,
            color: statusColor,
            backgroundColor: `${statusColor}15`,
            border: `1px solid ${statusColor}35`,
            padding: "2px 6px",
            borderRadius: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {delivery.status}
        </span>
      </div>

      {/* Mobile Compact Delivery Row (Single-row tap to open bottom sheet drawer) */}
      <div
        className="rider-card-mobile-summary show-on-mobile"
        onClick={onViewDetails}
        style={{
          padding: "7px 9px",
          cursor: "pointer",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.04))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flex: 1, marginRight: "8px" }}>
            <MapPin size={12} color="#f97316" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cnm-orange, #f97316)", whiteSpace: "nowrap" }}>
              {areaName}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)" }}>•</span>
            <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--cnm-text-primary, #ffffff)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {delivery.customerNameSnapshot || delivery.customerName || "Customer"}
            </span>
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#f97316", whiteSpace: "nowrap" }}>
            {delivery.totalPkr?.toLocaleString()} PKR
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem" }}>
          {isAdmin && (
            <span style={{ color: isUnassigned ? "#ef4444" : "#60a5fa", fontWeight: 600 }}>
              {delivery.assignedRiderName ? `Rider: ${delivery.assignedRiderName}` : "⚠️ Unassigned"}
            </span>
          )}
          <span style={{ color: "var(--cnm-text-muted, #94a3b8)", marginLeft: "auto" }}>
            Tap for address & items →
          </span>
        </div>
      </div>

      {/* Main Delivery Info (Desktop Only) */}
      <div className="rider-card-desktop-body hide-on-mobile" style={{ padding: "8px 9px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Customer Name & Quick Call */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, display: "block" }}>
              {delivery.customerNameSnapshot || delivery.customerName || "Customer"}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
              {customerPhone || "No phone"}
            </span>
          </div>

          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                padding: "3px 7px",
                borderRadius: "5px",
                fontSize: "0.7rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
              title="Call customer"
            >
              <Phone size={10} />
              <span>Call</span>
            </a>
          )}
        </div>

        {/* Address & Google Maps link */}
        <div
          style={{
            padding: "6px 8px",
            backgroundColor: "var(--cnm-surface-elevated, #161922)",
            borderRadius: "5px",
            fontSize: "0.73rem",
            lineHeight: 1.3,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "5px" }}>
            <MapPin size={13} color="#f97316" style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <span style={{ fontWeight: 600, color: "#f97316" }}>{areaName}: </span>
              <span>{addressText}</span>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addressText}, Kharian`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#60a5fa",
              fontSize: "0.68rem",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              marginTop: "3px",
              marginLeft: "18px",
            }}
          >
            <span>Open Maps</span>
            <ExternalLinkIcon size={9} />
          </a>
        </div>

        {/* Cash to Collect */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 7px",
            backgroundColor: "rgba(249, 115, 22, 0.08)",
            border: "1px dashed rgba(249, 115, 22, 0.35)",
            borderRadius: "5px",
          }}
        >
          <span style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase" }}>
            Cash to Collect
          </span>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f97316" }}>
            {delivery.totalPkr?.toLocaleString()} PKR
          </span>
        </div>

        {/* PROMINENT RIDER ASSIGNMENT SECTION (Always visible for Admin) */}
        <div
          style={{
            padding: "6px 8px",
            backgroundColor: isUnassigned
              ? "rgba(239, 68, 68, 0.08)"
              : "rgba(59, 130, 246, 0.08)",
            border: `1px solid ${isUnassigned ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.2)"}`,
            borderRadius: "5px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <RiderIcon size={12} color={isUnassigned ? "#ef4444" : "#60a5fa"} />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: isUnassigned ? "#ef4444" : "#60a5fa",
                }}
              >
                {delivery.assignedRiderName ? `Rider: ${delivery.assignedRiderName}` : "⚠️ Unassigned"}
              </span>
            </div>

            {delivery.assignedRiderPhone && (
              <span style={{ fontSize: "0.68rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                {delivery.assignedRiderPhone}
              </span>
            )}
          </div>

          {/* Admin Assignment Selector with Real Rider Names */}
          {isAdmin && !isDelivered && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "0.66rem", color: "var(--cnm-text-muted, #94a3b8)", whiteSpace: "nowrap" }}>
                Assign:
              </span>
              <select
                value={delivery.assignedRiderId || ""}
                onChange={(e) => onAssignRider(delivery.id, e.target.value)}
                disabled={isUpdating}
                style={{
                  flex: 1,
                  padding: "3px 6px",
                  fontSize: "0.72rem",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.15))",
                  borderRadius: "4px",
                  color: "var(--cnm-text-primary, #ffffff)",
                  fontWeight: 500,
                }}
              >
                <option value="">-- Choose Rider --</option>
                {activeRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.activeOrdersAssigned || 0} active)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div
        style={{
          padding: "6px 9px",
          borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
          display: "flex",
          gap: "6px",
          marginTop: "auto",
        }}
      >
        <button
          type="button"
          onClick={onViewDetails}
          style={{
            background: "none",
            border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
            color: "var(--cnm-text-muted, #94a3b8)",
            borderRadius: "5px",
            padding: "4px 7px",
            fontSize: "0.7rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
          title="View full delivery details"
        >
          <EyeIcon size={11} />
          <span>Details</span>
        </button>

        {/* Pickup Action (if READY) */}
        {isReady && (
          <button
            type="button"
            onClick={() => onStatusUpdate(delivery.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
            disabled={isUpdating}
            style={{
              flex: 1,
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              border: "none",
              borderRadius: "5px",
              padding: "5px 8px",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Bike size={13} />
            <span>Pick Up & Dispatch</span>
          </button>
        )}

        {/* Delivered Action (if OUT_FOR_DELIVERY) */}
        {isInTransit && (
          <button
            type="button"
            onClick={() => onStatusUpdate(delivery.id, ORDER_STATUSES.COMPLETED)}
            disabled={isUpdating}
            style={{
              flex: 1,
              backgroundColor: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "5px",
              padding: "5px 8px",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <CheckCircle2 size={13} />
            <span>Delivered & Collected</span>
          </button>
        )}

        {/* Delivered Complete State */}
        {isDelivered && (
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#10b981",
              padding: "4px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <Check size={12} />
            <span>Delivered</span>
          </span>
        )}
      </div>
    </div>
  );
}
