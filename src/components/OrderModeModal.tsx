"use client";

import React, { useState, useEffect } from "react";
import { useOrderMode } from "@/context/OrderModeContext";
import { OrderType, BRAND } from "@/lib/constants";
import { DeliveryArea } from "@/types";
import {
  X,
  Bike,
  Clock,
  Utensils,
  MapPin,
  Check,
  AlertCircle,
  Phone,
} from "lucide-react";

export function OrderModeModal() {
  const { isModalOpen, closeOrderModeModal, modeState, saveOrderMode } = useOrderMode();

  const [selectedType, setSelectedType] = useState<OrderType>(modeState.orderType || "DELIVERY");
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(modeState.areaId || "");
  const [address, setAddress] = useState<string>(modeState.deliveryAddress || "");
  const [landmark, setLandmark] = useState<string>(modeState.deliveryLandmark || "");
  const [phone, setPhone] = useState<string>(modeState.customerPhone || "");

  // Dine-in fields
  const [dineInTimePreset, setDineInTimePreset] = useState<string>(modeState.dineInArrivalTime || "In 30 mins");
  const [customTime, setCustomTime] = useState<string>("");
  const [paymentLocation, setPaymentLocation] = useState<"AT_COUNTER" | "ON_TABLE">(
    modeState.dineInPaymentLocation || "AT_COUNTER"
  );

  // Location detection state
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [hasDeniedGeo, setHasDeniedGeo] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/v1/store/delivery-areas")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setDeliveryAreas(data.data);
          if (!selectedAreaId) {
            setSelectedAreaId(data.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [selectedAreaId]);

  if (!isModalOpen) return null;

  // Handle HTML5 geolocation request on explicit user click
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser. Please select your village below.");
      return;
    }

    setLocationStatus("Detecting Kharian location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationStatus(`Location detected (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})`);
        // Default to GT Road Kharian if close, or preserve user choice
        if (!selectedAreaId && deliveryAreas.length > 0) {
          setSelectedAreaId(deliveryAreas[0].id);
        }
      },
      (err) => {
        setHasDeniedGeo(true);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("Location access denied. Please select your Kharian village below.");
        } else {
          setLocationStatus("Could not fetch location. Please select your village below.");
        }
      },
      { timeout: 8000 }
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const chosenArea = deliveryAreas.find((a) => a.id === selectedAreaId);
    const finalArrivalTime = dineInTimePreset === "Custom" && customTime.trim() ? customTime : dineInTimePreset;

    saveOrderMode({
      orderType: selectedType,
      areaId: selectedType === "DELIVERY" ? selectedAreaId : undefined,
      areaName: selectedType === "DELIVERY" ? chosenArea?.name : undefined,
      deliveryFeePkr: selectedType === "DELIVERY" ? (chosenArea?.deliveryFeePkr ?? 100) : 0,
      deliveryAddress: selectedType === "DELIVERY" ? address : undefined,
      deliveryLandmark: selectedType === "DELIVERY" ? landmark : undefined,
      customerPhone: phone || undefined,
      dineInArrivalTime: selectedType === "DINE_IN" ? finalArrivalTime : undefined,
      dineInPaymentLocation: selectedType === "DINE_IN" ? paymentLocation : undefined,
    });
  };

  return (
    <div
      className="mode-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && modeState.isConfigured) {
          closeOrderModeModal();
        }
      }}
    >
      <div
        className="card mode-modal"
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-elevated)",
          position: "relative",
          padding: "24px",
        }}
      >
        {/* Close Button (only if already configured) */}
        {modeState.isConfigured && (
          <button
            onClick={closeOrderModeModal}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              color: "var(--cnm-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Modal Header */}
        <div style={{ marginBottom: "20px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
            START YOUR ORDER
          </span>
          <h2 style={{ fontSize: "22px", color: "var(--cnm-text-primary)", letterSpacing: "-0.02em" }}>
            How would you like your order?
          </h2>
          <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", marginTop: "4px" }}>
            Select your preferred dining mode to see accurate delivery times and fees.
          </p>
        </div>

        {/* 3-Way Mode Switcher Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "22px",
            backgroundColor: "var(--cnm-surface-elevated)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--cnm-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedType("DELIVERY")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "12px 6px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: selectedType === "DELIVERY" ? "var(--cnm-orange)" : "transparent",
              color: selectedType === "DELIVERY" ? "#ffffff" : "var(--cnm-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            <Bike size={18} />
            <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-display)" }}>
              DELIVERY
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("PICKUP")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "12px 6px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: selectedType === "PICKUP" ? "var(--cnm-orange)" : "transparent",
              color: selectedType === "PICKUP" ? "#ffffff" : "var(--cnm-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            <Clock size={18} />
            <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-display)" }}>
              TAKEAWAY
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("DINE_IN")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "12px 6px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: selectedType === "DINE_IN" ? "var(--cnm-orange)" : "transparent",
              color: selectedType === "DINE_IN" ? "#ffffff" : "var(--cnm-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            <Utensils size={18} />
            <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-display)" }}>
              DINE-IN
            </span>
          </button>
        </div>

        {/* Dynamic Form Content Based on Selected Type */}
        <form onSubmit={handleSave}>
          {selectedType === "DELIVERY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Geolocation Button */}
              {!hasDeniedGeo && (
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    backgroundColor: "var(--cnm-surface-elevated)",
                    border: "1px dashed var(--cnm-orange)",
                    color: "var(--cnm-orange)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <MapPin size={16} />
                  <span>Use my current location</span>
                </button>
              )}

              {locationStatus && (
                <div style={{ fontSize: "12px", color: "var(--cnm-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} color="var(--cnm-orange)" />
                  <span>{locationStatus}</span>
                </div>
              )}

              {/* Delivery Area Selection */}
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">Kharian Delivery Area / Village *</label>
                <select
                  required
                  className="form-select"
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                >
                  {deliveryAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} — {area.deliveryFeePkr} PKR (Est: ~{area.estimatedDeliveryMins} mins)
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Street & Landmark */}
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">House / Street Address (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. House 14, Street 2, Main Mohallah"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">Nearby Landmark (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Near Jamia Masjid or School"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--cnm-text-subtle)", marginTop: "2px" }}>
                Standard delivery fee is 100 PKR across all covered Kharian villages. Cash on delivery.
              </div>
            </div>
          )}

          {selectedType === "PICKUP" && (
            <div
              style={{
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <MapPin size={20} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--cnm-text-primary)", marginBottom: "4px" }}>
                    Cluck N Moo (CNM) Main Branch
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", lineHeight: 1.4 }}>
                    {BRAND.branch.address}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--cnm-text-primary)" }}>
                <Clock size={16} color="var(--cnm-orange)" />
                <span>Estimated ready time: <strong>~20 minutes</strong> (No delivery fee)</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--cnm-text-primary)" }}>
                <Phone size={16} color="var(--cnm-orange)" />
                <span>Hotline: <strong>{BRAND.branch.phone}</strong></span>
              </div>
            </div>
          )}

          {selectedType === "DINE_IN" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Preferred Arrival Time</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                  {["In 20 mins", "In 30 mins", "In 45 mins", "Custom"].map((timeChip) => {
                    const isSel = dineInTimePreset === timeChip;
                    return (
                      <button
                        key={timeChip}
                        type="button"
                        onClick={() => setDineInTimePreset(timeChip)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontWeight: 700,
                          backgroundColor: isSel ? "var(--cnm-orange)" : "var(--cnm-surface-elevated)",
                          color: isSel ? "#ffffff" : "var(--cnm-text-primary)",
                          border: `1px solid ${isSel ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                          cursor: "pointer",
                        }}
                      >
                        {timeChip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {dineInTimePreset === "Custom" && (
                <div className="form-group" style={{ marginBottom: "0" }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. 9:30 PM Tonight"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">Payment Preference (Cash Only)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setPaymentLocation("AT_COUNTER")}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: 800,
                      backgroundColor:
                        paymentLocation === "AT_COUNTER" ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                      border: `1px solid ${paymentLocation === "AT_COUNTER" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                      color: paymentLocation === "AT_COUNTER" ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Pay at Counter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentLocation("ON_TABLE")}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: 800,
                      backgroundColor:
                        paymentLocation === "ON_TABLE" ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                      border: `1px solid ${paymentLocation === "ON_TABLE" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                      color: paymentLocation === "ON_TABLE" ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Pay on Table
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "var(--cnm-text-subtle)" }}>
                Orders are freshly prepared for your arrival. Cash payment upon counter pickup or at table.
              </div>
            </div>
          )}

          {/* Action CTA */}
          <div style={{ marginTop: "24px" }}>
            <button type="submit" className="btn btn-primary btn-block" style={{ padding: "14px", fontSize: "15px" }}>
              CONFIRM & START ORDERING
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes modeSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .mode-backdrop {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          :global(.mode-modal) {
            max-height: 90vh !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            animation: modeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }
      `}</style>
    </div>
  );
}
