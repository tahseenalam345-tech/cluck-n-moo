"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import {
  ChefHat,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Search,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Check,
} from "lucide-react";
import { EyeIcon } from "@/components/admin/AdminIcons";

export default function KitchenPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Authentication & session state
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    role: "ADMIN" | "KITCHEN_STAFF" | string;
  } | null>(null);

  // Data & loading state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL"); // ALL | RUSH | NORMAL
  const [sortBy, setSortBy] = useState<"OLDEST" | "NEWEST" | "ORDER_NO">("OLDEST");

  // Selected Order for Detail Drawer / Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Check Supabase Auth and verify KITCHEN_STAFF or ADMIN role
  useEffect(() => {
    const checkKitchenAuth = async () => {
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
          (data.data?.profile?.role === "KITCHEN_STAFF" || data.data?.profile?.role === "ADMIN")
        ) {
          setCurrentUser({
            id: user.id,
            fullName: data.data.profile.fullName || user.email?.split("@")[0] || "Staff Member",
            role: data.data.profile.role,
          });
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch {
        setAuthStatus("unauthorized");
      }
    };

    checkKitchenAuth();
  }, [router]);

  // Load active kitchen tickets
  const loadKitchenOrders = async (silent = false) => {
    if (authStatus !== "authorized") return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/v1/ops/orders?status=active");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Kitchen handles: NEW, CONFIRMED, PREPARING, and READY
        const kitchenTickets = data.data.filter((o: Order) =>
          [
            ORDER_STATUSES.NEW,
            ORDER_STATUSES.CONFIRMED,
            ORDER_STATUSES.PREPARING,
            ORDER_STATUSES.READY,
          ].includes(o.status as any)
        );

        setOrders(kitchenTickets);

        // Update selected order if open
        if (selectedOrder) {
          const updated = kitchenTickets.find((o: Order) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load kitchen tickets:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll kitchen tickets every 6 seconds
  useEffect(() => {
    if (authStatus === "authorized") {
      loadKitchenOrders();
      const interval = setInterval(() => loadKitchenOrders(true), 6000);
      return () => clearInterval(interval);
    }
  }, [authStatus]);

  // Handle status advance with Optimistic Updates
  const handleAdvance = async (orderId: string, targetStatus: string) => {
    if (actionInProgress) return;
    setActionInProgress(orderId);

    const prevOrders = [...orders];

    // Optimistic Update
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
        throw new Error(data.error?.message || "Failed to update order status");
      }
    } catch (err: any) {
      console.error("Kitchen status update error:", err);
      // Rollback
      setOrders(prevOrders);
      if (selectedOrder && selectedOrder.id === orderId) {
        const orig = prevOrders.find((o) => o.id === orderId);
        if (orig) setSelectedOrder(orig);
      }
      alert(err.message || "Could not update kitchen order status. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    let newCount = 0;
    let confirmedCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let rushCount = 0;

    const now = Date.now();

    orders.forEach((o) => {
      if (o.status === ORDER_STATUSES.NEW) newCount++;
      else if (o.status === ORDER_STATUSES.CONFIRMED) confirmedCount++;
      else if (o.status === ORDER_STATUSES.PREPARING) preparingCount++;
      else if (o.status === ORDER_STATUSES.READY) readyCount++;

      // SLA warning: order placed > 20 mins ago and still not ready
      const elapsedMins = (now - new Date(o.createdAt).getTime()) / (1000 * 60);
      if (elapsedMins > 20 && o.status !== ORDER_STATUSES.READY) {
        rushCount++;
      }
    });

    return {
      newCount,
      confirmedCount,
      preparingCount,
      readyCount,
      rushCount,
      totalActive: orders.length,
    };
  }, [orders]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    const now = Date.now();

    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "NEW" && o.status !== ORDER_STATUSES.NEW) return false;
          if (statusFilter === "CONFIRMED" && o.status !== ORDER_STATUSES.CONFIRMED) return false;
          if (statusFilter === "PREPARING" && o.status !== ORDER_STATUSES.PREPARING) return false;
          if (statusFilter === "READY" && o.status !== ORDER_STATUSES.READY) return false;
        }

        // Order type filter
        if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) return false;

        // Priority filter
        const elapsedMins = (now - new Date(o.createdAt).getTime()) / (1000 * 60);
        const isRush = elapsedMins > 20 && o.status !== ORDER_STATUSES.READY;
        if (priorityFilter === "RUSH" && !isRush) return false;
        if (priorityFilter === "NORMAL" && isRush) return false;

        // Search query filter (Order #, customer name, phone, item name)
        if (debouncedSearch) {
          const matchOrderNo = o.orderNumber?.toLowerCase().includes(debouncedSearch);
          const matchCustName = (o.customerNameSnapshot || o.customerName || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchCustPhone = (o.customerPhoneSnapshot || o.customerPhone || "")
            .toLowerCase()
            .includes(debouncedSearch);
          const matchItems = o.items?.some((i) =>
            (i.productName || i.productNameSnapshot || "").toLowerCase().includes(debouncedSearch)
          );

          if (!matchOrderNo && !matchCustName && !matchCustPhone && !matchItems) {
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
        } else {
          return (a.orderNumber || "").localeCompare(b.orderNumber || "");
        }
      });
  }, [orders, statusFilter, orderTypeFilter, priorityFilter, debouncedSearch, sortBy]);

  // Group filtered orders into Kanban columns
  const kanbanColumns = useMemo(() => {
    return {
      newOrders: filteredOrders.filter((o) => o.status === ORDER_STATUSES.NEW),
      confirmed: filteredOrders.filter((o) => o.status === ORDER_STATUSES.CONFIRMED),
      preparing: filteredOrders.filter((o) => o.status === ORDER_STATUSES.PREPARING),
      ready: filteredOrders.filter((o) => o.status === ORDER_STATUSES.READY),
    };
  }, [filteredOrders]);

  const hasActiveFilters =
    debouncedSearch !== "" ||
    statusFilter !== "ALL" ||
    orderTypeFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    sortBy !== "OLDEST";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setOrderTypeFilter("ALL");
    setPriorityFilter("ALL");
    setSortBy("OLDEST");
  };

  // Helper to format elapsed time
  const getElapsedString = (createdAt: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
    if (elapsedMinutes < 1) return "Just now";
    if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    return `${hours}h ${mins}m ago`;
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
            Connecting to Kitchen Display System...
          </h2>
          <p style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.85rem" }}>
            Verifying staff authorization & active orders pipeline
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
            403 — Kitchen Access Restricted
          </h2>
          <p
            style={{
              color: "var(--cnm-text-muted, #94a3b8)",
              fontSize: "14px",
              marginBottom: "24px",
              lineHeight: 1.5,
            }}
          >
            The Kitchen Display System requires verified <strong>KITCHEN_STAFF</strong> or{" "}
            <strong>ADMIN</strong> credentials. Customer accounts cannot access operational tools.
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
      className={`kitchen-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}
      style={{
        backgroundColor: "var(--cnm-bg, #0f1117)",
        minHeight: "100vh",
        color: "var(--cnm-text-primary, #ffffff)",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. TOP OPERATIONAL HEADER */}
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
                backgroundColor: "rgba(249, 115, 22, 0.15)",
                color: "#f97316",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={22} />
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
                  KITCHEN DISPLAY (KDS)
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
                    <ShieldCheck size={11} /> ADMIN ACCESS
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
                Staff: <strong>{currentUser?.fullName}</strong> · Live station feed
              </span>
            </div>
          </div>
        </div>

        {/* Right side operational controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Active Tickets Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(249, 115, 22, 0.12)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#f97316",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#f97316",
                display: "inline-block",
              }}
            />
            <span>{orders.length} Active Orders</span>
          </div>

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
            onClick={() => loadKitchenOrders(false)}
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
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: "10px",
        }}
      >
        {/* KPI: New / Pending */}
        <div
          onClick={() => setStatusFilter(statusFilter === "NEW" ? "ALL" : "NEW")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "NEW"
                ? "rgba(59, 130, 246, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "NEW"
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
            New Orders
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.newCount}
          </span>
        </div>

        {/* KPI: Confirmed / Queued */}
        <div
          onClick={() => setStatusFilter(statusFilter === "CONFIRMED" ? "ALL" : "CONFIRMED")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "CONFIRMED"
                ? "rgba(249, 115, 22, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "CONFIRMED"
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
            Queued (Confirmed)
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.confirmedCount}
          </span>
        </div>

        {/* KPI: Preparing / Cooking */}
        <div
          onClick={() => setStatusFilter(statusFilter === "PREPARING" ? "ALL" : "PREPARING")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "PREPARING"
                ? "rgba(234, 179, 8, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "PREPARING"
                ? "1.5px solid #eab308"
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
              color: "#eab308",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            In Kitchen (Cooking)
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.preparingCount}
          </span>
        </div>

        {/* KPI: Ready for Pickup */}
        <div
          onClick={() => setStatusFilter(statusFilter === "READY" ? "ALL" : "READY")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              statusFilter === "READY"
                ? "rgba(16, 185, 129, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "READY"
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
            Ready for Handover
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.2 }}>
            {kpis.readyCount}
          </span>
        </div>

        {/* KPI: SLA Rush Warning (>20m) */}
        <div
          onClick={() => setPriorityFilter(priorityFilter === "RUSH" ? "ALL" : "RUSH")}
          style={{
            padding: "8px 12px",
            backgroundColor:
              kpis.rushCount > 0
                ? "rgba(239, 68, 68, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              priorityFilter === "RUSH"
                ? "1.5px solid #ef4444"
                : kpis.rushCount > 0
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
              color: kpis.rushCount > 0 ? "#ef4444" : "var(--cnm-text-muted, #94a3b8)",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            SLA Rush Warning ({">"}20m)
          </span>
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              lineHeight: 1.2,
              color: kpis.rushCount > 0 ? "#ef4444" : "inherit",
            }}
          >
            {kpis.rushCount}
          </span>
        </div>
      </div>

      {/* 3. SEARCH, SORT, & FILTER CONTROLS */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 280px" }}>
          {/* Search box */}
          <div
            style={{
              position: "relative",
              flex: "1 1 240px",
              maxWidth: "360px",
            }}
          >
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
              placeholder="Search order #, customer, item..."
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

          {/* Order Type Filter */}
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
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
            <option value="ALL">All Order Types</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
            <option value="DINE_IN">Dine-in</option>
          </select>

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
            <option value="OLDEST">Oldest First (Rush Priority)</option>
            <option value="NEWEST">Newest First</option>
            <option value="ORDER_NO">Order Number</option>
          </select>
        </div>

        {/* Clear Filters action */}
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

      {/* 4. COMPACT OPERATIONAL KANBAN BOARD */}
      <main style={{ padding: "16px", flex: 1 }}>
        {filteredOrders.length === 0 ? (
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
            <ChefHat size={48} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#f97316" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--cnm-text-primary, #fff)" }}>
              {hasActiveFilters ? "No Orders Matching Filters" : "All Orders Handled!"}
            </h3>
            <p style={{ fontSize: "0.85rem", marginTop: "6px" }}>
              {hasActiveFilters
                ? "Try clearing filters to view all active kitchen tickets."
                : "Active kitchen orders from storefront and admin counter will appear here automatically."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  marginTop: "14px",
                  padding: "6px 14px",
                  backgroundColor: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="kitchen-kanban-grid">
            {/* COLUMN 1: NEW / QUEUED (PENDING & CONFIRMED) */}
            <div className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="kanban-dot" style={{ backgroundColor: "#f97316" }} />
                  <span className="kanban-title">QUEUED / ACCEPTED</span>
                </div>
                <span className="kanban-count">
                  {kanbanColumns.newOrders.length + kanbanColumns.confirmed.length}
                </span>
              </div>

              <div className="kanban-cards-stack">
                {[...kanbanColumns.newOrders, ...kanbanColumns.confirmed].map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onViewDetails={() => setSelectedOrder(order)}
                    isUpdating={actionInProgress === order.id}
                    getElapsedString={getElapsedString}
                  />
                ))}
                {kanbanColumns.newOrders.length + kanbanColumns.confirmed.length === 0 && (
                  <div className="kanban-empty">No orders queued</div>
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PREPARATION (COOKING) */}
            <div className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="kanban-dot" style={{ backgroundColor: "#eab308" }} />
                  <span className="kanban-title">PREPARING (COOKING)</span>
                </div>
                <span className="kanban-count">{kanbanColumns.preparing.length}</span>
              </div>

              <div className="kanban-cards-stack">
                {kanbanColumns.preparing.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onViewDetails={() => setSelectedOrder(order)}
                    isUpdating={actionInProgress === order.id}
                    getElapsedString={getElapsedString}
                  />
                ))}
                {kanbanColumns.preparing.length === 0 && (
                  <div className="kanban-empty">No orders cooking</div>
                )}
              </div>
            </div>

            {/* COLUMN 3: READY FOR HANDOVER */}
            <div className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="kanban-dot" style={{ backgroundColor: "#10b981" }} />
                  <span className="kanban-title">READY FOR HANDOVER</span>
                </div>
                <span className="kanban-count">{kanbanColumns.ready.length}</span>
              </div>

              <div className="kanban-cards-stack">
                {kanbanColumns.ready.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onViewDetails={() => setSelectedOrder(order)}
                    isUpdating={actionInProgress === order.id}
                    getElapsedString={getElapsedString}
                  />
                ))}
                {kanbanColumns.ready.length === 0 && (
                  <div className="kanban-empty">No orders awaiting pickup</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. CENTERED ORDER DETAIL MODAL / DRAWER */}
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
                        selectedOrder.orderType === "DELIVERY"
                          ? "#f97316"
                          : selectedOrder.orderType === "DINE_IN"
                          ? "#3b82f6"
                          : "#10b981",
                      color: "#ffffff",
                    }}
                  >
                    {selectedOrder.orderType}
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
                  Placed: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (
                  {getElapsedString(selectedOrder.createdAt)})
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
              {/* Customer info card */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "8px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  fontSize: "0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ display: "block", fontWeight: 700 }}>
                    {selectedOrder.customerNameSnapshot || selectedOrder.customerName || "Customer"}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                    Phone: {selectedOrder.customerPhoneSnapshot || selectedOrder.customerPhone || "N/A"}
                  </span>
                </div>

                {selectedOrder.assignedRiderName && (
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#60a5fa",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "block",
                      }}
                    >
                      Assigned Rider
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                      {selectedOrder.assignedRiderName}
                    </span>
                  </div>
                )}
              </div>

              {/* Special instructions banner */}
              {selectedOrder.specialInstructions && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "rgba(249, 115, 22, 0.12)",
                    border: "1px dashed #f97316",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    color: "#f97316",
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Kitchen Note: {selectedOrder.specialInstructions}
                </div>
              )}

              {/* Items List */}
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

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--cnm-surface-elevated, #161922)",
                        borderRadius: "8px",
                        border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 900,
                          color: "#f97316",
                          minWidth: "24px",
                        }}
                      >
                        {item.quantity}x
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                            {item.productNameSnapshot || item.productName}
                          </span>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: "var(--cnm-text-muted, #94a3b8)",
                            }}
                          >
                            {item.lineTotalPkr?.toLocaleString()} PKR
                          </span>
                        </div>

                        {(item.variantNameSnapshot || item.variantName) && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.75rem",
                              color: "#60a5fa",
                              fontWeight: 600,
                              marginTop: "2px",
                            }}
                          >
                            Size/Variant: {item.variantNameSnapshot || item.variantName}
                          </span>
                        )}

                        {item.modifiers && item.modifiers.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--cnm-text-muted, #94a3b8)",
                              marginTop: "4px",
                            }}
                          >
                            {item.modifiers
                              .map((m: any) => `+ ${m.name || m.modifierNameSnapshot}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total PKR */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  fontWeight: 800,
                }}
              >
                <span>Total Amount:</span>
                <span style={{ fontSize: "1.1rem", color: "#f97316" }}>
                  {selectedOrder.totalPkr?.toLocaleString()} PKR
                </span>
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
              {selectedOrder.status === ORDER_STATUSES.NEW && (
                <button
                  type="button"
                  onClick={() => handleAdvance(selectedOrder.id, ORDER_STATUSES.CONFIRMED)}
                  disabled={actionInProgress === selectedOrder.id}
                  style={{
                    backgroundColor: "#f97316",
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
                  <Check size={16} />
                  <span>Accept Order</span>
                </button>
              )}

              {selectedOrder.status === ORDER_STATUSES.CONFIRMED && (
                <button
                  type="button"
                  onClick={() => handleAdvance(selectedOrder.id, ORDER_STATUSES.PREPARING)}
                  disabled={actionInProgress === selectedOrder.id}
                  style={{
                    backgroundColor: "#eab308",
                    color: "#000000",
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
                  <Flame size={16} />
                  <span>Start Cooking</span>
                </button>
              )}

              {selectedOrder.status === ORDER_STATUSES.PREPARING && (
                <button
                  type="button"
                  onClick={() => handleAdvance(selectedOrder.id, ORDER_STATUSES.READY)}
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
                  <span>Mark Ready for Pickup</span>
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

      {/* Styled JSX for Kanban layout, cards, and theme responsiveness */}
      <style jsx global>{`
        .kitchen-root.theme-dark {
          --cnm-bg: #0f1117;
          --cnm-surface: #1e2230;
          --cnm-surface-elevated: #161922;
          --cnm-border: rgba(255, 255, 255, 0.08);
          --cnm-text-primary: #ffffff;
          --cnm-text-muted: #94a3b8;
          --card-bg: #1e2230;
        }

        .kitchen-root.theme-light {
          --cnm-bg: #f8fafc;
          --cnm-surface: #ffffff;
          --cnm-surface-elevated: #f1f5f9;
          --cnm-border: #e2e8f0;
          --cnm-text-primary: #0f172a;
          --cnm-text-muted: #64748b;
          --card-bg: #ffffff;
        }

        .kitchen-kanban-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          align-items: flex-start;
        }

        @media (max-width: 900px) {
          .kitchen-kanban-grid {
            grid-template-columns: 1fr;
          }
          .hide-on-mobile {
            display: none !important;
          }
        }

        .kanban-column {
          background-color: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 240px;
        }

        .kanban-column-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--cnm-border);
        }

        .kanban-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .kanban-title {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .kanban-count {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 12px;
          background-color: var(--cnm-surface-elevated);
          color: var(--cnm-text-muted);
        }

        .kanban-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kanban-empty {
          text-align: center;
          padding: 24px 10px;
          font-size: 0.78rem;
          color: var(--cnm-text-muted);
          border: 1px dashed var(--cnm-border);
          border-radius: 8px;
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

// Compact Kitchen Order Card Component
function KitchenOrderCard({
  order,
  onAdvance,
  onViewDetails,
  isUpdating,
  getElapsedString,
}: {
  order: Order;
  onAdvance: (id: string, nextStatus: string) => Promise<void>;
  onViewDetails: () => void;
  isUpdating: boolean;
  getElapsedString: (time: string) => string;
}) {
  const isCooking = order.status === ORDER_STATUSES.PREPARING;
  const isReady = order.status === ORDER_STATUSES.READY;
  const isNew = order.status === ORDER_STATUSES.NEW;

  // SLA Warning: order placed > 20 mins ago and still not ready
  const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
  const isSlaWarning = elapsedMinutes > 20 && !isReady;

  // Item preview (e.g. "2x Zinger Burger + 2 more")
  const itemCount = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;
  const firstItem = order.items?.[0];
  const itemsRemaining = (order.items?.length || 0) - 1;

  let conciseItemPreview = firstItem
    ? `${firstItem.quantity}x ${firstItem.productName || firstItem.productNameSnapshot}`
    : "No items";
  if (itemsRemaining > 0) {
    conciseItemPreview += ` + ${itemsRemaining} more`;
  }

  // Type badge styling
  const typeBadgeColor =
    order.orderType === "DELIVERY"
      ? "#f97316"
      : order.orderType === "DINE_IN"
      ? "#3b82f6"
      : "#10b981";

  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #1e2230)",
        borderRadius: "8px",
        border: isCooking
          ? "2px solid #eab308"
          : isSlaWarning
          ? "2px solid #ef4444"
          : "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
        boxShadow: isCooking
          ? "0 4px 14px rgba(234, 179, 8, 0.15)"
          : isSlaWarning
          ? "0 4px 14px rgba(239, 68, 68, 0.15)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s ease",
      }}
    >
      {/* Top Banner with Type & Time */}
      <div
        style={{
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            color: typeBadgeColor,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {order.orderType}
        </span>

        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: isSlaWarning ? 800 : 600,
            color: isSlaWarning ? "#ef4444" : "var(--cnm-text-muted, #94a3b8)",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          {isSlaWarning && <AlertTriangle size={11} />}
          {getElapsedString(order.createdAt)}
        </span>
      </div>

      {/* Card Content */}
      <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Order # and Customer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 900 }}>
            {order.orderNumber}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--cnm-text-muted, #94a3b8)",
              fontWeight: 600,
            }}
          >
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--cnm-text-primary, #ffffff)",
            fontWeight: 700,
          }}
        >
          {order.customerNameSnapshot || order.customerName || "Customer"}
        </span>

        {/* Item preview */}
        <div
          style={{
            fontSize: "0.78rem",
            color: "#f97316",
            fontWeight: 700,
            padding: "4px 6px",
            backgroundColor: "rgba(249, 115, 22, 0.08)",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {conciseItemPreview}
        </div>

        {/* Special Instructions Indicator */}
        {order.specialInstructions && (
          <div
            style={{
              fontSize: "0.7rem",
              color: "#eab308",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <span>⚠️ Note: {order.specialInstructions.substring(0, 36)}...</span>
          </div>
        )}

        {/* Assigned Rider Indicator */}
        {order.assignedRiderName && (
          <div
            style={{
              fontSize: "0.68rem",
              color: "#60a5fa",
              fontWeight: 700,
              marginTop: "2px",
            }}
          >
            Rider: {order.assignedRiderName}
          </div>
        )}
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
          title="View full ticket details"
        >
          <EyeIcon size={12} />
          <span>Details</span>
        </button>

        {isNew && (
          <button
            type="button"
            onClick={() => onAdvance(order.id, ORDER_STATUSES.CONFIRMED)}
            disabled={isUpdating}
            style={{
              flex: 1,
              backgroundColor: "#f97316",
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
            <Check size={13} />
            <span>Accept</span>
          </button>
        )}

        {order.status === ORDER_STATUSES.CONFIRMED && (
          <button
            type="button"
            onClick={() => onAdvance(order.id, ORDER_STATUSES.PREPARING)}
            disabled={isUpdating}
            style={{
              flex: 1,
              backgroundColor: "#eab308",
              color: "#000000",
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
            <Flame size={13} />
            <span>Start Prep</span>
          </button>
        )}

        {isCooking && (
          <button
            type="button"
            onClick={() => onAdvance(order.id, ORDER_STATUSES.READY)}
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
            <span>Mark Ready</span>
          </button>
        )}

        {isReady && (
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#10b981",
              padding: "5px 0",
            }}
          >
            {order.orderType === "DELIVERY"
              ? order.assignedRiderName
                ? "Awaiting Rider"
                : "Needs Rider"
              : "Ready for Pickup"}
          </span>
        )}
      </div>
    </div>
  );
}
