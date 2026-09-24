"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
import { Bike, ArrowLeft, RefreshCw, Phone, MapPin, CheckCircle2, DollarSign } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function RiderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRiderOrders = async () => {
    try {
      const res = await fetch("/api/v1/ops/orders?orderType=DELIVERY");
      const data = await res.json();
      if (data.success) {
        const deliveries = data.data.filter(
          (o: Order) =>
            o.status === ORDER_STATUSES.READY || o.status === ORDER_STATUSES.OUT_FOR_DELIVERY
        );
        setOrders(deliveries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiderOrders();
    const interval = setInterval(loadRiderOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId: string, targetStatus: string) => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "RIDER",
        },
        body: JSON.stringify({ targetStatus }),
      });
      if (res.ok) loadRiderOrders();
    } catch {}
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh", backgroundColor: "var(--cnm-black)", paddingBottom: "40px" }}>
      {/* Top Header */}
      <header
        style={{
          backgroundColor: "var(--cnm-dark-900)",
          borderBottom: "1px solid var(--cnm-dark-700)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ color: "var(--cnm-gray-400)" }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bike size={24} color="var(--cnm-orange)" />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900 }}>
              RIDER DISPATCH
            </h1>
          </div>
        </div>

        <button onClick={loadRiderOrders} className="btn btn-sm btn-secondary">
          <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Main Container */}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--cnm-gray-400)",
              textTransform: "uppercase",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            ACTIVE RUNS ({orders.length})
          </span>
          <span className="badge badge-orange" style={{ fontSize: "11px" }}>
            Kharian Branch
          </span>
        </div>

        {orders.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--cnm-gray-400)",
              backgroundColor: "var(--cnm-dark-900)",
              border: "1px dashed var(--cnm-dark-700)",
            }}
          >
            <Bike size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--cnm-white)" }}>
              No Pending Deliveries
            </h3>
            <p style={{ marginTop: "4px", fontSize: "13px" }}>
              Packed orders ready for dispatch will appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {orders.map((ord) => {
              const isInTransit = ord.status === ORDER_STATUSES.OUT_FOR_DELIVERY;

              return (
                <div
                  key={ord.id}
                  className="card"
                  style={{
                    backgroundColor: "var(--cnm-dark-900)",
                    border: "1px solid var(--cnm-dark-700)",
                    borderLeft: isInTransit
                      ? "4px solid var(--cnm-orange)"
                      : "4px solid var(--status-ready)",
                  }}
                >
                  {/* Card Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "18px",
                          fontWeight: 900,
                          color: "var(--cnm-white)",
                        }}
                      >
                        {ord.orderNumber}
                      </span>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--cnm-gray-400)" }}>
                        Ready:{" "}
                        {new Date(ord.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <span
                      className="badge"
                      style={{
                        backgroundColor: isInTransit
                          ? "rgba(255,130,67,0.18)"
                          : "rgba(16,185,129,0.18)",
                        color: isInTransit ? "var(--cnm-orange)" : "var(--status-ready)",
                        border: "1px solid currentColor",
                      }}
                    >
                      {ord.status}
                    </span>
                  </div>

                  {/* Customer Card */}
                  <div
                    style={{
                      backgroundColor: "var(--cnm-dark-800)",
                      padding: "14px",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 800, fontSize: "16px", color: "var(--cnm-white)" }}>
                        {ord.customerNameSnapshot || ord.customerName}
                      </span>
                      <a
                        href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`}
                        className="btn btn-sm btn-primary"
                        style={{ padding: "8px 14px", fontSize: "13px" }}
                      >
                        <Phone size={14} />
                        <span>Call Customer</span>
                      </a>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px" }}>
                      <MapPin size={17} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <span style={{ fontWeight: 800, color: "var(--cnm-orange)" }}>
                          {ord.deliveryAreaNameSnapshot || ord.deliveryAreaName}:
                        </span>{" "}
                        <span style={{ color: "var(--cnm-white)" }}>
                          {ord.deliveryAddressSnapshot || ord.deliveryAddress}
                        </span>
                        {(ord.deliveryLandmarkSnapshot || ord.deliveryLandmark) && (
                          <span style={{ display: "block", fontSize: "12px", color: "var(--cnm-cream-dim)", marginTop: "3px" }}>
                            Landmark: {ord.deliveryLandmarkSnapshot || ord.deliveryLandmark}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cash to Collect Box */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      backgroundColor: "rgba(255, 130, 67, 0.1)",
                      border: "1.5px dashed var(--cnm-orange)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--cnm-white)", textTransform: "uppercase" }}>
                      CASH TO COLLECT FROM CUSTOMER
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "20px",
                        fontWeight: 900,
                        color: "var(--cnm-orange)",
                      }}
                    >
                      {ord.totalPkr.toLocaleString()} PKR
                    </span>
                  </div>

                  {/* Big Action Buttons */}
                  <div>
                    {!isInTransit ? (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                        className="btn btn-primary btn-block"
                        style={{ padding: "15px", fontSize: "16px" }}
                      >
                        <Bike size={18} />
                        <span>PICK UP & START DELIVERY</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, ORDER_STATUSES.COMPLETED)}
                        className="btn btn-block"
                        style={{
                          backgroundColor: "var(--status-ready)",
                          color: "#fff",
                          padding: "15px",
                          fontWeight: 900,
                          fontSize: "16px",
                          boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span>DELIVERED & CASH COLLECTED ({ord.totalPkr} PKR)</span>
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
