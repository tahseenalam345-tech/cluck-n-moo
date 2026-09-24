"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, ArrowLeft, RefreshCw, CheckCircle2, Flame, Clock, AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function KitchenPage() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        if (data.success && (data.data?.profile?.role === "KITCHEN_STAFF" || data.data?.profile?.role === "ADMIN")) {
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

  const loadKitchenOrders = async () => {
    if (authStatus !== "authorized") return;
    try {
      const res = await fetch("/api/v1/ops/orders?status=active");
      const data = await res.json();
      if (data.success) {
        const kitchenTickets = data.data.filter(
          (o: Order) => o.status === ORDER_STATUSES.CONFIRMED || o.status === ORDER_STATUSES.PREPARING
        );
        setOrders(kitchenTickets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authorized") {
      loadKitchenOrders();
      const interval = setInterval(loadKitchenOrders, 6000);
      return () => clearInterval(interval);
    }
  }, [authStatus]);

  const handleAdvance = async (orderId: string, targetStatus: string) => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetStatus }),
      });
      if (res.ok) loadKitchenOrders();
    } catch {}
  };

  if (authStatus === "loading") {
    return (
      <div style={{ backgroundColor: "var(--cnm-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cnm-text-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw className="spin" size={32} style={{ color: "var(--cnm-orange)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--cnm-text-muted)" }}>Connecting to Kitchen Display System...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div style={{ backgroundColor: "var(--cnm-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cnm-text-primary)", padding: "24px" }}>
        <div style={{ maxWidth: "460px", textAlign: "center", backgroundColor: "var(--cnm-surface)", padding: "36px", borderRadius: "var(--radius-md)", border: "1px solid var(--cnm-border)", boxShadow: "var(--shadow-elevated)" }}>
          <AlertTriangle size={48} style={{ color: "var(--cnm-orange)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", color: "var(--cnm-text-primary)" }}>403 — Unauthorized Access</h2>
          <p style={{ color: "var(--cnm-text-muted)", fontSize: "14px", marginBottom: "24px" }}>
            Kitchen Display System is restricted to active kitchen personnel and administrators.
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
      {/* Top KDS Header */}
      <header
        style={{
          backgroundColor: "var(--cnm-surface)",
          borderBottom: "1px solid var(--cnm-border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" style={{ color: "var(--cnm-text-muted)" }}>
            <ArrowLeft size={22} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ChefHat size={28} color="var(--cnm-orange)" />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "0.04em",
                color: "var(--cnm-text-primary)",
              }}
            >
              KITCHEN DISPLAY SYSTEM (KDS)
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 900,
              fontFamily: "var(--font-display)",
              backgroundColor: "var(--cnm-orange)",
              color: "var(--cnm-white)",
              padding: "5px 14px",
              borderRadius: "var(--radius-sm)",
              letterSpacing: "0.04em",
            }}
          >
            {orders.length} ACTIVE TICKETS
          </span>
          <button onClick={loadKitchenOrders} className="btn btn-sm btn-secondary">
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Ticket Grid */}
      <div style={{ padding: "24px" }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "120px 20px", color: "var(--cnm-text-muted)" }}>
            <ChefHat size={64} style={{ margin: "0 auto 16px", opacity: 0.3, color: "var(--cnm-orange)" }} />
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                color: "var(--cnm-text-primary)",
                letterSpacing: "0.02em",
              }}
            >
              ALL ORDERS COOKED & READY!
            </h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "var(--cnm-text-muted)" }}>
              Waiting for new orders from the front counter & website.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "20px",
            }}
          >
            {orders.map((ticket) => {
              const isCooking = ticket.status === ORDER_STATUSES.PREPARING;
              return (
                <div
                  key={ticket.id}
                  style={{
                    backgroundColor: "var(--cnm-surface)",
                    borderRadius: "var(--radius-lg)",
                    border: isCooking ? "2.5px solid var(--cnm-orange)" : "1px solid var(--cnm-border)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isCooking ? "0 4px 25px rgba(255, 130, 67, 0.25)" : "var(--shadow-card)",
                  }}
                >
                  {/* Big Color-Coded Order Type Banner */}
                  <div
                    style={{
                      padding: "10px 16px",
                      backgroundColor:
                        ticket.orderType === "DELIVERY"
                          ? "var(--cnm-orange)"
                          : ticket.orderType === "DINE_IN"
                          ? "#2563eb"
                          : "#059669",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontFamily: "var(--font-display)",
                      fontWeight: 900,
                      fontSize: "17px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span>{ticket.orderType}</span>
                    <span style={{ fontSize: "14px", opacity: 0.9 }}>
                      {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Subheader */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--cnm-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 900, color: "var(--cnm-text-primary)" }}>
                        {ticket.orderNumber}
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)", fontWeight: 600 }}>
                        Customer: {ticket.customerNameSnapshot || ticket.customerName}
                      </span>
                    </div>

                    <span
                      className="badge"
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        backgroundColor: isCooking ? "rgba(255,130,67,0.15)" : "var(--cnm-surface-elevated)",
                        color: isCooking ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                        border: `1px solid ${isCooking ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                        fontWeight: 800,
                      }}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  {/* Items List */}
                  <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                    {ticket.items?.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "var(--cnm-surface-elevated)",
                          padding: "12px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--cnm-border)",
                          borderLeft: "4px solid var(--cnm-orange)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "24px",
                              fontWeight: 900,
                              color: "var(--cnm-orange)",
                              lineHeight: 1,
                            }}
                          >
                            {item.quantity}x
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "18px",
                              fontWeight: 900,
                              color: "var(--cnm-text-primary)",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.productNameSnapshot || item.productName}
                          </span>
                        </div>

                        {(item.variantNameSnapshot || item.variantName) && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "var(--cnm-text-secondary)",
                              marginTop: "4px",
                            }}
                          >
                            SIZE: {item.variantNameSnapshot || item.variantName}
                          </span>
                        )}

                        {item.modifiers && item.modifiers.length > 0 && (
                          <div style={{ fontSize: "12px", color: "var(--cnm-text-muted)", marginTop: "4px", fontWeight: 600 }}>
                            {item.modifiers.map((m: any) => `+ ${m.modifierNameSnapshot || m.name}`).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}

                    {ticket.specialInstructions && (
                      <div
                        style={{
                          padding: "10px 14px",
                          backgroundColor: "rgba(255, 130, 67, 0.12)",
                          border: "1px dashed var(--cnm-orange)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "13px",
                          color: "var(--cnm-orange)",
                          fontWeight: 800,
                        }}
                      >
                        ⚠️ NOTE: {ticket.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Big Touch Action Buttons */}
                  <div style={{ padding: "14px 16px", borderTop: "1px solid var(--cnm-border)", backgroundColor: "var(--cnm-surface-elevated)" }}>
                    {!isCooking ? (
                      <button
                        onClick={() => handleAdvance(ticket.id, ORDER_STATUSES.PREPARING)}
                        className="btn btn-primary btn-block"
                        style={{ fontSize: "17px", minHeight: "56px", fontWeight: 800 }}
                      >
                        <Flame size={20} />
                        <span>START COOKING</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdvance(ticket.id, ORDER_STATUSES.READY)}
                        className="btn btn-block"
                        style={{
                          backgroundColor: "var(--status-ready)",
                          color: "#fff",
                          fontSize: "17px",
                          minHeight: "56px",
                          fontWeight: 900,
                          boxShadow: "0 6px 20px rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        <CheckCircle2 size={20} />
                        <span>MARK ORDER READY</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
