"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Order, DeliveryArea, OrderStatus } from "@/types";
import { ORDER_STATUSES, BRAND } from "@/lib/constants";
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
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "areas" | "settings">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("active");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newAreaName, setNewAreaName] = useState<string>("");
  const [newAreaFee, setNewAreaFee] = useState<number>(100);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ordersRes = await fetch(`/api/v1/ops/orders?status=${orderStatusFilter}`);
      const ordersData = await ordersRes.json();
      if (ordersData.success) setOrders(ordersData.data);

      const areasRes = await fetch("/api/v1/admin/delivery-areas");
      const areasData = await areasRes.json();
      if (areasData.success) setDeliveryAreas(areasData.data);

      const settingsRes = await fetch("/api/v1/admin/settings");
      const settingsData = await settingsRes.json();
      if (settingsData.success) setSettings(settingsData.data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [orderStatusFilter]);

  const handleUpdateOrderStatus = async (orderId: string, targetStatus: OrderStatus) => {
    setIsUpdating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
        },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order status updated to ${targetStatus}`);
        loadData();
      } else {
        alert(data.error?.message || "Failed to update order status");
      }
    } catch {
      alert("Error updating order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleArea = async (areaId: string, currentActive: number) => {
    try {
      const res = await fetch("/api/v1/admin/delivery-areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: areaId, isActive: currentActive === 1 ? false : true }),
      });
      if (res.ok) loadData();
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
      if (res.ok) loadData();
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
        loadData();
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
        alert("Settings saved successfully!");
        loadData();
      }
    } catch {}
  };

  return (
    <div style={{ backgroundColor: "var(--cnm-black)", minHeight: "100vh", color: "var(--cnm-white)" }}>
      {/* Top Admin Nav */}
      <header
        style={{
          borderBottom: "1px solid var(--cnm-dark-700)",
          backgroundColor: "var(--cnm-dark-900)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link href="/" style={{ color: "var(--cnm-gray-400)" }}>
            <ArrowLeft size={18} />
          </Link>
          <BrandLogo size="sm" showTagline={false} />
          <span
            style={{
              backgroundColor: "var(--cnm-dark-800)",
              color: "var(--cnm-orange)",
              padding: "3px 8px",
              borderRadius: "4px",
              fontFamily: "var(--font-display)",
              fontSize: "11px",
              fontWeight: 900,
            }}
          >
            COMMAND CENTER
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={loadData} className="btn btn-sm btn-secondary" title="Refresh">
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="desktop-full-container" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid var(--cnm-dark-700)",
            paddingBottom: "12px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setActiveTab("orders")}
            className={`btn btn-sm ${activeTab === "orders" ? "btn-primary" : "btn-secondary"}`}
          >
            Live Pipeline ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("areas")}
            className={`btn btn-sm ${activeTab === "areas" ? "btn-primary" : "btn-secondary"}`}
          >
            Delivery Areas ({deliveryAreas.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`btn btn-sm ${activeTab === "settings" ? "btn-primary" : "btn-secondary"}`}
          >
            Store Schedule & Banner
          </button>
        </div>

        {/* Tab 1: Orders Pipeline */}
        {activeTab === "orders" && (
          <div>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
              {["active", "New", "Confirmed", "Preparing", "Ready", "Out for delivery", "Completed", "Cancelled"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setOrderStatusFilter(f)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "12px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      backgroundColor:
                        orderStatusFilter === f ? "var(--cnm-orange)" : "var(--cnm-dark-800)",
                      color: orderStatusFilter === f ? "var(--cnm-white)" : "var(--cnm-gray-400)",
                      border: `1px solid ${
                        orderStatusFilter === f ? "var(--cnm-orange)" : "var(--cnm-dark-700)"
                      }`,
                    }}
                  >
                    {f}
                  </button>
                )
              )}
            </div>

            {/* Orders Grid */}
            {orders.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "50px",
                  color: "var(--cnm-gray-400)",
                  border: "1px dashed var(--cnm-dark-700)",
                }}
              >
                No orders match filter "{orderStatusFilter}".
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="card"
                    style={{
                      backgroundColor: "var(--cnm-dark-900)",
                      border: "1px solid var(--cnm-dark-700)",
                      borderLeft:
                        ord.status === "New"
                          ? "4px solid var(--status-new)"
                          : ord.status === "Confirmed"
                          ? "4px solid var(--status-confirmed)"
                          : ord.status === "Preparing"
                          ? "4px solid var(--cnm-orange)"
                          : ord.status === "Ready"
                          ? "4px solid var(--status-ready)"
                          : "1px solid var(--cnm-dark-700)",
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div>
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "17px",
                            fontWeight: 900,
                            color: "var(--cnm-white)",
                          }}
                        >
                          {ord.orderNumber}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "11px",
                            color: "var(--cnm-gray-400)",
                          }}
                        >
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} PKT
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "rgba(255,130,67,0.15)",
                            color: "var(--cnm-orange)",
                            fontSize: "10px",
                          }}
                        >
                          {ord.orderType}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "var(--cnm-dark-800)",
                            color: "var(--cnm-white)",
                            fontSize: "10px",
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info Box */}
                    <div
                      style={{
                        backgroundColor: "var(--cnm-dark-800)",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "var(--cnm-white)" }}>
                        {ord.customerNameSnapshot || ord.customerName} •{" "}
                        <a href={`tel:${ord.customerPhoneSnapshot || ord.customerPhone}`} style={{ color: "var(--cnm-orange)" }}>
                          {ord.customerPhoneSnapshot || ord.customerPhone}
                        </a>
                      </div>

                      {ord.orderType === "DELIVERY" && (
                        <div style={{ fontSize: "12px", color: "var(--cnm-gray-400)", marginTop: "4px" }}>
                          📍 {ord.deliveryAreaNameSnapshot || ord.deliveryAreaName}: {ord.deliveryAddressSnapshot || ord.deliveryAddress}
                        </div>
                      )}

                      {ord.orderType === "DINE_IN" && (
                        <div style={{ fontSize: "12px", color: "var(--status-confirmed)", marginTop: "4px" }}>
                          🍽️ Dine-in: {ord.dineInPreferredTime} ({ord.paymentLocation})
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                      {ord.items?.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            color: "var(--cnm-white)",
                          }}
                        >
                          <span>
                            {item.quantity}x {item.productNameSnapshot || item.productName}{" "}
                            {(item.variantNameSnapshot || item.variantName) ? `(${item.variantNameSnapshot || item.variantName})` : ""}
                          </span>
                          <span style={{ fontWeight: 700 }}>{item.lineTotalPkr} PKR</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px dashed var(--cnm-dark-700)",
                        fontSize: "15px",
                        fontWeight: 900,
                        marginBottom: "14px",
                      }}
                    >
                      <span>Total Amount (Cash)</span>
                      <span style={{ color: "var(--cnm-orange)" }}>{ord.totalPkr.toLocaleString()} PKR</span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {ord.status === "New" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.CONFIRMED)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1, backgroundColor: "var(--status-new)", color: "#000" }}
                        >
                          <Phone size={14} />
                          <span>CONFIRM BY PHONE</span>
                        </button>
                      )}

                      {ord.status === "Confirmed" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.PREPARING)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1 }}
                        >
                          <ChefHat size={14} />
                          <span>SEND TO KITCHEN</span>
                        </button>
                      )}

                      {ord.status === "Preparing" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.READY)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1, backgroundColor: "var(--status-ready)" }}
                        >
                          <CheckCircle size={14} />
                          <span>MARK READY</span>
                        </button>
                      )}

                      {ord.status === "Ready" && ord.orderType === "DELIVERY" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.OUT_FOR_DELIVERY)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1 }}
                        >
                          <Bike size={14} />
                          <span>DISPATCH RIDER</span>
                        </button>
                      )}

                      {ord.status === "Ready" && ord.orderType !== "DELIVERY" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1, backgroundColor: "var(--status-ready)" }}
                        >
                          <CheckCircle size={14} />
                          <span>HAND OVER</span>
                        </button>
                      )}

                      {ord.status === "Out for delivery" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, ORDER_STATUSES.COMPLETED)}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1, backgroundColor: "var(--status-ready)" }}
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
                          style={{ color: "var(--status-cancelled)" }}
                        >
                          <XCircle size={14} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Delivery Areas Manager */}
        {activeTab === "areas" && (
          <div>
            <div className="card" style={{ marginBottom: "20px" }}>
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

            <div className="card">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", marginBottom: "12px" }}>
                Active Delivery Coverage (Kharian Region)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {deliveryAreas.map((area) => (
                  <div
                    key={area.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      backgroundColor: "var(--cnm-dark-800)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--cnm-dark-700)",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--cnm-white)" }}>
                        {area.name}
                      </span>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--cnm-gray-400)" }}>
                        Est. Delivery: ~{area.estimatedDeliveryMins} mins
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--cnm-gray-400)" }}>Fee:</span>
                        <input
                          type="number"
                          style={{
                            width: "80px",
                            padding: "6px 8px",
                            backgroundColor: "var(--cnm-dark-900)",
                            border: "1px solid var(--cnm-dark-700)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--cnm-orange)",
                            fontWeight: 900,
                          }}
                          defaultValue={area.deliveryFeePkr}
                          onBlur={(e) => handleUpdateAreaFee(area.id, e.target.value)}
                        />
                        <span style={{ fontSize: "12px" }}>PKR</span>
                      </div>

                      <button
                        onClick={() => handleToggleArea(area.id, area.isActive)}
                        className={`btn btn-sm ${area.isActive ? "btn-outline" : "btn-secondary"}`}
                        style={{
                          minWidth: "90px",
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

        {/* Tab 3: Settings & Schedules */}
        {activeTab === "settings" && (
          <div className="card" style={{ maxWidth: "600px" }}>
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
