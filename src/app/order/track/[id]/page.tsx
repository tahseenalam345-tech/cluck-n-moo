"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import {
  Phone,
  Clock,
  CheckCircle2,
  Bike,
  ChefHat,
  ShoppingBag,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Flame,
  Check,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationOptInPrompt } from "@/components/NotificationOptInPrompt";
import { getLocalOrders, updateLocalOrderStatus } from "@/lib/orderHistory";

const STATUS_STEPS: OrderStatus[] = [
  ORDER_STATUSES.NEW,
  ORDER_STATUSES.CONFIRMED,
  ORDER_STATUSES.PREPARING,
  ORDER_STATUSES.READY,
  ORDER_STATUSES.OUT_FOR_DELIVERY,
  ORDER_STATUSES.COMPLETED,
];

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      let token = searchParams.get("token");
      if (!token && typeof window !== "undefined") {
        const local = getLocalOrders();
        const found = local.find(
          (o) => o.orderNumber === id || o.orderId === id || o.trackingToken === id
        );
        if (found) token = found.trackingToken;
      }

      const url = token
        ? `/api/v1/orders/${id}/track?token=${encodeURIComponent(token)}`
        : `/api/v1/orders/${id}/track`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setOrder(data.data);
        if (data.data.trackingToken && data.data.status) {
          updateLocalOrderStatus(data.data.trackingToken, data.data.status);
        }
      } else {
        setError(data.error?.message || "Order not found");
      }
    } catch {
      setError("Unable to connect to server. Please check your connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      fetchOrder();
    }, 8000);
    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <div className="app-container" style={{ alignItems: "center", justifyContent: "center", minHeight: "80vh", backgroundColor: "var(--cnm-bg)" }}>
        <RefreshCw className="spin" size={32} color="var(--cnm-orange)" />
        <p style={{ marginTop: "14px", color: "var(--cnm-text-muted)", fontSize: "14px" }}>
          Loading live tracking status...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="app-container" style={{ padding: "32px 16px", textAlign: "center", backgroundColor: "var(--cnm-bg)" }}>
        <AlertTriangle size={48} color="var(--status-cancelled)" style={{ margin: "40px auto 16px" }} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", marginBottom: "8px", color: "var(--cnm-text-primary)" }}>Order Not Found</h2>
        <p style={{ color: "var(--cnm-text-muted)", marginBottom: "24px" }}>{error}</p>
        <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
          Return to Menu
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const customerPhone = order.customerPhone || (order as any).customerPhoneSnapshot || "your phone";
  const customerName = order.customerName || (order as any).customerNameSnapshot || "Customer";
  const deliveryArea = order.deliveryAreaName || (order as any).deliveryAreaNameSnapshot || "Kharian Area";
  const deliveryAddress = order.deliveryAddress || (order as any).deliveryAddressSnapshot || "";

  const getStatusCardConfig = () => {
    switch (order.status) {
      case ORDER_STATUSES.NEW:
        return {
          title: "ORDER PLACED — AWAITING CALL",
          desc: `Our staff will call you on ${customerPhone} to confirm your order details before cooking.`,
          borderColor: "var(--status-new)",
          bgColor: "var(--status-new-bg)",
          icon: <Phone size={20} color="var(--status-new)" />,
        };
      case ORDER_STATUSES.CONFIRMED:
        return {
          title: "ORDER CONFIRMED!",
          desc: "Your phone verification is complete. The ticket has been sent to the kitchen line.",
          borderColor: "var(--status-confirmed)",
          bgColor: "var(--status-confirmed-bg)",
          icon: <Check size={20} color="var(--status-confirmed)" />,
        };
      case ORDER_STATUSES.PREPARING:
        return {
          title: "SIZZLING IN THE KITCHEN",
          desc: "Our grill master is smashing patties and frying chicken fresh to order right now!",
          borderColor: "var(--status-preparing)",
          bgColor: "var(--status-preparing-bg)",
          icon: <Flame size={20} color="var(--status-preparing)" />,
        };
      case ORDER_STATUSES.READY:
        return {
          title: order.orderType === "DELIVERY" ? "FOOD PACKED & SEALED" : "FRESH & READY FOR PICKUP!",
          desc:
            order.orderType === "DELIVERY"
              ? "Your food is packed in thermal bags waiting for rider dispatch."
              : "Your meal is fresh at the counter! Please show your order number to collect.",
          borderColor: "var(--status-ready)",
          bgColor: "var(--status-ready-bg)",
          icon: <CheckCircle2 size={20} color="var(--status-ready)" />,
        };
      case ORDER_STATUSES.OUT_FOR_DELIVERY:
        return {
          title: "RIDER ON THE ROAD!",
          desc: `CNM delivery rider is on the way to ${deliveryArea} with your order.`,
          borderColor: "var(--status-delivery)",
          bgColor: "var(--status-delivery-bg)",
          icon: <Bike size={20} color="var(--status-delivery)" />,
        };
      case ORDER_STATUSES.COMPLETED:
        return {
          title: "ORDER COMPLETED",
          desc: "Thank you for choosing Cluck N Moo Kharian! Have a juicy feast!",
          borderColor: "var(--status-ready)",
          bgColor: "var(--status-ready-bg)",
          icon: <CheckCircle2 size={20} color="var(--status-ready)" />,
        };
      case ORDER_STATUSES.CANCELLED:
        return {
          title: "ORDER CANCELLED",
          desc: order.cancellationReason || "This order was cancelled by the branch.",
          borderColor: "var(--status-cancelled)",
          bgColor: "var(--status-cancelled-bg)",
          icon: <AlertTriangle size={20} color="var(--status-cancelled)" />,
        };
      default:
        return {
          title: order.status,
          desc: "",
          borderColor: "var(--cnm-border)",
          bgColor: "var(--cnm-surface-elevated)",
          icon: <Clock size={20} color="var(--cnm-text-muted)" />,
        };
    }
  };

  const statusConfig = getStatusCardConfig();

  return (
    <div className="app-container" style={{ paddingBottom: "40px", backgroundColor: "var(--cnm-bg)" }}>
      {/* Top Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--cnm-border)",
          backgroundColor: "var(--cnm-surface)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--cnm-text-primary)",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} />
          <span>Menu</span>
        </Link>

        <BrandLogo size="sm" showTagline={false} />

        <button
          onClick={() => fetchOrder(true)}
          style={{
            padding: "8px",
            borderRadius: "50%",
            backgroundColor: "var(--cnm-surface-elevated)",
            color: "var(--cnm-text-primary)",
            border: "1px solid var(--cnm-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Refresh"
        >
          <RefreshCw size={15} className={isRefreshing ? "spin" : ""} />
        </button>
      </header>

      {/* Main Container */}
      <div style={{ padding: "16px", maxWidth: "680px", margin: "0 auto" }}>
        {/* Polite Notification Opt-In Prompt */}
        <NotificationOptInPrompt />

        {/* Order Identifier Header */}
        <div
          className="card"
          style={{
            marginBottom: "16px",
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                ORDER REFERENCE
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "var(--cnm-text-primary)",
                  marginTop: "2px",
                  letterSpacing: "0.02em",
                }}
              >
                {order.orderNumber}
              </h2>
            </div>

            <span
              className="badge"
              style={{
                backgroundColor:
                  order.orderType === "DELIVERY"
                    ? "var(--cnm-orange-subtle)"
                    : order.orderType === "DINE_IN"
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(16,185,129,0.12)",
                color:
                  order.orderType === "DELIVERY"
                    ? "var(--cnm-orange)"
                    : order.orderType === "DINE_IN"
                    ? "var(--status-confirmed)"
                    : "var(--status-ready)",
                border: `1px solid ${
                  order.orderType === "DELIVERY"
                    ? "var(--cnm-orange)"
                    : order.orderType === "DINE_IN"
                    ? "var(--status-confirmed)"
                    : "var(--status-ready)"
                }`,
                fontSize: "12px",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
              }}
            >
              {order.orderType}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid var(--cnm-border)",
              fontSize: "12px",
              color: "var(--cnm-text-muted)",
            }}
          >
            <Clock size={14} />
            <span>
              Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} PKT
            </span>
          </div>
        </div>

        {/* Dynamic State Hero Card */}
        <div
          style={{
            backgroundColor: statusConfig.bgColor,
            border: `1.5px solid ${statusConfig.borderColor}`,
            borderRadius: "var(--radius-lg)",
            padding: "18px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            {statusConfig.icon}
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "17px",
                fontWeight: 900,
                color: "var(--cnm-text-primary)",
                letterSpacing: "0.03em",
              }}
            >
              {statusConfig.title}
            </h3>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--cnm-text-secondary)", lineHeight: 1.5, fontWeight: 500 }}>
            {statusConfig.desc}
          </p>
        </div>

        {/* Visual Timeline (Unless Cancelled) */}
        {!isCancelled && (
          <div
            className="card"
            style={{
              marginBottom: "20px",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              padding: "20px",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <h4
              style={{
                fontSize: "11px",
                color: "var(--cnm-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 800,
                marginBottom: "16px",
              }}
            >
              FULFILLMENT PROGRESS
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {STATUS_STEPS.map((step, idx) => {
                if (order.orderType !== "DELIVERY" && step === ORDER_STATUSES.OUT_FOR_DELIVERY) {
                  return null;
                }

                const isCompleted = currentStepIndex >= idx;
                const isCurrent = order.status === step;

                return (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: isCurrent
                          ? "var(--cnm-orange)"
                          : isCompleted
                          ? "var(--status-ready)"
                          : "var(--cnm-surface-elevated)",
                        border: `2px solid ${
                          isCurrent
                            ? "var(--cnm-orange)"
                            : isCompleted
                            ? "var(--status-ready)"
                            : "var(--cnm-border)"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isCompleted || isCurrent ? "#ffffff" : "var(--cnm-text-muted)",
                        fontSize: "11px",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {isCompleted && !isCurrent ? <Check size={14} strokeWidth={3.5} /> : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "14px",
                          fontWeight: isCurrent ? 900 : isCompleted ? 700 : 500,
                          color: isCurrent
                            ? "var(--cnm-orange)"
                            : isCompleted
                            ? "var(--cnm-text-primary)"
                            : "var(--cnm-text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {step}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--cnm-orange)",
                            display: "block",
                            fontWeight: 700,
                          }}
                        >
                          • Active Stage
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Itemized Receipt Snapshot */}
        <div
          className="card"
          style={{
            marginBottom: "20px",
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h4
            style={{
              fontSize: "11px",
              color: "var(--cnm-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            ITEMIZED RECEIPT
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            {order.items?.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid var(--cnm-border)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                    {item.quantity}x {item.productNameSnapshot || item.productName}
                  </span>
                  {(item.variantNameSnapshot || item.variantName) && (
                    <span style={{ display: "block", fontSize: "12px", color: "var(--cnm-text-secondary)" }}>
                      • {item.variantNameSnapshot || item.variantName}
                    </span>
                  )}
                  {item.modifiers?.map((m) => (
                    <span key={m.id} style={{ display: "block", fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                      + {m.modifierNameSnapshot || (m as any).name}
                    </span>
                  ))}
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--cnm-orange)" }}>
                  {item.lineTotalPkr.toLocaleString()} PKR
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
              <span>Subtotal</span>
              <span style={{ color: "var(--cnm-text-primary)", fontWeight: 600 }}>{order.subtotalPkr.toLocaleString()} PKR</span>
            </div>

            {order.discountPkr && order.discountPkr > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--status-ready)" }}>
                <span>Custom Deal Discount ({order.discountRate ? Math.round(order.discountRate * 100) : 0}% OFF)</span>
                <span style={{ fontWeight: 800 }}>-{order.discountPkr.toLocaleString()} PKR</span>
              </div>
            ) : null}

            {order.orderType === "DELIVERY" && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cnm-text-muted)" }}>
                <span>Delivery Fee ({deliveryArea})</span>
                <span style={{ color: "var(--cnm-text-primary)", fontWeight: 600 }}>{order.deliveryFeePkr.toLocaleString()} PKR</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "17px",
                fontWeight: 900,
                color: "var(--cnm-text-primary)",
                paddingTop: "10px",
                marginTop: "4px",
                borderTop: "1px dashed var(--cnm-border)",
              }}
            >
              <span>Total to Pay ({order.paymentMethod})</span>
              <span style={{ color: "var(--cnm-orange)" }}>{order.totalPkr.toLocaleString()} PKR</span>
            </div>
          </div>
        </div>

        {/* Customer Snapshot */}
        <div
          className="card"
          style={{
            marginBottom: "20px",
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h4
            style={{
              fontSize: "11px",
              color: "var(--cnm-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            ORDER CONTACT & DESTINATION
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "var(--cnm-text-muted)" }}>Name: </span>
              <span style={{ color: "var(--cnm-text-primary)", fontWeight: 800 }}>{customerName}</span>
            </div>

            <div>
              <span style={{ color: "var(--cnm-text-muted)" }}>Phone: </span>
              <span style={{ color: "var(--cnm-orange)", fontWeight: 800 }}>{customerPhone}</span>
            </div>

            {order.orderType === "DELIVERY" && (
              <>
                <div>
                  <span style={{ color: "var(--cnm-text-muted)" }}>Area: </span>
                  <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                    {deliveryArea}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--cnm-text-muted)" }}>Address: </span>
                  <span style={{ color: "var(--cnm-text-primary)", fontWeight: 500 }}>{deliveryAddress}</span>
                </div>
              </>
            )}

            {order.orderType === "DINE_IN" && order.dineInPreferredTime && (
              <div>
                <span style={{ color: "var(--cnm-text-muted)" }}>Arrival Time: </span>
                <span style={{ color: "var(--cnm-text-primary)", fontWeight: 800 }}>{order.dineInPreferredTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hotline & Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <a
            href={`tel:${BRAND.branch.phone}`}
            className="btn btn-primary btn-block"
            style={{
              padding: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 800,
            }}
          >
            <Phone size={18} />
            <span>Call Restaurant ({BRAND.branch.phone})</span>
          </a>

          <Link
            href="/"
            className="btn btn-secondary btn-block"
            style={{
              padding: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--cnm-surface-elevated)",
              color: "var(--cnm-text-primary)",
              border: "1px solid var(--cnm-border)",
              fontWeight: 700,
            }}
          >
            Order More Food
          </Link>
        </div>
      </div>
    </div>
  );
}
