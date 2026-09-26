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
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

export function OrderModeModal() {
  const { isModalOpen, closeOrderModeModal, modeState, saveOrderMode } = useOrderMode();

  // Active step: "CHOOSE_TYPE" or "DETAILS"
  const [step, setStep] = useState<"CHOOSE_TYPE" | "DETAILS">("CHOOSE_TYPE");
  const [selectedType, setSelectedType] = useState<OrderType>(modeState.orderType || "DELIVERY");

  // Delivery state
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(modeState.areaId || "");
  const [address, setAddress] = useState<string>(modeState.deliveryAddress || "");
  const [landmark, setLandmark] = useState<string>(modeState.deliveryLandmark || "");
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(false);
  const [areasError, setAreasError] = useState<string | null>(null);

  // Dine-in state
  const [dineInTimePreset, setDineInTimePreset] = useState<string>(modeState.dineInArrivalTime || "In 30 mins");
  const [customTime, setCustomTime] = useState<string>("");
  const [paymentLocation, setPaymentLocation] = useState<"AT_COUNTER" | "ON_TABLE">(
    modeState.dineInPaymentLocation || "AT_COUNTER"
  );

  // Sync state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSelectedType(modeState.orderType || "DELIVERY");
      setSelectedAreaId(modeState.areaId || "");
      setAddress(modeState.deliveryAddress || "");
      setLandmark(modeState.deliveryLandmark || "");
      setDineInTimePreset(modeState.dineInArrivalTime || "In 30 mins");
      setPaymentLocation(modeState.dineInPaymentLocation || "AT_COUNTER");

      // If user is already configured and opens the modal to adjust, start at CHOOSE_TYPE
      setStep("CHOOSE_TYPE");
    }
  }, [isModalOpen, modeState]);

  // Fetch delivery areas
  const loadDeliveryAreas = () => {
    setIsLoadingAreas(true);
    setAreasError(null);
    fetch("/api/v1/store/delivery-areas")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setDeliveryAreas(data.data);
          if (!selectedAreaId) {
            setSelectedAreaId(data.data[0].id);
          }
        } else {
          setAreasError("No delivery areas found.");
        }
      })
      .catch(() => {
        setAreasError("Unable to load delivery areas. Please retry.");
      })
      .finally(() => setIsLoadingAreas(false));
  };

  useEffect(() => {
    if (isModalOpen) {
      loadDeliveryAreas();
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  // Handle immediate selection of an order type
  const handleSelectType = (type: OrderType) => {
    setSelectedType(type);

    if (type === "PICKUP") {
      // Immediately save pickup and close without large follow-up cards
      saveOrderMode({
        orderType: "PICKUP",
        deliveryFeePkr: 0,
      });
      return;
    }

    // For DELIVERY and DINE_IN, smoothly transition to the context-specific follow-up details
    setStep("DETAILS");
  };

  // Handle Confirm Delivery
  const handleConfirmDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenArea = deliveryAreas.find((a) => a.id === selectedAreaId) || deliveryAreas[0];

    saveOrderMode({
      orderType: "DELIVERY",
      areaId: chosenArea?.id || selectedAreaId,
      areaName: chosenArea?.name || "Kharian Area",
      deliveryFeePkr: chosenArea?.deliveryFeePkr ?? 100,
      deliveryAddress: address.trim() || undefined,
      deliveryLandmark: landmark.trim() || undefined,
    });
  };

  // Handle Confirm Dine-In
  const handleConfirmDineIn = (e: React.FormEvent) => {
    e.preventDefault();
    const finalArrivalTime = dineInTimePreset === "Custom" && customTime.trim() ? customTime.trim() : dineInTimePreset;

    saveOrderMode({
      orderType: "DINE_IN",
      deliveryFeePkr: 0,
      dineInArrivalTime: finalArrivalTime,
      dineInPaymentLocation: paymentLocation,
    });
  };

  return (
    <div
      className="order-mode-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && modeState.isConfigured) {
          closeOrderModeModal();
        }
      }}
    >
      <div className="order-mode-card" role="dialog" aria-modal="true" aria-labelledby="order-mode-heading">
        {/* Top Header */}
        <div className="mode-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {step === "DETAILS" && (
              <button
                type="button"
                onClick={() => setStep("CHOOSE_TYPE")}
                className="btn-back-step"
                aria-label="Back to order types"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 id="order-mode-heading" className="mode-card-title">
              {step === "CHOOSE_TYPE"
                ? "Select Dining Mode"
                : selectedType === "DELIVERY"
                ? "Delivery Location"
                : "Dine-In Details"}
            </h2>
          </div>

          {modeState.isConfigured && (
            <button
              type="button"
              onClick={closeOrderModeModal}
              className="btn-close-modal"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* STEP 1: INITIAL COMPACT ORDER TYPE SELECTION */}
        {step === "CHOOSE_TYPE" && (
          <div className="mode-options-grid">
            <p className="mode-subtitle">
              Choose how you would like to receive your food.
            </p>

            {/* Option 1: Delivery */}
            <button
              type="button"
              onClick={() => handleSelectType("DELIVERY")}
              className={`mode-option-btn ${selectedType === "DELIVERY" ? "active" : ""}`}
            >
              <div className="mode-icon-box delivery">
                <Bike size={20} />
              </div>
              <div className="mode-option-info">
                <div className="mode-option-title-row">
                  <span className="mode-option-name">Delivery</span>
                  <span className="mode-fee-badge">100 PKR</span>
                </div>
                <span className="mode-option-sub">
                  Delivered hot to Kharian & surrounding villages
                </span>
              </div>
              <ChevronRight size={16} className="mode-chevron" />
            </button>

            {/* Option 2: Takeaway / Pickup */}
            <button
              type="button"
              onClick={() => handleSelectType("PICKUP")}
              className={`mode-option-btn ${selectedType === "PICKUP" ? "active" : ""}`}
            >
              <div className="mode-icon-box pickup">
                <Clock size={20} />
              </div>
              <div className="mode-option-info">
                <div className="mode-option-title-row">
                  <span className="mode-option-name">Takeaway / Pickup</span>
                  <span className="mode-fee-badge free">FREE</span>
                </div>
                <span className="mode-option-sub">
                  Ready in ~20 mins • Main Branch, GT Road Kharian
                </span>
              </div>
              <ChevronRight size={16} className="mode-chevron" />
            </button>

            {/* Option 3: Dine-In */}
            <button
              type="button"
              onClick={() => handleSelectType("DINE_IN")}
              className={`mode-option-btn ${selectedType === "DINE_IN" ? "active" : ""}`}
            >
              <div className="mode-icon-box dinein">
                <Utensils size={20} />
              </div>
              <div className="mode-option-info">
                <div className="mode-option-title-row">
                  <span className="mode-option-name">Dine-In</span>
                  <span className="mode-fee-badge free">FREE</span>
                </div>
                <span className="mode-option-sub">
                  Fresh table experience • Fast counter or table payment
                </span>
              </div>
              <ChevronRight size={16} className="mode-chevron" />
            </button>
          </div>
        )}

        {/* STEP 2: CONTEXT-SPECIFIC DETAILS (DELIVERY) */}
        {step === "DETAILS" && selectedType === "DELIVERY" && (
          <form onSubmit={handleConfirmDelivery} className="mode-details-form">
            <div className="form-field">
              <label className="field-label" htmlFor="delivery-area-select">
                Delivery Area / Village *
              </label>

              {isLoadingAreas ? (
                <div className="field-loading">
                  <RefreshCw size={14} className="spin" />
                  <span>Loading delivery areas...</span>
                </div>
              ) : areasError ? (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{areasError}</span>
                  <button type="button" onClick={loadDeliveryAreas} className="btn-retry-areas">
                    Retry
                  </button>
                </div>
              ) : (
                <div className="select-container">
                  <select
                    id="delivery-area-select"
                    required
                    className="cnm-themed-select"
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                  >
                    {deliveryAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} — {area.deliveryFeePkr} PKR (Est: ~{area.estimatedDeliveryMins || 45} mins)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="delivery-address-input">
                House / Street Address (Optional)
              </label>
              <input
                id="delivery-address-input"
                type="text"
                className="cnm-themed-input"
                placeholder="e.g. House 14, Street 2, Main Mohallah"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="delivery-landmark-input">
                Nearby Landmark (Optional)
              </label>
              <input
                id="delivery-landmark-input"
                type="text"
                className="cnm-themed-input"
                placeholder="e.g. Near Jamia Masjid, Water Tank"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="mode-cta-row">
              <button
                type="button"
                onClick={() => setStep("CHOOSE_TYPE")}
                className="btn-mode-secondary"
              >
                Change Type
              </button>
              <button
                type="submit"
                disabled={isLoadingAreas}
                className="btn-mode-primary"
              >
                Confirm Delivery
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CONTEXT-SPECIFIC DETAILS (DINE-IN) */}
        {step === "DETAILS" && selectedType === "DINE_IN" && (
          <form onSubmit={handleConfirmDineIn} className="mode-details-form">
            <div className="form-field">
              <label className="field-label">Preferred Arrival Time</label>
              <div className="time-chips-grid">
                {["In 20 mins", "In 30 mins", "In 45 mins", "Custom"].map((timeChip) => {
                  const isSel = dineInTimePreset === timeChip;
                  return (
                    <button
                      key={timeChip}
                      type="button"
                      onClick={() => setDineInTimePreset(timeChip)}
                      className={`time-chip-btn ${isSel ? "active" : ""}`}
                    >
                      {timeChip}
                    </button>
                  );
                })}
              </div>
            </div>

            {dineInTimePreset === "Custom" && (
              <div className="form-field">
                <input
                  type="text"
                  required
                  className="cnm-themed-input"
                  placeholder="e.g. 8:30 PM Tonight"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  maxLength={40}
                />
              </div>
            )}

            <div className="form-field">
              <label className="field-label">Payment Preference (Cash Only)</label>
              <div className="payment-options-grid">
                <button
                  type="button"
                  onClick={() => setPaymentLocation("AT_COUNTER")}
                  className={`payment-pref-btn ${paymentLocation === "AT_COUNTER" ? "active" : ""}`}
                >
                  Pay at Counter
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentLocation("ON_TABLE")}
                  className={`payment-pref-btn ${paymentLocation === "ON_TABLE" ? "active" : ""}`}
                >
                  Pay on Table
                </button>
              </div>
            </div>

            <div className="mode-cta-row">
              <button
                type="button"
                onClick={() => setStep("CHOOSE_TYPE")}
                className="btn-mode-secondary"
              >
                Change Type
              </button>
              <button
                type="submit"
                className="btn-mode-primary"
              >
                Confirm Dine-In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Scoped CSS with Rich CNM Tokens for Light & Dark Mode */}
      <style jsx>{`
        .order-mode-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background-color: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeInBackdrop 0.18s ease-out;
        }

        .order-mode-card {
          width: 100%;
          max-width: 410px;
          max-height: 84vh;
          overflow-y: auto;
          background-color: var(--cnm-surface, #1e2230);
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          border-radius: 16px;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.6);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          animation: cardPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes cardPopIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .mode-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.08));
          margin-bottom: 14px;
        }

        .mode-card-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--cnm-text-primary, #ffffff);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .btn-back-step,
        .btn-close-modal {
          background: transparent;
          border: none;
          color: var(--cnm-text-muted, #94a3b8);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .btn-back-step:hover,
        .btn-close-modal:hover {
          color: var(--cnm-text-primary, #ffffff);
          background-color: var(--cnm-surface-elevated, rgba(255, 255, 255, 0.06));
        }

        .mode-options-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mode-subtitle {
          font-size: 12.5px;
          color: var(--cnm-text-muted, #94a3b8);
          margin: 0 0 4px;
          line-height: 1.35;
        }

        .mode-option-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid var(--cnm-border, rgba(255, 255, 255, 0.08));
          background-color: var(--cnm-surface-elevated, #161922);
          color: var(--cnm-text-primary, #ffffff);
          text-align: left;
          cursor: pointer;
          transition: all 0.18s ease;
          width: 100%;
        }

        .mode-option-btn:hover {
          border-color: var(--cnm-orange, #f97316);
          transform: translateY(-1px);
        }

        .mode-option-btn.active {
          border-color: var(--cnm-orange, #f97316);
          background-color: rgba(249, 115, 22, 0.08);
        }

        .mode-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mode-icon-box.delivery {
          background-color: rgba(249, 115, 22, 0.15);
          color: #f97316;
        }

        .mode-icon-box.pickup {
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .mode-icon-box.dinein {
          background-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .mode-option-info {
          flex: 1;
          min-width: 0;
        }

        .mode-option-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .mode-option-name {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--cnm-text-primary, #ffffff);
        }

        .mode-fee-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          background-color: rgba(249, 115, 22, 0.15);
          color: #f97316;
        }

        .mode-fee-badge.free {
          background-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .mode-option-sub {
          display: block;
          font-size: 11px;
          color: var(--cnm-text-muted, #94a3b8);
          line-height: 1.3;
        }

        .mode-chevron {
          color: var(--cnm-text-muted, #94a3b8);
          flex-shrink: 0;
        }

        /* Follow-up Details Form */
        .mode-details-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--cnm-text-muted, #94a3b8);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .select-container {
          position: relative;
          width: 100%;
        }

        .cnm-themed-select,
        .cnm-themed-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          background-color: var(--cnm-surface-elevated, #161922);
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          color: var(--cnm-text-primary, #ffffff);
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }

        .cnm-themed-select:focus,
        .cnm-themed-input:focus {
          border-color: var(--cnm-orange, #f97316);
        }

        .field-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          font-size: 12px;
          color: var(--cnm-text-muted, #94a3b8);
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #ef4444;
          padding: 6px 0;
        }

        .btn-retry-areas {
          background: transparent;
          border: none;
          color: var(--cnm-orange, #f97316);
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          font-size: 12px;
        }

        .time-chips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .time-chip-btn {
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          background-color: var(--cnm-surface-elevated, #161922);
          color: var(--cnm-text-primary, #ffffff);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .time-chip-btn.active {
          border-color: var(--cnm-orange, #f97316);
          background-color: var(--cnm-orange, #f97316);
          color: #ffffff;
        }

        .payment-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .payment-pref-btn {
          padding: 9px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          background-color: var(--cnm-surface-elevated, #161922);
          color: var(--cnm-text-primary, #ffffff);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .payment-pref-btn.active {
          border-color: var(--cnm-orange, #f97316);
          background-color: rgba(249, 115, 22, 0.15);
          color: var(--cnm-orange, #f97316);
        }

        .mode-cta-row {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .btn-mode-secondary {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid var(--cnm-border, rgba(255, 255, 255, 0.12));
          background-color: var(--cnm-surface-elevated, #161922);
          color: var(--cnm-text-muted, #94a3b8);
          cursor: pointer;
        }

        .btn-mode-primary {
          flex: 2;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          background-color: var(--cnm-orange, #f97316);
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
