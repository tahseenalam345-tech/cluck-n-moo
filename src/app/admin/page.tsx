"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, DeliveryArea, OrderStatus } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import {
  ShieldCheck,
  Phone,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Bike,
  ChefHat,
  ArrowLeft,
  AlertCircle,
  Plus,
  Flame,
  Search,
  X,
  Sun,
  Moon,
  Utensils,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [activeTab, setActiveTab] = useState<"orders" | "areas" | "settings">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Track expanded cards and table rows
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Optimistic UI animation tracker
  const [animatingOrders, setAnimatingOrders] = useState<Record<string, { targetStatus: OrderStatus; timestamp: number }>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newAreaName, setNewAreaName] = useState<string>("");
  const [newAreaFee, setNewAreaFee] = useState<number>(100);

  // Check Supabase Auth and verify ADMIN role
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/staff/login");
          return;
        }

        const res = await fetch("/api/v1/account/profile");
        const data = await res.json();
        if (data.success && data.data?.profile?.role === "ADMIN") {
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch {
        setAuthStatus("unauthorized");
      }
    };

    checkAdminAuth();
  }, [router]);

  // Load all operational data once without filtering on the backend
  // This allows 100% instant (0ms) client-side tab switching without loading spinners
  const loadData = useCallback(async (silent = false) => {
    if (authStatus !== "authorized") return;
    if (!silent) setIsLoading(true);
    try {
      // Query without status restriction to fetch all ops pipeline orders
      const [ordersRes, areasRes, settingsRes] = await Promise.all([
        fetch("/api/v1/ops/orders"),
        fetch("/api/v1/admin/delivery-areas"),
        fetch("/api/v1/admin/settings"),
      ]);

      const [ordersData, areasData, settingsData] = await Promise.all([
        ordersRes.json(),
        areasRes.json(),
        settingsRes.json(),
      ]);

      if (ordersData.success) {
        setOrders(ordersData.data);
      }
      if (areasData.success) {
        setDeliveryAreas(areasData.data);
      }
      if (settingsData.success) {
        setSettings(settingsData.data.settings);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [authStatus]);

  // Initial load and fast 4-second background silent polling
  useEffect(() => {
    if (authStatus === "authorized") {
      loadData();
      const interval = setInterval(() => loadData(true), 4000);
      return () => clearInterval(interval);
    }
  }, [authStatus, loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  // Microsecond Optimistic Update with Smooth Animation
  const handleUpdateOrderStatus = async (orderId: string, targetStatus: OrderStatus) => {
    // 1. Snapshot previous state for rollback on error
    const previousOrders = [...orders];

    // 2. Trigger microsecond in-memory state update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: targetStatus,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    // 3. Mark order as actively animating for visual transition
    setAnimatingOrders((prev) => ({
      ...prev,
      [orderId]: { targetStatus, timestamp: Date.now() },
    }));

    showToast(`✓ Order moved to ${targetStatus}`);

    // Remove animation flag after smooth completion
    setTimeout(() => {
      setAnimatingOrders((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }, 600);

    // 4. Background network sync
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback on rejection
        setOrders(previousOrders);
        alert(data.error?.message || "Failed to update order status");
      }
    } catch {
      // Rollback on network failure
      setOrders(previousOrders);
      alert("Network connection error. Reverted order status.");
    }
  };

  const handleToggleArea = async (areaId: string, currentActive: number) => {
    try {
      const res = await fetch("/api/v1/admin/delivery-areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: areaId, isActive: currentActive === 1 ? false : true }),
      });
      if (res.ok) loadData(true);
    } catch {}
  };

  const handleUpdateAreaFee = async (areaId: string, feeStr: string) => {
    const fee = parseInt(feeStr, 10);
    if (isNaN(fee) || fee < 0) return;
    try {
      const res = await fetch("/api/v1/admin/delivery-areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: areaId, deliveryFeePkr: fee }),
      });
      if (res.ok) loadData(true);
    } catch {}
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    try {
      const res = await fetch("/api/v1/admin/delivery-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAreaName.trim(),
          deliveryFeePkr: newAreaFee,
          estimatedDeliveryMins: 40,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewAreaName("");
        showToast("Delivery area added successfully!");
        loadData(true);
      } else {
        alert(data.error?.message || "Failed to add delivery area");
      }
    } catch {}
  };

  const handleSaveSettings = async (overrideStatus: string, banner: string) => {
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            manual_override_status: overrideStatus,
            announcement_banner: banner,
          },
        }),
      });
      if (res.ok) {
        showToast("Settings saved successfully!");
        loadData(true);
      }
    } catch {}
  };

  const handleStaffLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/staff/login");
    } catch {
      router.push("/staff/login");
    }
  };

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
        const itemsMatch = o.items?.some(
          (it: any) =>
            it.productName?.toLowerCase().includes(q) ||
            it.productNameSnapshot?.toLowerCase().includes(q) ||
            it.variantName?.toLowerCase().includes(q) ||
            it.variantNameSnapshot?.toLowerCase().includes(q)
        );
        return num.includes(q) || name.includes(q) || phone.includes(q) || area.includes(q) || addr.includes(q) || itemsMatch;
      });
    }

    return list;
  }, [orders, orderStatusFilter, searchQuery]);

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

  if (authStatus === "loading") {
    return (
      <div
        style={{
          backgroundColor: "var(--cnm-bg)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cnm-text-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <RefreshCw className="spin" size={32} style={{ color: "var(--cnm-orange)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--cnm-text-muted)", fontSize: "14px", fontWeight: 700 }}>
            Verifying Administrator Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div
        style={{
          backgroundColor: "var(--cnm-bg)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--cnm-text-primary)",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            textAlign: "center",
            backgroundColor: "var(--cnm-surface)",
            padding: "36px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--cnm-border)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <ShieldCheck size={48} style={{ color: "var(--cnm-orange)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", color: "var(--cnm-text-primary)" }}>
            403 — Access Forbidden
          </h2>
          <p style={{ color: "var(--cnm-text-muted)", fontSize: "14px", marginBottom: "24px" }}>
            Your account does not have administrator privileges to access the Cluck N Moo command center.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link href="/staff/login" className="btn btn-primary" style={{ padding: "10px 18px", fontSize: "13px" }}>
              STAFF LOGIN
            </Link>
            <Link href="/" className="btn btn-secondary" style={{ padding: "10px 18px", fontSize: "13px" }}>
              STOREFRONT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--cnm-bg)", minHeight: "100vh", color: "var(--cnm-text-primary)" }}>
      {/* INJECT DYNAMIC ANIMATION STYLES */}
      <style>{`
        @keyframes orderSuccessPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
          50% { transform: scale(1.015); box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        @keyframes fadeInFast {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-optimistic-pulse {
          animation: orderSuccessPulse 0.5s ease-out forwards;
        }
        .anim-fade-in {
          animation: fadeInFast 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .order-card-transition {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .order-card-transition:hover {
          box-shadow: var(--shadow-md);
        }
      `}</style>

      {/* 1. TOP EXECUTIVE HEADER */}
      <header
        style={{
          borderBottom: "1px solid var(--cnm-border)",
          backgroundColor: "var(--cnm-surface)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-xs)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            title="Return to Storefront"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "var(--cnm-text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} />
            <span>Store</span>
          </Link>

          <BrandLogo size="sm" showTagline={false} />

          <span
            style={{
              backgroundColor: "rgba(255, 130, 67, 0.12)",
              color: "var(--cnm-orange)",
              border: "1px solid rgba(255, 130, 67, 0.3)",
              padding: "3px 9px",
              borderRadius: "var(--radius-xs)",
              fontFamily: "var(--font-display)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            COMMAND CENTER
          </span>
        </div>

        {/* Center Live Ops Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--status-ready)",
              boxShadow: "0 0 8px var(--status-ready)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--cnm-text-secondary)" }}>
            Live Ops • 4s Polling
          </span>
        </div>

        {/* Right Corner Controls: Theme Toggle, Fast Refresh, Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              width: "36px",
              height: "36px",
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
            {theme === "dark" ? <Sun size={16} color="#FBBF24" /> : <Moon size={16} color="var(--cnm-text-secondary)" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadData(false)}
            className="btn btn-sm btn-secondary"
            title="Refresh Data"
            style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>Sync</span>
          </button>

          {/* Staff Logout */}
          <button
            onClick={handleStaffLogout}
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "var(--cnm-text-primary)",
            color: "var(--cnm-surface)",
            padding: "10px 18px",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 800,
            zIndex: 9999,
            boxShadow: "var(--shadow-elevated)",
            animation: "fadeInFast 0.2s ease-in-out",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* 2. MAIN CONTAINER */}
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "16px 20px 48px" }}>
        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--cnm-border)",
            paddingBottom: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("orders")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                cursor: "pointer",
                backgroundColor: activeTab === "orders" ? "var(--cnm-orange)" : "var(--cnm-surface)",
                color: activeTab === "orders" ? "#ffffff" : "var(--cnm-text-secondary)",
                border: `1px solid ${activeTab === "orders" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <Flame size={15} />
              <span>Live Pipeline ({kpiMetrics.activeCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("areas")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                cursor: "pointer",
                backgroundColor: activeTab === "areas" ? "var(--cnm-orange)" : "var(--cnm-surface)",
                color: activeTab === "areas" ? "#ffffff" : "var(--cnm-text-secondary)",
                border: `1px solid ${activeTab === "areas" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <MapPin size={15} />
              <span>Delivery Areas ({deliveryAreas.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                cursor: "pointer",
                backgroundColor: activeTab === "settings" ? "var(--cnm-orange)" : "var(--cnm-surface)",
                color: activeTab === "settings" ? "#ffffff" : "var(--cnm-text-secondary)",
                border: `1px solid ${activeTab === "settings" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <Clock size={15} />
              <span>Store Schedule & Banner</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LIVE ORDERS PIPELINE */}
        {activeTab === "orders" && (
          <div>
            {/* 3. EXECUTIVE KPI METRICS BAR */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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

            {/* 4. CONTROLS BAR: INSTANT SEARCH, STATUS FILTER PILLS & VIEW TOGGLE */}
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
                  placeholder="Search order #, customer, item, phone..."
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
                        transition: "background-color 0.15s ease, color 0.15s ease, transform 0.1s ease",
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

            {/* 5. ORDERS RENDER AREA */}
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                  gap: "16px",
                  alignItems: "stretch",
                }}
              >
                {filteredOrders.map((ord) => {
                  const isExpanded = expandedOrderIds.has(ord.id);
                  const isAnimating = !!animatingOrders[ord.id];

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
                            {ord.orderType === "DELIVERY" ? <Bike size={11} /> : ord.orderType === "DINE_IN" ? <Utensils size={11} /> : <ShoppingBag size={11} />}
                            <span>{ord.orderType}</span>
                          </span>

                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-xs)",
                              backgroundColor: isAnimating ? "rgba(46, 204, 113, 0.2)" : "var(--cnm-surface-elevated)",
                              color: isAnimating ? "var(--status-ready)" : "var(--cnm-text-primary)",
                              border: "1px solid var(--cnm-border)",
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

                        {ord.orderType === "DELIVERY" && (
                          <div style={{ fontSize: "11.5px", color: "var(--cnm-text-secondary)" }}>
                            📍 <span style={{ fontWeight: 700 }}>{ord.deliveryAreaNameSnapshot || ord.deliveryAreaName}:</span>{" "}
                            {ord.deliveryAddressSnapshot || ord.deliveryAddress}
                            {ord.deliveryLandmarkSnapshot && (
                              <span style={{ color: "var(--cnm-text-muted)" }}> (Near: {ord.deliveryLandmarkSnapshot})</span>
                            )}
                          </div>
                        )}

                        {ord.orderType === "DINE_IN" && (
                          <div style={{ fontSize: "11.5px", color: "var(--status-confirmed)" }}>
                            🍽️ Dine-in: {ord.dineInPreferredTime} ({ord.paymentLocation || "On Table"})
                          </div>
                        )}
                      </div>

                      {/* Customer Special Instructions Alert (If present) */}
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

                      {/* Items List: Clean summary when collapsed, rich breakdown when expanded */}
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

                      {/* Card Footer (Pinned to bottom) */}
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

                        {/* Action Buttons with Microsecond Optimistic Triggers */}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {ord.status === "New" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, backgroundColor: "var(--status-new)", color: "#000", fontWeight: 800, padding: "7px 10px" }}
                            >
                              <Phone size={13} />
                              <span>CONFIRM CALL</span>
                            </button>
                          )}

                          {ord.status === "Confirmed" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, padding: "7px 10px" }}
                            >
                              <ChefHat size={14} />
                              <span>SEND KITCHEN</span>
                            </button>
                          )}

                          {ord.status === "Preparing" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                            >
                              <CheckCircle size={14} />
                              <span>MARK READY</span>
                            </button>
                          )}

                          {ord.status === "Ready" && ord.orderType === "DELIVERY" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, padding: "7px 10px" }}
                            >
                              <Bike size={14} />
                              <span>DISPATCH RIDER</span>
                            </button>
                          )}

                          {ord.status === "Ready" && ord.orderType !== "DELIVERY" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                            >
                              <CheckCircle size={14} />
                              <span>HAND OVER</span>
                            </button>
                          )}

                          {ord.status === "Out for delivery" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                              className="btn btn-sm btn-primary"
                              disabled={isUpdating}
                              style={{ flex: 1, backgroundColor: "var(--status-ready)", padding: "7px 10px" }}
                            >
                              <CheckCircle size={14} />
                              <span>SETTLE & COMPLETE</span>
                            </button>
                          )}

                          {ord.status !== "Completed" && ord.status !== "Cancelled" && (
                            <button
                              onClick={() => {
                                const reason = prompt("Enter cancellation reason:");
                                if (reason) handleUpdateOrderStatus(ord.id, ORDER_STATUSES.CANCELLED);
                              }}
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
                                  backgroundColor: isAnimating ? "rgba(46, 204, 113, 0.2)" : "var(--cnm-surface-elevated)",
                                  color: isAnimating ? "var(--status-ready)" : "var(--cnm-text-primary)",
                                  border: "1px solid var(--cnm-border)",
                                }}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              {ord.status === "New" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                                  className="btn btn-sm btn-primary"
                                  style={{ backgroundColor: "var(--status-new)", color: "#000", fontSize: "11px" }}
                                >
                                  Confirm
                                </button>
                              )}
                              {ord.status === "Confirmed" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: "11px" }}
                                >
                                  Kitchen
                                </button>
                              )}
                              {ord.status === "Preparing" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                                  className="btn btn-sm btn-primary"
                                  style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                                >
                                  Ready
                                </button>
                              )}
                              {ord.status === "Ready" && ord.orderType === "DELIVERY" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                                  className="btn btn-sm btn-primary"
                                  style={{ fontSize: "11px" }}
                                >
                                  Dispatch
                                </button>
                              )}
                              {ord.status === "Ready" && ord.orderType !== "DELIVERY" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                                  className="btn btn-sm btn-primary"
                                  style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                                >
                                  Handover
                                </button>
                              )}
                              {ord.status === "Out for delivery" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                                  className="btn btn-sm btn-primary"
                                  style={{ backgroundColor: "var(--status-ready)", fontSize: "11px" }}
                                >
                                  Settle
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
        )}

        {/* TAB 2: DELIVERY AREAS MANAGER */}
        {activeTab === "areas" && (
          <div>
            <div className="card" style={{ marginBottom: "20px", backgroundColor: "var(--cnm-surface)", borderRadius: "14px" }}>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  marginBottom: "12px",
                  color: "var(--cnm-orange)",
                }}
              >
                Add New Delivery Area / Village
              </h3>
              <form
                onSubmit={handleAddArea}
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "10px", alignItems: "flex-end" }}
              >
                <div>
                  <label className="form-label">Area / Village Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Kotla Arab Ali Khan"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Delivery Fee (PKR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="form-input"
                    value={newAreaFee}
                    onChange={(e) => setNewAreaFee(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: "46px" }}>
                  <Plus size={16} />
                  <span>Add Area</span>
                </button>
              </form>
            </div>

            <div className="card" style={{ backgroundColor: "var(--cnm-surface)", borderRadius: "14px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", marginBottom: "12px" }}>
                Active Delivery Coverage ({deliveryAreas.length} Areas Configured)
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                {deliveryAreas.map((area) => (
                  <div
                    key={area.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      backgroundColor: "var(--cnm-surface-elevated)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--cnm-border)",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--cnm-text-primary)" }}>
                        {area.name}
                      </span>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                        Est: ~{area.estimatedDeliveryMins} mins
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="number"
                          style={{
                            width: "70px",
                            padding: "5px 6px",
                            backgroundColor: "var(--cnm-surface)",
                            border: "1px solid var(--cnm-border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--cnm-text-primary)",
                            fontWeight: 900,
                            fontSize: "12px",
                          }}
                          defaultValue={area.deliveryFeePkr}
                          onBlur={(e) => handleUpdateAreaFee(area.id, e.target.value)}
                        />
                        <span style={{ fontSize: "11px", color: "var(--cnm-text-secondary)" }}>PKR</span>
                      </div>

                      <button
                        onClick={() => handleToggleArea(area.id, area.isActive)}
                        className={`btn btn-sm ${area.isActive ? "btn-outline" : "btn-secondary"}`}
                        style={{
                          minWidth: "75px",
                          fontSize: "11px",
                          padding: "5px 8px",
                          color: area.isActive ? "var(--status-ready)" : "var(--status-cancelled)",
                          borderColor: area.isActive ? "var(--status-ready)" : "var(--status-cancelled)",
                        }}
                      >
                        {area.isActive ? "Active" : "Disabled"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS & SCHEDULES */}
        {activeTab === "settings" && (
          <div className="card" style={{ maxWidth: "600px", backgroundColor: "var(--cnm-surface)", borderRadius: "14px" }}>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                marginBottom: "16px",
                color: "var(--cnm-orange)",
              }}
            >
              Operating Hours & Emergency Store Overrides
            </h3>

            <div className="form-group">
              <label className="form-label">Emergency Store Override</label>
              <select
                className="form-select"
                value={settings["manual_override_status"] || "AUTO"}
                onChange={(e) => {
                  const updated = { ...settings, manual_override_status: e.target.value };
                  setSettings(updated);
                  handleSaveSettings(e.target.value, settings["announcement_banner"] || "");
                }}
              >
                <option value="AUTO">AUTO (Follow Standard 12:01 PM - 02:00 AM PKT Hours)</option>
                <option value="FORCE_OPEN">FORCE OPEN (Override schedule, take orders now)</option>
                <option value="FORCE_CLOSED">FORCE CLOSED (Temporarily pause all incoming orders)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Banner Text (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Free delivery deal on all orders tonight!"
                value={settings["announcement_banner"] || ""}
                onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
              />
            </div>

            <button
              onClick={() =>
                handleSaveSettings(
                  settings["manual_override_status"] || "AUTO",
                  settings["announcement_banner"] || ""
                )
              }
              className="btn btn-primary"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
