"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("ALL"); // ALL | UNASSIGNED | ASSIGNED
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"OLDEST" | "NEWEST" | "ORDER_NO" | "TOTAL">("OLDEST");

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
        if (
          data.success &&
          (data.data?.profile?.role === "RIDER" || data.data?.profile?.role === "ADMIN")
        ) {
          const userRole = data.data.profile.role;
          setCurrentUser({
            id: user.id,
            fullName: data.data.profile.fullName || user.email?.split("@")[0] || "Staff Rider",
            role: userRole,
          });
          if (userRole === "RIDER") {
            setViewMode("MY_RUNS");
          }
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch {
        setAuthStatus("unauthorized");
      }
    };

    checkRiderAuth();
  }, [router]);

  // Load active riders list (for Admin assignment dropdown)
  const loadActiveRiders = async () => {
    try {
      const res = await fetch("/api/v1/admin/staff");
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
        setOrders(data.data);

        // Update selected order if open
        if (selectedOrder) {
          const updated = data.data.find((o: Order) => o.id === selectedOrder.id);
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
      const interval = setInterval(() => loadDeliveryOrders(true), 8000);
      return () => clearInterval(interval);
    }
  }, [authStatus, currentUser?.role]);

  // Handle status update (Optimistic Update)
  const handleStatusUpdate = async (orderId: string, targetStatus: string) => {
    if (actionInProgress) return;
    setActionInProgress(orderId);

    const prevOrders = [...orders];

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus as any } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: targetStatus as any } : null));
    }

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
      // Rollback
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

  // Handle Rider Assignment (Admin action)
  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (actionInProgress) return;
    setActionInProgress(orderId);

    const prevOrders = [...orders];
    const rider = activeRiders.find((r) => r.id === riderId);
    const riderName = rider ? rider.fullName : riderId ? "Assigned Rider" : null;
    const riderPhone = rider?.phone || null;

    // Optimistic update
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

    try {
      const targetOrder = orders.find((o) => o.id === orderId);
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
        // Mode filter: If viewing "MY_RUNS", only show deliveries assigned to current rider (or unassigned ready)
        if (viewMode === "MY_RUNS" && currentUser) {
          const isMyRun = o.assignedRiderId === currentUser.id;
          const isUnassignedReady = !o.assignedRiderId && o.status === ORDER_STATUSES.READY;
          if (!isMyRun && !isUnassignedReady) return false;
        }

        // Status filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "READY" && o.status !== ORDER_STATUSES.READY) return false;
          if (statusFilter === "OUT_FOR_DELIVERY" && o.status !== ORDER_STATUSES.OUT_FOR_DELIVERY) return false;
          if (statusFilter === "COMPLETED" && o.status !== ORDER_STATUSES.COMPLETED) return false;
          if (statusFilter === "ACTIVE" && [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED].includes(o.status as any)) return false;
        }

        // Assignment filter
        if (assignmentFilter === "UNASSIGNED" && o.assignedRiderId) return false;
        if (assignmentFilter === "ASSIGNED" && !o.assignedRiderId) return false;

        // Specific Rider filter
        if (selectedRiderFilter !== "ALL" && o.assignedRiderId !== selectedRiderFilter) return false;

        // Search query filter (Order #, customer name, phone, address area, rider name)
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
        if (sortBy === "OLDEST") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === "NEWEST") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === "TOTAL") {
          return (b.totalPkr || 0) - (a.totalPkr || 0);
        } else {
          return (a.orderNumber || "").localeCompare(b.orderNumber || "");
        }
      });
  }, [orders, viewMode, currentUser, statusFilter, assignmentFilter, selectedRiderFilter, debouncedSearch, sortBy]);

  const hasActiveFilters =
    debouncedSearch !== "" ||
    statusFilter !== "ALL" ||
    assignmentFilter !== "ALL" ||
    selectedRiderFilter !== "ALL" ||
    sortBy !== "OLDEST";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setAssignmentFilter("ALL");
    setSelectedRiderFilter("ALL");
    setSortBy("OLDEST");
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
          fontFamily: "var(--font-sans, system-ui)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <RefreshCw
            className="spin"
            size={36}
            style={{ color: "var(--cnm-orange, #f97316)", margin: "0 auto 16px" }}
          />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>
            Connecting to Rider Delivery Dispatch...
          </h2>
          <p style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.85rem" }}>
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
          fontFamily: "var(--font-sans, system-ui)",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            textAlign: "center",
            backgroundColor: "var(--cnm-surface, #1e2230)",
            padding: "36px",
            borderRadius: "12px",
            border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          }}
        >
          <AlertTriangle
            size={48}
            style={{ color: "var(--cnm-orange, #f97316)", margin: "0 auto 16px" }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>
            403 — Dispatch Access Restricted
          </h2>
          <p
            style={{
              color: "var(--cnm-text-muted, #94a3b8)",
              fontSize: "14px",
              marginBottom: "24px",
              lineHeight: 1.5,
            }}
          >
            The Rider Delivery Portal requires verified <strong>RIDER</strong> or{" "}
            <strong>ADMIN</strong> credentials. Customer accounts cannot access dispatch.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link
              href="/staff/login"
              style={{
                backgroundColor: "#f97316",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
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
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              CUSTOMER SITE
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
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. TOP DISPATCH HEADER */}
      <header
        style={{
          backgroundColor: "var(--cnm-surface, #1e2230)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {currentUser?.role === "ADMIN" ? (
            <Link
              href="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                color: "var(--cnm-text-muted, #94a3b8)",
                textDecoration: "none",
                padding: "5px 10px",
                borderRadius: "6px",
                backgroundColor: "rgba(255,255,255,0.05)",
                fontWeight: 600,
              }}
              title="Return to Admin Control Center"
            >
              <ArrowLeft size={16} />
              <span>Admin Center</span>
            </Link>
          ) : (
            <Link
              href="/"
              style={{
                color: "var(--cnm-text-muted, #94a3b8)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ArrowLeft size={20} />
            </Link>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#3b82f6",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bike size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    letterSpacing: "0.02em",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  RIDER DELIVERY DISPATCH
                </h1>
                {currentUser?.role === "ADMIN" && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <ShieldCheck size={11} /> ADMIN DISPATCH
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  display: "block",
                }}
              >
                Rider: <strong>{currentUser?.fullName}</strong> · Live dispatch queue
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Admin View Mode Toggle */}
          {currentUser?.role === "ADMIN" && (
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--cnm-bg, #0f1117)",
                borderRadius: "6px",
                padding: "2px",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("ALL_DISPATCH")}
                style={{
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
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
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
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
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
              padding: "6px 12px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span className="hide-on-mobile">Sync</span>
          </button>
        </div>
      </header>

      {/* 2. KPI METRICS SUMMARY BAR */}
      <div
        style={{
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          padding: "10px 18px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        {/* KPI: Unassigned Deliveries */}
        <div
          onClick={() => setAssignmentFilter(assignmentFilter === "UNASSIGNED" ? "ALL" : "UNASSIGNED")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              assignmentFilter === "UNASSIGNED"
                ? "rgba(239, 68, 68, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              assignmentFilter === "UNASSIGNED"
                ? "1.5px solid #ef4444"
                : kpis.unassigned > 0
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: kpis.unassigned > 0 ? "#ef4444" : "var(--cnm-text-muted, #94a3b8)",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Unassigned Orders
          </span>
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              lineHeight: 1.2,
              color: kpis.unassigned > 0 ? "#ef4444" : "inherit",
            }}
          >
            {kpis.unassigned}
          </span>
        </div>

        {/* KPI: Ready for Pickup */}
        <div
          onClick={() => setStatusFilter(statusFilter === "READY" ? "ALL" : "READY")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "READY"
                ? "rgba(249, 115, 22, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "READY"
                ? "1.5px solid #f97316"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#f97316",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Ready for Pickup
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.ready}
          </span>
        </div>

        {/* KPI: Out for Delivery */}
        <div
          onClick={() => setStatusFilter(statusFilter === "OUT_FOR_DELIVERY" ? "ALL" : "OUT_FOR_DELIVERY")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "OUT_FOR_DELIVERY"
                ? "rgba(59, 130, 246, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "OUT_FOR_DELIVERY"
                ? "1.5px solid #3b82f6"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#60a5fa",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Out for Delivery
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.inTransit}
          </span>
        </div>

        {/* KPI: Completed Today */}
        <div
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "COMPLETED"
                ? "rgba(16, 185, 129, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "COMPLETED"
                ? "1.5px solid #10b981"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#10b981",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Delivered Today
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.completedToday}
          </span>
        </div>

        {/* KPI: Active Riders */}
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--cnm-surface, #1e2230)",
            border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "8px",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--cnm-text-muted, #94a3b8)",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Active Fleet Riders
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {activeRiders.length}
          </span>
        </div>
      </div>

      {/* 3. SEARCH & DISPATCH FILTERS */}
      <div
        style={{
          padding: "10px 18px",
          backgroundColor: "var(--cnm-surface, #1e2230)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 300px" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: "340px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cnm-text-muted, #94a3b8)",
              }}
            />
            <input
              type="text"
              placeholder="Search order #, customer, area, rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                backgroundColor: "var(--cnm-bg, #0f1117)",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                borderRadius: "6px",
                color: "var(--cnm-text-primary, #ffffff)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              backgroundColor: "var(--cnm-bg, #0f1117)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "6px",
              color: "var(--cnm-text-primary, #ffffff)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
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
              style={{
                padding: "7px 10px",
                backgroundColor: "var(--cnm-bg, #0f1117)",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                borderRadius: "6px",
                color: "var(--cnm-text-primary, #ffffff)",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
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
            style={{
              padding: "7px 10px",
              backgroundColor: "var(--cnm-bg, #0f1117)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "6px",
              color: "var(--cnm-text-primary, #ffffff)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <option value="OLDEST">Oldest Placed (Priority)</option>
            <option value="NEWEST">Newest Placed</option>
            <option value="TOTAL">Highest Cash Total</option>
            <option value="ORDER_NO">Order Number</option>
          </select>
        </div>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* 4. COMPACT DISPATCH LIST / BOARD */}
      <main style={{ padding: "16px", flex: 1 }}>
        {filteredDeliveries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--cnm-text-muted, #94a3b8)",
              backgroundColor: "var(--cnm-surface, #1e2230)",
              borderRadius: "12px",
              border: "1px dashed var(--cnm-border, rgba(255,255,255,0.1))",
              maxWidth: "500px",
              margin: "40px auto",
            }}
          >
            <Bike size={48} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#3b82f6" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--cnm-text-primary, #fff)" }}>
              {hasActiveFilters ? "No Deliveries Matching Filter" : "No Active Delivery Orders"}
            </h3>
            <p style={{ fontSize: "0.85rem", marginTop: "6px" }}>
              {hasActiveFilters
                ? "Try resetting filters to show all active dispatch tickets."
                : "When customers place delivery orders and kitchen prepares them, they will appear here."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  marginTop: "14px",
                  padding: "6px 14px",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="rider-delivery-grid">
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
        )}
      </main>

      {/* 5. DELIVERY DETAIL DRAWER / MODAL */}
      {selectedOrder && (
        <div
          className="modal-backdrop"
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
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--cnm-surface, #1e2230)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 900, margin: 0 }}>
                    {selectedOrder.orderNumber}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 8px",
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
                    fontSize: "0.78rem",
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
                  borderRadius: "6px",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Customer Contact & Call */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "8px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ display: "block", fontWeight: 800, fontSize: "0.95rem" }}>
                    {selectedOrder.customerNameSnapshot || selectedOrder.customerName || "Customer"}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
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
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Phone size={14} />
                    <span>Call Customer</span>
                  </a>
                )}
              </div>

              {/* Delivery Address & Google Maps link */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "8px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <MapPin size={18} color="#f97316" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 800, color: "#f97316", fontSize: "0.85rem" }}>
                      Area: {selectedOrder.deliveryAreaNameSnapshot || selectedOrder.deliveryAreaName || "General Area"}
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "0.85rem", lineHeight: 1.4 }}>
                      {selectedOrder.deliveryAddressSnapshot || selectedOrder.deliveryAddress || "Address on record"}
                    </p>
                    {(selectedOrder.deliveryLandmarkSnapshot || selectedOrder.deliveryLandmark) && (
                      <span
                        style={{
                          fontSize: "0.75rem",
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
                    gap: "6px",
                    color: "#60a5fa",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    alignSelf: "flex-start",
                    marginTop: "4px",
                  }}
                >
                  <span>Open in Google Maps</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </div>

              {/* Rider Assignment section (Admin can change) */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#60a5fa",
                      textTransform: "uppercase",
                      display: "block",
                    }}
                  >
                    Assigned Delivery Rider
                  </span>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                    {selectedOrder.assignedRiderName || "Unassigned"}
                  </span>
                  {selectedOrder.assignedRiderPhone && (
                    <span
                      style={{
                        fontSize: "0.75rem",
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
                      padding: "6px 10px",
                      backgroundColor: "var(--cnm-surface, #1e2230)",
                      border: "1px solid var(--cnm-border, rgba(255,255,255,0.2))",
                      borderRadius: "6px",
                      color: "var(--cnm-text-primary, #ffffff)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
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
                  padding: "12px 16px",
                  backgroundColor: "rgba(249, 115, 22, 0.12)",
                  border: "1.5px dashed #f97316",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  CASH TO COLLECT FROM CUSTOMER
                </span>
                <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#f97316" }}>
                  {selectedOrder.totalPkr?.toLocaleString()} PKR
                </span>
              </div>

              {/* Item summary */}
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "var(--cnm-text-muted, #94a3b8)",
                    letterSpacing: "0.04em",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Order Items ({selectedOrder.items?.length || 0})
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 10px",
                        backgroundColor: "var(--cnm-surface-elevated, #161922)",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        <strong>{item.quantity}x</strong> {item.productNameSnapshot || item.productName}
                        {(item.variantNameSnapshot || item.variantName) && (
                          <span style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.75rem", marginLeft: "6px" }}>
                            ({item.variantNameSnapshot || item.variantName})
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 700 }}>
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
                padding: "14px 20px",
                borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
                display: "flex",
                gap: "10px",
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
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Bike size={16} />
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
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle2 size={16} />
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
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
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

        .rider-delivery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }

        @media (max-width: 640px) {
          .rider-delivery-grid {
            grid-template-columns: 1fr;
          }
          .hide-on-mobile {
            display: none !important;
          }
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

// Compact Rider Delivery Card Component
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
        borderRadius: "8px",
        border: isInTransit
          ? "2px solid #3b82f6"
          : isUnassigned && !isDelivered
          ? "2px solid #ef4444"
          : "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
        boxShadow: isInTransit
          ? "0 4px 14px rgba(59, 130, 246, 0.15)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s ease",
      }}
    >
      {/* Top Banner with Order #, Placed Time, and Status */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 900 }}>
            {delivery.orderNumber}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--cnm-text-muted, #94a3b8)",
              display: "block",
            }}
          >
            Ready: {new Date(delivery.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            color: statusColor,
            backgroundColor: `${statusColor}18`,
            border: `1px solid ${statusColor}40`,
            padding: "2px 8px",
            borderRadius: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {delivery.status}
        </span>
      </div>

      {/* Main Delivery Info */}
      <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Customer Name & Quick Call */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, display: "block" }}>
              {delivery.customerNameSnapshot || delivery.customerName || "Customer"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
              {customerPhone || "No phone"}
            </span>
          </div>

          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Call customer"
            >
              <Phone size={11} />
              <span>Call</span>
            </a>
          )}
        </div>

        {/* Address & Google Maps link */}
        <div
          style={{
            padding: "8px",
            backgroundColor: "var(--cnm-surface-elevated, #161922)",
            borderRadius: "6px",
            fontSize: "0.75rem",
            lineHeight: 1.3,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "5px" }}>
            <MapPin size={14} color="#f97316" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <span style={{ fontWeight: 800, color: "#f97316" }}>{areaName}: </span>
              <span>{addressText}</span>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addressText}, Kharian`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#60a5fa",
              fontSize: "0.7rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              marginTop: "4px",
              marginLeft: "19px",
            }}
          >
            <span>Open Maps</span>
            <ExternalLinkIcon size={10} />
          </a>
        </div>

        {/* Cash to Collect & Assigned Rider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            backgroundColor: "rgba(249, 115, 22, 0.08)",
            border: "1px dashed rgba(249, 115, 22, 0.4)",
            borderRadius: "6px",
          }}
        >
          <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase" }}>
            CASH TO COLLECT
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#f97316" }}>
            {delivery.totalPkr?.toLocaleString()} PKR
          </span>
        </div>

        {/* Assigned Rider Tag & Admin Dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <RiderIcon size={13} color={isUnassigned ? "#ef4444" : "#60a5fa"} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: isUnassigned ? "#ef4444" : "#60a5fa",
              }}
            >
              {delivery.assignedRiderName ? delivery.assignedRiderName : "⚠️ Unassigned"}
            </span>
          </div>

          {currentUser?.role === "ADMIN" && activeRiders.length > 0 && !isDelivered && (
            <select
              value={delivery.assignedRiderId || ""}
              onChange={(e) => onAssignRider(delivery.id, e.target.value)}
              disabled={isUpdating}
              style={{
                padding: "3px 6px",
                fontSize: "0.7rem",
                backgroundColor: "var(--cnm-surface-elevated, #161922)",
                border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
                borderRadius: "4px",
                color: "var(--cnm-text-primary, #ffffff)",
                fontWeight: 600,
              }}
            >
              <option value="">Assign Rider</option>
              {activeRiders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          padding: "8px 10px",
          borderTop: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
          display: "flex",
          gap: "6px",
        }}
      >
        <button
          type="button"
          onClick={onViewDetails}
          style={{
            background: "none",
            border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
            color: "var(--cnm-text-muted, #94a3b8)",
            borderRadius: "6px",
            padding: "5px 8px",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
          title="View full delivery details"
        >
          <EyeIcon size={12} />
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
              borderRadius: "6px",
              padding: "6px 8px",
              fontSize: "0.75rem",
              fontWeight: 800,
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
              borderRadius: "6px",
              padding: "6px 8px",
              fontSize: "0.75rem",
              fontWeight: 800,
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

        {/* Delivered complete state */}
        {isDelivered && (
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#10b981",
              padding: "5px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Check size={13} />
            <span>Delivered Successfully</span>
          </span>
        )}
      </div>
    </div>
  );
}
