"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, Category, Product, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  RefreshCw,
  XCircle,
  X,
} from "lucide-react";

// Admin Modular Components
import { AdminShell, AdminSectionId } from "@/components/admin/AdminShell";
import { AdminOverviewSection } from "@/components/admin/AdminOverviewSection";
import { AdminOrdersSection } from "@/components/admin/AdminOrdersSection";
import { AdminProductsSection } from "@/components/admin/AdminProductsSection";
import { AdminProductModal } from "@/components/admin/AdminProductModal";
import { AdminCategoriesSection } from "@/components/admin/AdminCategoriesSection";
import { AdminDealsSection } from "@/components/admin/AdminDealsSection";
import { AdminModifiersSection } from "@/components/admin/AdminModifiersSection";
import { AdminMediaLibrarySection } from "@/components/admin/AdminMediaLibrarySection";
import { AdminPromotionsSection } from "@/components/admin/AdminPromotionsSection";
import { AdminDeliverySection } from "@/components/admin/AdminDeliverySection";
import { AdminSettingsSection } from "@/components/admin/AdminSettingsSection";
import { AdminStaffSection } from "@/components/admin/AdminStaffSection";
import { AdminAuditSection } from "@/components/admin/AdminAuditSection";

const CANCELLATION_PRESETS = [
  "Customer requested cancellation",
  "Kitchen out of stock / unable to prepare",
  "Rider unavailable for this sector",
  "Customer unreachable / fake call",
  "Incorrect delivery address / out of zone",
  "Payment / change issue",
];

export default function AdminPage() {
  const router = useRouter();

  // Authentication & Session
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Active Navigation Section
  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");

  // Core Real PostgreSQL Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Optimistic UI Animation Trackers
  const [animatingOrders, setAnimatingOrders] = useState<Record<string, { targetStatus: OrderStatus; timestamp: number }>>({});

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState<string>("");

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  // System Loading / Feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

        setUserEmail(user.email || null);

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

  // Track visited sections for lazy-mount & instant tab switching
  const [visitedSections, setVisitedSections] = useState<Set<AdminSectionId>>(
    () => new Set(["overview", "orders"])
  );

  const handleSelectSection = (sec: AdminSectionId) => {
    setActiveSection(sec);
    setVisitedSections((prev) => {
      if (prev.has(sec)) return prev;
      const next = new Set(prev);
      next.add(sec);
      return next;
    });
  };

  // Initial load for catalog data (categories & products) - executed once
  const loadCatalog = useCallback(async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        fetch("/api/v1/admin/categories"),
        fetch("/api/v1/admin/products"),
      ]);

      const [categoriesData, productsData] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
      ]);

      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        setCategories(categoriesData.data);
      }
      if (productsData.success && Array.isArray(productsData.data)) {
        setProducts(productsData.data);
      }
    } catch (err) {
      console.error("Failed to load catalog data:", err);
    }
  }, []);

  // Poll only live operational orders in the background
  const loadOrders = useCallback(async (silent = false) => {
    if (authStatus !== "authorized") return;
    if (!silent) setIsLoading(true);
    try {
      const ordersRes = await fetch("/api/v1/ops/orders");
      const ordersData = await ordersRes.json();

      if (ordersData.success && Array.isArray(ordersData.data)) {
        setOrders(ordersData.data);
      }
    } catch (err) {
      console.error("Failed to load operational orders:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "authorized") {
      loadCatalog();
      loadOrders(false);
      const interval = setInterval(() => loadOrders(true), 5000);
      return () => clearInterval(interval);
    }
  }, [authStatus, loadCatalog, loadOrders]);

  // Microsecond Optimistic Order Update
  const handleUpdateOrderStatus = async (
    orderId: string,
    targetStatus: OrderStatus,
    options?: { cancellationReason?: string; note?: string; assignedRiderId?: string }
  ) => {
    const previousOrders = [...orders];

    // Optimistic Update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: targetStatus,
              cancellationReason:
                targetStatus === ORDER_STATUSES.CANCELLED
                  ? options?.cancellationReason || "Cancelled by staff"
                  : o.cancellationReason,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    setAnimatingOrders((prev) => ({
      ...prev,
      [orderId]: { targetStatus, timestamp: Date.now() },
    }));

    showToast(`✓ Order moved to ${targetStatus}`);

    setTimeout(() => {
      setAnimatingOrders((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }, 600);

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          cancellationReason: options?.cancellationReason,
          note: options?.note,
          assignedRiderId: options?.assignedRiderId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setOrders(previousOrders);
        alert(data.error?.message || "Failed to update order status");
      }
    } catch {
      setOrders(previousOrders);
      alert("Network connection error. Reverted order status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit cancellation from modal
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    const orderId = cancelModalOrder.id;
    const reason = cancelReasonText.trim() || "Cancelled by staff";
    setCancelModalOrder(null);
    setCancelReasonText("");
    await handleUpdateOrderStatus(orderId, ORDER_STATUSES.CANCELLED, { cancellationReason: reason });
  };

  const pendingOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => o.status !== ORDER_STATUSES.COMPLETED && o.status !== ORDER_STATUSES.CANCELLED
    ).length;
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
    <AdminShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      userEmail={userEmail}
      pendingOrdersCount={pendingOrdersCount}
      totalProductsCount={0}
    >
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
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "16px",
          }}
          onClick={() => setCancelModalOrder(null)}
        >
          <div
            style={{
              backgroundColor: "var(--cnm-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--cnm-border)",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "var(--shadow-elevated)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--status-cancelled)" }}>
                <XCircle size={22} />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, margin: 0 }}>
                  Cancel Order #{cancelModalOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                style={{ background: "none", border: "none", color: "var(--cnm-text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--cnm-text-secondary)", marginBottom: "14px" }}>
              Please specify the cancellation reason. This will be permanently recorded and displayed in the cancelled orders audit log:
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {CANCELLATION_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setCancelReasonText(preset)}
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${cancelReasonText === preset ? "var(--status-cancelled)" : "var(--cnm-border)"}`,
                    backgroundColor: cancelReasonText === preset ? "rgba(239, 68, 68, 0.12)" : "var(--cnm-surface-elevated)",
                    color: cancelReasonText === preset ? "var(--status-cancelled)" : "var(--cnm-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleConfirmCancellation}>
              <div style={{ marginBottom: "18px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>
                  Cancellation Reason / Notes
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  placeholder="e.g. Customer cancelled via phone call due to delay"
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  style={{ width: "100%", resize: "vertical", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  Don&apos;t Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: "var(--status-cancelled)",
                    borderColor: "var(--status-cancelled)",
                    color: "#ffffff",
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Product Add / Edit Modal */}
      <AdminProductModal
        product={selectedProductForModal}
        categories={categories}
        allProducts={products}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProductForModal(null);
        }}
        onSuccess={(savedProduct) => {
          const itemName = savedProduct?.name || "Item";
          showToast(`✓ Item "${itemName}" saved successfully!`);
          setIsProductModalOpen(false);
          setSelectedProductForModal(null);
          loadCatalog();
        }}
      />

      {/* 12 Admin Modular Sections with Instant Sub-Millisecond Tab Switching & State Preservation */}
      <div style={{ display: activeSection === "overview" ? "block" : "none" }}>
        <AdminOverviewSection
          onNavigate={(sec) => handleSelectSection(sec)}
          onOpenAddProductModal={() => {
            setSelectedProductForModal(null);
            setIsProductModalOpen(true);
          }}
        />
      </div>

      <div style={{ display: activeSection === "orders" ? "block" : "none" }}>
        <AdminOrdersSection
          orders={orders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          animatingOrders={animatingOrders}
          onOpenCancelModal={(ord) => {
            setCancelModalOrder(ord);
            setCancelReasonText("");
          }}
          isUpdating={isUpdating}
        />
      </div>

      {visitedSections.has("categories") && (
        <div style={{ display: activeSection === "categories" ? "block" : "none" }}>
          <AdminCategoriesSection />
        </div>
      )}

      {visitedSections.has("products") && (
        <div style={{ display: activeSection === "products" ? "block" : "none" }}>
          <AdminProductsSection
            categories={categories}
            onOpenAddModal={() => {
              setSelectedProductForModal(null);
              setIsProductModalOpen(true);
            }}
            onOpenEditModal={(prod) => {
              setSelectedProductForModal(prod);
              setIsProductModalOpen(true);
            }}
          />
        </div>
      )}

      {visitedSections.has("deals") && (
        <div style={{ display: activeSection === "deals" ? "block" : "none" }}>
          <AdminDealsSection
            onOpenAddModal={() => {
              setSelectedProductForModal(null);
              setIsProductModalOpen(true);
            }}
            onOpenEditModal={(deal) => {
              setSelectedProductForModal(deal);
              setIsProductModalOpen(true);
            }}
          />
        </div>
      )}

      {visitedSections.has("modifiers") && (
        <div style={{ display: activeSection === "modifiers" ? "block" : "none" }}>
          <AdminModifiersSection />
        </div>
      )}

      {visitedSections.has("media") && (
        <div style={{ display: activeSection === "media" ? "block" : "none" }}>
          <AdminMediaLibrarySection />
        </div>
      )}

      {visitedSections.has("promotions") && (
        <div style={{ display: activeSection === "promotions" ? "block" : "none" }}>
          <AdminPromotionsSection />
        </div>
      )}

      {visitedSections.has("delivery") && (
        <div style={{ display: activeSection === "delivery" ? "block" : "none" }}>
          <AdminDeliverySection />
        </div>
      )}

      {visitedSections.has("settings") && (
        <div style={{ display: activeSection === "settings" ? "block" : "none" }}>
          <AdminSettingsSection />
        </div>
      )}

      {visitedSections.has("staff") && (
        <div style={{ display: activeSection === "staff" ? "block" : "none" }}>
          <AdminStaffSection />
        </div>
      )}

      {visitedSections.has("audit") && (
        <div style={{ display: activeSection === "audit" ? "block" : "none" }}>
          <AdminAuditSection />
        </div>
      )}
    </AdminShell>
  );
}
