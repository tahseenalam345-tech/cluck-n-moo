"use client";

import React, { useState, useEffect } from "react";
import { Plus, MapPin, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { DeliveryArea } from "@/types";

export function AdminDeliverySection() {
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAreaName, setNewAreaName] = useState<string>("");
  const [newAreaFee, setNewAreaFee] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAreas = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/delivery-areas");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDeliveryAreas(data.data);
      }
    } catch (err) {
      console.error("Failed to load delivery areas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleToggleArea = async (areaId: string, currentActive: boolean | number) => {
    const nextActive = (typeof currentActive === "number" ? currentActive !== 1 : !currentActive) ? 1 : 0;
    try {
      const res = await fetch("/api/v1/admin/delivery-areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: areaId, isActive: nextActive === 1 }),
      });
      if (res.ok) {
        setDeliveryAreas((prev) =>
          prev.map((a) => (a.id === areaId ? { ...a, isActive: nextActive } : a))
        );
        showToast(nextActive === 1 ? "Area activated" : "Area deactivated");
      }
    } catch (err) {
      console.error("Failed to toggle area:", err);
    }
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
      if (res.ok) {
        setDeliveryAreas((prev) =>
          prev.map((a) => (a.id === areaId ? { ...a, deliveryFeePkr: fee } : a))
        );
        showToast(`Fee updated to ${fee} PKR`);
      }
    } catch (err) {
      console.error("Failed to update fee:", err);
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    setIsSubmitting(true);
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
        loadAreas();
      } else {
        alert(data.error?.message || "Failed to add delivery area");
      }
    } catch {
      alert("Network error while adding delivery area");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
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

      {/* Header Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
            Delivery Areas & Rates
          </h2>
          <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: "2px 0 0 0" }}>
            Configure active delivery zones, sectors, villages, and per-area delivery charges.
          </p>
        </div>

        <button
          onClick={loadAreas}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "7px 12px" }}
        >
          <RefreshCw size={13} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Add New Area Card */}
      <div
        style={{
          marginBottom: "20px",
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          borderRadius: "14px",
          padding: "18px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            marginBottom: "12px",
            color: "var(--cnm-orange)",
            fontWeight: 900,
          }}
        >
          Add New Delivery Area / Village
        </h3>
        <form
          onSubmit={handleAddArea}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label className="form-label" style={{ fontSize: "12px" }}>Area / Village Name</label>
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
            <label className="form-label" style={{ fontSize: "12px" }}>Delivery Fee (PKR)</label>
            <input
              type="number"
              required
              min={0}
              className="form-input"
              value={newAreaFee}
              onChange={(e) => setNewAreaFee(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ height: "42px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>{isSubmitting ? "Adding..." : "Add Area"}</span>
          </button>
        </form>
      </div>

      {/* Coverage Grid */}
      <div
        style={{
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          borderRadius: "14px",
          padding: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 900, margin: 0 }}>
            Configured Coverage ({deliveryAreas.length} Zones)
          </h3>
          <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)" }}>
            Edit fees by modifying the input and clicking away
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--cnm-text-muted)" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px", color: "var(--cnm-orange)" }} />
            <p style={{ fontSize: "13px" }}>Loading delivery areas...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "10px" }}>
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
                  <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--cnm-text-primary)", display: "block" }}>
                    {area.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                    Est: ~{area.estimatedDeliveryMins || 40} mins
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
        )}
      </div>
    </div>
  );
}
