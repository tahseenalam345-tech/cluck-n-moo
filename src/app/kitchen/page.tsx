"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ShoppingBag,
  Bike,
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

  // Status updates lock map to prevent background polling from reversing optimistic state
  const recentStatusUpdatesRef = useRef<Map<string, { status: string; timestamp: number }>>(new Map());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
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
        const role = data.data?.profile?.role;

        if (data.success && (role === "KITCHEN_STAFF" || role === "ADMIN")) {
          setCurrentUser({
            id: user.id,
            fullName: data.data.profile.fullName || user.email?.split("@")[0] || "Kitchen Staff",
            role: data.data.profile.role,
          });
          setAuthStatus("authorized");
        } else if (role === "RIDER") {
          // Rider belongs to Rider Dashboard
          router.replace("/rider");
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
        const now = Date.now();
        // Kitchen handles: NEW, CONFIRMED, PREPARING, and READY
        const kitchenTickets = data.data.filter((o: Order) =>
          [
            ORDER_STATUSES.NEW,
            ORDER_STATUSES.CONFIRMED,
            ORDER_STATUSES.PREPARING,
            ORDER_STATUSES.READY,
          ].includes(o.status as any)
        );

        // Lock merge: NEVER let server response reverse an in-flight status update!
        const mergedTickets = kitchenTickets.map((ord: Order) => {
          const lock = recentStatusUpdatesRef.current.get(ord.id);
          if (lock) {
            if (now - lock.timestamp < 15000) {
              if (ord.status === lock.status) {
                recentStatusUpdatesRef.current.delete(ord.id);
                return ord;
              } else {
                return { ...ord, status: lock.status as any };
              }
            } else {
              recentStatusUpdatesRef.current.delete(ord.id);
            }
          }
          return ord;
        });

        setOrders(mergedTickets);

        if (selectedOrder) {
          const updated = mergedTickets.find((o: Order) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load kitchen tickets:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll kitchen tickets every 5 seconds
  useEffect(() => {
    if (authStatus === "authorized") {
      loadKitchenOrders();
      const interval = setInterval(() => loadKitchenOrders(true), 5000);
      return () => clearInterval(interval);
    }
  }, [authStatus]);

  // Handle status advance with Optimistic Updates & Lock
  const handleAdvance = async (orderId: string, targetStatus: string) => {
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
        throw new Error(data.error?.message || "Failed to update order status");
      }
    } catch (err: any) {
      console.error("Kitchen status update error:", err);
      recentStatusUpdatesRef.current.delete(orderId);
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
    let toCookCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let rushCount = 0;

    const now = Date.now();

    orders.forEach((o) => {
      if (o.status === ORDER_STATUSES.NEW || o.status === ORDER_STATUSES.CONFIRMED) {
        toCookCount++;
      } else if (o.status === ORDER_STATUSES.PREPARING) {
        preparingCount++;
      } else if (o.status === ORDER_STATUSES.READY) {
        readyCount++;
      }

      const elapsedMins = (now - new Date(o.createdAt).getTime()) / (1000 * 60);
      if (elapsedMins > 20 && o.status !== ORDER_STATUSES.READY) {
        rushCount++;
      }
    });

    return {
      toCookCount,
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
        if (statusFilter !== "ALL") {
          if (
            statusFilter === "TO_COOK" &&
            o.status !== ORDER_STATUSES.NEW &&
            o.status !== ORDER_STATUSES.CONFIRMED
          )
            return false;
          if (statusFilter === "PREPARING" && o.status !== ORDER_STATUSES.PREPARING) return false;
          if (statusFilter === "READY" && o.status !== ORDER_STATUSES.READY) return false;
        }

        if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) return false;

        const elapsedMins = (now - new Date(o.createdAt).getTime()) / (1000 * 60);
        const isRush = elapsedMins > 20 && o.status !== ORDER_STATUSES.READY;
        if (priorityFilter === "RUSH" && !isRush) return false;
        if (priorityFilter === "NORMAL" && isRush) return false;

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

  // Group filtered orders into 3 Kanban columns
  const kanbanColumns = useMemo(() => {
    return {
      toCook: filteredOrders.filter(
        (o) => o.status === ORDER_STATUSES.NEW || o.status === ORDER_STATUSES.CONFIRMED
      ),
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
            Connecting to Kitchen Display...
          </h2>
          <p style={{ color: "var(--cnm-text-muted, #94a3b8)", fontSize: "0.82rem" }}>
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
            403 — Kitchen Access Restricted
          </h2>
          <p
            style={{
              color: "var(--cnm-text-muted, #94a3b8)",
              fontSize: "0.85rem",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
          >
            The Kitchen Display System requires verified <strong>KITCHEN_STAFF</strong> or{" "}
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
      className={`kitchen-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}
      style={{
        backgroundColor: "var(--cnm-bg, #0f1117)",
        minHeight: "100vh",
        color: "var(--cnm-text-primary, #ffffff)",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. TOP OPERATIONAL HEADER */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {currentUser?.role === "ADMIN" && (
            <Link
              href="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                color: "#ffffff",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--cnm-orange, #f97316)",
                fontWeight: 600,
                boxShadow: "0 2px 6px rgba(249, 115, 22, 0.3)",
              }}
              title="Return to Admin Control Center"
            >
              <ArrowLeft size={14} />
              <span>← Back to Admin Center</span>
            </Link>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div
              style={{
                backgroundColor: "rgba(249, 115, 22, 0.15)",
                color: "#f97316",
                padding: "5px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={19} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h1
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 700,
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
                      fontSize: "0.65rem",
                      backgroundColor: "rgba(59, 130, 246, 0.18)",
                      color: "#60a5fa",
                      padding: "2px 5px",
                      borderRadius: "4px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <ShieldCheck size={10} /> ADMIN
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--cnm-text-muted, #94a3b8)",
                  display: "block",
                }}
              >
                Station: <strong>{currentUser?.fullName}</strong> · Live kitchen queue
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Active Orders Count Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(249, 115, 22, 0.1)",
              border: "1px solid rgba(249, 115, 22, 0.25)",
              padding: "4px 9px",
              borderRadius: "5px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#f97316",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
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
            onClick={() => loadKitchenOrders(false)}
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
      <div
        style={{
          backgroundColor: "var(--cnm-surface-elevated, #161922)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          padding: "8px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
        }}
      >
        {/* KPI: Orders to Cook */}
        <div
          onClick={() => setStatusFilter(statusFilter === "TO_COOK" ? "ALL" : "TO_COOK")}
          style={{
            padding: "6px 10px",
            backgroundColor:
              statusFilter === "TO_COOK"
                ? "rgba(249, 115, 22, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "TO_COOK"
                ? "1.5px solid #f97316"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#f97316",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Orders to Cook
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.toCookCount}
          </span>
        </div>

        {/* KPI: In Kitchen (Cooking) */}
        <div
          onClick={() => setStatusFilter(statusFilter === "PREPARING" ? "ALL" : "PREPARING")}
          style={{
            padding: "6px 10px",
            backgroundColor:
              statusFilter === "PREPARING"
                ? "rgba(234, 179, 8, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "PREPARING"
                ? "1.5px solid #eab308"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#eab308",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Cooking (In Prep)
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.preparingCount}
          </span>
        </div>

        {/* KPI: Ready for Handover */}
        <div
          onClick={() => setStatusFilter(statusFilter === "READY" ? "ALL" : "READY")}
          style={{
            padding: "6px 10px",
            backgroundColor:
              statusFilter === "READY"
                ? "rgba(16, 185, 129, 0.15)"
                : "var(--cnm-surface, #1e2230)",
            border:
              statusFilter === "READY"
                ? "1.5px solid #10b981"
                : "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#10b981",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Ready for Handover
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.readyCount}
          </span>
        </div>

        {/* KPI: SLA Rush Warning (>20m) */}
        <div
          onClick={() => setPriorityFilter(priorityFilter === "RUSH" ? "ALL" : "RUSH")}
          style={{
            padding: "6px 10px",
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
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: kpis.rushCount > 0 ? "#ef4444" : "var(--cnm-text-muted, #94a3b8)",
              textTransform: "uppercase",
              display: "block",
            }}
          >
            SLA Warning ({">"}20m)
          </span>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
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
          padding: "8px 16px",
          backgroundColor: "var(--cnm-surface, #1e2230)",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 280px" }}>
          {/* Search box */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
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
              placeholder="Search order #, customer, item..."
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

          {/* Order Type Filter */}
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            style={{
              padding: "6px 8px",
              backgroundColor: "var(--cnm-bg, #0f1117)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "5px",
              color: "var(--cnm-text-primary, #ffffff)",
              fontSize: "0.78rem",
              fontWeight: 500,
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
              padding: "6px 8px",
              backgroundColor: "var(--cnm-bg, #0f1117)",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.1))",
              borderRadius: "5px",
              color: "var(--cnm-text-primary, #ffffff)",
              fontSize: "0.78rem",
              fontWeight: 500,
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
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#ef4444",
              padding: "4px 8px",
              borderRadius: "5px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X size={12} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* 4. COMPACT KITCHEN BOARD */}
      <main style={{ padding: "14px 16px", flex: 1, overflowX: "auto" }}>
        {filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
              color: "var(--cnm-text-muted, #94a3b8)",
              backgroundColor: "var(--cnm-surface, #1e2230)",
              borderRadius: "10px",
              border: "1px dashed var(--cnm-border, rgba(255,255,255,0.1))",
              maxWidth: "460px",
              margin: "30px auto",
            }}
          >
            <ChefHat size={40} style={{ margin: "0 auto 10px", opacity: 0.3, color: "#f97316" }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--cnm-text-primary, #fff)" }}>
              {hasActiveFilters ? "No Orders Matching Filters" : "All Orders Prepared!"}
            </h3>
            <p style={{ fontSize: "0.82rem", marginTop: "4px" }}>
              {hasActiveFilters
                ? "Try clearing filters to view all active kitchen tickets."
                : "Active kitchen orders from storefront and admin counter will appear here automatically."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  marginTop: "12px",
                  padding: "6px 12px",
                  backgroundColor: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="kitchen-kanban-container">
            {/* COLUMN 1: TO COOK */}
            <div className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="kanban-dot" style={{ backgroundColor: "#f97316" }} />
                  <span className="kanban-title">ORDERS TO COOK</span>
                </div>
                <span className="kanban-count">{kanbanColumns.toCook.length}</span>
              </div>

              <div className="kanban-cards-stack">
                {kanbanColumns.toCook.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onViewDetails={() => setSelectedOrder(order)}
                    isUpdating={actionInProgress === order.id}
                    getElapsedString={getElapsedString}
                  />
                ))}
                {kanbanColumns.toCook.length === 0 && (
                  <div className="kanban-empty">No orders waiting to cook</div>
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PREPARATION */}
            <div className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="kanban-dot" style={{ backgroundColor: "#eab308" }} />
                  <span className="kanban-title">COOKING IN KITCHEN</span>
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
                  <div className="kanban-empty">No orders currently cooking</div>
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
                    fontSize: "0.75rem",
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
              {/* Customer Info Card */}
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--cnm-surface-elevated, #161922)",
                  borderRadius: "6px",
                  border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                  fontSize: "0.82rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ display: "block", fontWeight: 600 }}>
                    {selectedOrder.customerNameSnapshot || selectedOrder.customerName || "Customer"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--cnm-text-muted, #94a3b8)" }}>
                    Phone: {selectedOrder.customerPhoneSnapshot || selectedOrder.customerPhone || "N/A"}
                  </span>
                </div>

                {selectedOrder.assignedRiderName && (
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "#60a5fa",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        display: "block",
                      }}
                    >
                      Assigned Rider
                    </span>
                    <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                      {selectedOrder.assignedRiderName}
                    </span>
                  </div>
                )}
              </div>

              {/* Special Instructions Alert */}
              {selectedOrder.specialInstructions && (
                <div
                  style={{
                    padding: "9px 12px",
                    backgroundColor: "rgba(249, 115, 22, 0.1)",
                    border: "1px dashed #f97316",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#f97316",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Kitchen Note: {selectedOrder.specialInstructions}
                </div>
              )}

              {/* Items List */}
              <div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--cnm-text-muted, #94a3b8)",
                    letterSpacing: "0.04em",
                    display: "block",
                    marginBottom: "6px",
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
                        border: "1px solid var(--cnm-border, rgba(255,255,255,0.06))",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: "#f97316",
                          minWidth: "22px",
                        }}
                      >
                        {item.quantity}x
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {item.productNameSnapshot || item.productName}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 500,
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
                              fontSize: "0.72rem",
                              color: "#60a5fa",
                              fontWeight: 500,
                              marginTop: "2px",
                            }}
                          >
                            Size/Variant: {item.variantNameSnapshot || item.variantName}
                          </span>
                        )}

                        {item.modifiers && item.modifiers.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--cnm-text-muted, #94a3b8)",
                              marginTop: "3px",
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

              {/* Total Amount */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 12px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                <span>Total Amount:</span>
                <span style={{ fontSize: "1rem", color: "#f97316", fontWeight: 700 }}>
                  {selectedOrder.totalPkr?.toLocaleString()} PKR
                </span>
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
              {(selectedOrder.status === ORDER_STATUSES.NEW ||
                selectedOrder.status === ORDER_STATUSES.CONFIRMED) && (
                <button
                  type="button"
                  onClick={() => handleAdvance(selectedOrder.id, ORDER_STATUSES.PREPARING)}
                  disabled={actionInProgress === selectedOrder.id}
                  style={{
                    backgroundColor: "#eab308",
                    color: "#000000",
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
                  <Flame size={15} />
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
          --item-bg: rgba(255, 255, 255, 0.03);
        }

        .kitchen-root.theme-light {
          --cnm-bg: #f8fafc;
          --cnm-surface: #ffffff;
          --cnm-surface-elevated: #f1f5f9;
          --cnm-border: #e2e8f0;
          --cnm-text-primary: #0f172a;
          --cnm-text-muted: #64748b;
          --card-bg: #ffffff;
          --item-bg: #f8fafc;
        }

        /* Constrained Compact Kanban Columns Container */
        .kitchen-kanban-container {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          width: 100%;
        }

        .kanban-column {
          flex: 1 1 310px;
          min-width: 280px;
          max-width: 360px;
          background-color: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 900px) {
          .kitchen-kanban-container {
            flex-direction: column;
          }
          .kanban-column {
            width: 100%;
            max-width: 100%;
          }
          .hide-on-mobile {
            display: none !important;
          }
        }

        .kanban-column-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          padding-bottom: 7px;
          border-bottom: 1px solid var(--cnm-border);
        }

        .kanban-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }

        .kanban-title {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .kanban-count {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 10px;
          background-color: var(--cnm-surface-elevated);
          color: var(--cnm-text-muted);
        }

        .kanban-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .kanban-empty {
          text-align: center;
          padding: 20px 10px;
          font-size: 0.75rem;
          color: var(--cnm-text-muted);
          border: 1px dashed var(--cnm-border);
          border-radius: 6px;
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

// Compact Kitchen Order Card Component with Complete Order Details
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
  const isToCook = order.status === ORDER_STATUSES.NEW || order.status === ORDER_STATUSES.CONFIRMED;

  // SLA Warning: order placed > 20 mins ago and still not ready
  const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
  const isSlaWarning = elapsedMinutes > 20 && !isReady;

  const isDelivery = order.orderType === "DELIVERY";
  const typeBadgeColor = isDelivery ? "#f97316" : order.orderType === "DINE_IN" ? "#3b82f6" : "#10b981";

  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #1e2230)",
        borderRadius: "7px",
        border: isCooking
          ? "1.5px solid #eab308"
          : isSlaWarning
          ? "1.5px solid #ef4444"
          : "1px solid var(--cnm-border, rgba(255,255,255,0.08))",
        boxShadow: isCooking
          ? "0 3px 10px rgba(234, 179, 8, 0.12)"
          : isSlaWarning
          ? "0 3px 10px rgba(239, 68, 68, 0.12)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.15s ease",
      }}
    >
      {/* Top Banner with Type, Order #, and Time */}
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
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: typeBadgeColor,
              backgroundColor: `${typeBadgeColor}15`,
              border: `1px solid ${typeBadgeColor}35`,
              padding: "2px 5px",
              borderRadius: "4px",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            {isDelivery ? <Bike size={10} /> : <ShoppingBag size={10} />}
            {order.orderType}
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.02em" }}>
            {order.orderNumber}
          </span>
        </div>

        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: isSlaWarning ? 600 : 500,
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

      {/* Customer Name Snippet */}
      <div
        style={{
          padding: "5px 9px 4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--cnm-border, rgba(255,255,255,0.04))",
          fontSize: "0.74rem",
        }}
      >
        <span style={{ color: "var(--cnm-text-muted, #94a3b8)" }}>
          Cust:{" "}
          <strong style={{ color: "var(--cnm-text-primary, #ffffff)", fontWeight: 600 }}>
            {order.customerNameSnapshot || order.customerName || "Guest"}
          </strong>
        </span>
        {order.assignedRiderName && (
          <span style={{ color: "#60a5fa", fontSize: "0.68rem", fontWeight: 500 }}>
            Rider: {order.assignedRiderName}
          </span>
        )}
      </div>

      {/* FULL ITEMS BREAKDOWN (Kitchen Staff Needs Complete Details on Card) */}
      <div style={{ padding: "7px 9px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {order.items?.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "5px 7px",
              backgroundColor: "var(--item-bg, rgba(255,255,255,0.03))",
              borderRadius: "5px",
              border: "1px solid var(--cnm-border, rgba(255,255,255,0.05))",
            }}
          >
            {/* Quantity and Product Name */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#f97316",
                  minWidth: "18px",
                }}
              >
                {item.quantity}x
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--cnm-text-primary, #ffffff)",
                  lineHeight: 1.25,
                }}
              >
                {item.productNameSnapshot || item.productName}
              </span>
            </div>

            {/* Size / Variant */}
            {(item.variantNameSnapshot || item.variantName) && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#60a5fa",
                  fontWeight: 500,
                  marginTop: "2px",
                  marginLeft: "24px",
                }}
              >
                Size: {item.variantNameSnapshot || item.variantName}
              </div>
            )}

            {/* Modifiers / Add-ons / Ingredients */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "3px",
                  marginTop: "3px",
                  marginLeft: "24px",
                }}
              >
                {item.modifiers.map((m: any, mIdx: number) => (
                  <span
                    key={mIdx}
                    style={{
                      fontSize: "0.66rem",
                      fontWeight: 500,
                      backgroundColor: "rgba(249, 115, 22, 0.1)",
                      color: "#f97316",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      border: "1px solid rgba(249, 115, 22, 0.2)",
                    }}
                  >
                    + {m.name || m.modifierNameSnapshot}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Special Instructions / Chef Tip Alert */}
        {order.specialInstructions && (
          <div
            style={{
              padding: "5px 7px",
              backgroundColor: "rgba(249, 115, 22, 0.12)",
              border: "1px dashed rgba(249, 115, 22, 0.5)",
              borderRadius: "4px",
              fontSize: "0.72rem",
              color: "#f97316",
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            ⚠️ <strong>Chef Note:</strong> {order.specialInstructions}
          </div>
        )}
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
          title="View full order details"
        >
          <EyeIcon size={11} />
          <span>Details</span>
        </button>

        {/* Combined Accept / Start Prep Action */}
        {isToCook && (
          <button
            type="button"
            onClick={() => onAdvance(order.id, ORDER_STATUSES.PREPARING)}
            disabled={isUpdating}
            style={{
              flex: 1,
              backgroundColor: "#eab308",
              color: "#000000",
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
            <Flame size={13} />
            <span>Start Cooking</span>
          </button>
        )}

        {/* Cooking in Prep Action */}
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
            <span>Mark Ready</span>
          </button>
        )}

        {/* Ready Handover Label */}
        {isReady && (
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
            <span>
              {isDelivery
                ? order.assignedRiderName
                  ? "Awaiting Rider"
                  : "Needs Rider"
                : "Ready for Pickup"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
