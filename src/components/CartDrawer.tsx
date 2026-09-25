"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartItem, DeliveryArea } from "@/types";
import { OrderType, BRAND } from "@/lib/constants";
import { useOrderMode } from "@/context/OrderModeContext";
import { calculateCartWithCustomDeals } from "@/lib/customDeal";
import { saveLocalOrder } from "@/lib/orderHistory";
import {
  X,
  Trash2,
  MapPin,
  Clock,
  Utensils,
  Bike,
  ShoppingBag,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Check,
  PhoneCall,
  DollarSign,
  Flame,
  Sparkles,
} from "lucide-react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (cartItemId: string) => void;
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
  onQuickAddUpsell: (product: any) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateQuantity,
  onQuickAddUpsell,
  onClearCart,
}: CartDrawerProps) {
  const router = useRouter();
  const { modeState, setOrderTypeOnly, saveOrderMode } = useOrderMode();

  // 2-Step Flow: 'review' (Step 1) | 'details' (Step 2)
  const [step, setStep] = useState<"review" | "details">("review");

  // Delivery areas from database
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(modeState.areaId || "");

  // Customer details
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>(modeState.customerPhone || "");
  const [deliveryAddress, setDeliveryAddress] = useState<string>(modeState.deliveryAddress || "");
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>(modeState.deliveryLandmark || "");
  const [dineInTimePreset, setDineInTimePreset] = useState<string>(modeState.dineInArrivalTime || "In 30 mins");
  const [customDineInTime, setCustomDineInTime] = useState<string>("");
  const [dineInPaymentLoc, setDineInPaymentLoc] = useState<"AT_COUNTER" | "ON_TABLE">(
    modeState.dineInPaymentLocation || "AT_COUNTER"
  );
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load delivery areas
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

    // Pre-fill from localStorage if previously ordered
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("cnm_cust_name");
      const savedPhone = localStorage.getItem("cnm_cust_phone");
      const savedAddress = localStorage.getItem("cnm_cust_address");
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
      if (savedAddress) setDeliveryAddress(savedAddress);
    }
  }, [selectedAreaId]);

  if (!isOpen) return null;

  const currentOrderType = modeState.orderType;
  const cartCalc = calculateCartWithCustomDeals(cartItems);
  const {
    foodSubtotalPkr,
    customDealDiscountPkr,
    customDealDiscountRate,
    customDealSubtotalPkr,
    discountedFoodSubtotalPkr,
  } = cartCalc;
  const activeArea = deliveryAreas.find((a) => a.id === selectedAreaId);
  const deliveryFee = currentOrderType === "DELIVERY" ? (activeArea?.deliveryFeePkr ?? 100) : 0;
  const totalPkr = discountedFoodSubtotalPkr + deliveryFee;

  const handleProceedToDetails = () => {
    if (cartItems.length === 0) return;
    setErrorMessage(null);
    setStep("details");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\s+/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please provide a valid Pakistani contact number (e.g. 0302-1234567).");
      return;
    }

    if (currentOrderType === "DELIVERY" && (!deliveryAddress.trim() || deliveryAddress.trim().length < 4)) {
      setErrorMessage("Please enter your street address or house number for delivery.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalDineInTime =
        dineInTimePreset === "Custom" && customDineInTime.trim() ? customDineInTime : dineInTimePreset;

      const orderPayload = {
        orderType: currentOrderType,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        deliveryAreaId: currentOrderType === "DELIVERY" ? selectedAreaId : undefined,
        deliveryAddress: currentOrderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
        deliveryLandmark: currentOrderType === "DELIVERY" && deliveryLandmark ? deliveryLandmark.trim() : undefined,
        dineInPreferredTime: currentOrderType === "DINE_IN" ? finalDineInTime : undefined,
        paymentLocation: currentOrderType === "DINE_IN" ? dineInPaymentLoc : undefined,
        specialInstructions: specialInstructions ? specialInstructions.trim() : undefined,
        items: cartItems.map((item) => ({
          productId: item.productId || "",
          variantId: item.variantId,
          quantity: item.quantity,
          modifierIds: item.modifiers ? item.modifiers.map((m) => m.id) : [],
          specialInstructions: item.specialInstructions,
          customDealId: item.customDealId,
          promotionId: item.promotionId,
          promotionSelectedOptionIds: (item as any).promotionSelectedOptionIds || [],
          unitPricePkr: item.unitPricePkr,
        })),
      };

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Order placement failed. Please try again.");
      }

      // Persist customer details locally
      if (typeof window !== "undefined") {
        localStorage.setItem("cnm_cust_name", customerName.trim());
        localStorage.setItem("cnm_cust_phone", cleanPhone);
        if (currentOrderType === "DELIVERY") {
          localStorage.setItem("cnm_cust_address", deliveryAddress.trim());
        }
      }

      saveOrderMode({
        customerPhone: cleanPhone,
        deliveryAddress: deliveryAddress.trim(),
        deliveryLandmark: deliveryLandmark.trim(),
      });

      // Persist to local order history on this device
      const itemsSummary = cartItems
        .map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`)
        .join(", ");

      saveLocalOrder({
        orderId: data.data.orderId || data.data.id,
        trackingToken: data.data.trackingToken,
        orderNumber: data.data.orderNumber,
        createdAt: data.data.createdAt || new Date().toISOString(),
        orderType: currentOrderType.toLowerCase() as "delivery" | "takeaway" | "dine_in",
        currentStatus: data.data.status || data.data.currentStatus || "New",
        finalTotalPkr: data.data.totalPkr || totalPkr,
        itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
        itemsSummary: itemsSummary.length > 120 ? itemsSummary.slice(0, 117) + "..." : itemsSummary,
        discountPkr: data.data.discountPkr || customDealDiscountPkr,
      });

      onClearCart();
      onClose();

      // Redirect to live order tracking
      router.push(`/order/track/${data.data.trackingToken}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while placing your order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="cart-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        className="card cart-drawer-panel"
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100%",
          backgroundColor: "var(--cnm-surface)",
          borderLeft: "1px solid var(--cnm-border)",
          boxShadow: "var(--shadow-elevated)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 100,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--cnm-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {step === "details" && (
              <button
                onClick={() => setStep("review")}
                aria-label="Back to Tray Review"
                style={{
                  color: "var(--cnm-text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 900, color: "var(--cnm-text-primary)" }}>
                {step === "review" ? "YOUR TRAY" : "CHECKOUT DETAILS"}
              </h2>
              <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                {step === "review" ? `${cartItems.length} items in tray` : "Cash on settlement"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Tray"
            style={{
              padding: "6px",
              color: "var(--cnm-text-muted)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--cnm-surface-elevated)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: TRAY REVIEW */}
        {step === "review" ? (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 65px)" }}>
            {/* Scrollable Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 20px" }}>
                  <ShoppingBag size={48} color="var(--cnm-text-subtle)" style={{ margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)", marginBottom: "6px" }}>
                    Your Tray is Empty
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", marginBottom: "20px" }}>
                    Add some sizzling smash burgers, crispy chicken, or value deals to get started!
                  </p>
                  <button onClick={onClose} className="btn btn-primary">
                    EXPLORE MENU
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {cartItems.map((item) => (
                    <div
                      key={item.cartItemId}
                      style={{
                        backgroundColor: "var(--cnm-surface-elevated)",
                        border: "1px solid var(--cnm-border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                              {item.productName}
                            </h4>
                            {item.customDealId && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  backgroundColor: "rgba(255, 130, 67, 0.15)",
                                  color: "var(--cnm-orange)",
                                  border: "1px solid rgba(255, 130, 67, 0.3)",
                                  padding: "1px 6px",
                                  borderRadius: "var(--radius-full)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Sparkles size={9} /> CUSTOM DEAL
                              </span>
                            )}
                            {item.promotionId && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  backgroundColor: "rgba(255, 130, 67, 0.15)",
                                  color: "var(--cnm-orange)",
                                  border: "1px solid rgba(255, 130, 67, 0.3)",
                                  padding: "1px 6px",
                                  borderRadius: "var(--radius-full)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Flame size={9} /> PROMOTION DEAL
                              </span>
                            )}
                          </div>
                          {item.promotionSnapshot ? (
                            <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", display: "block", marginTop: "2px", lineHeight: 1.3 }}>
                              {item.promotionSnapshot}
                            </span>
                          ) : item.variantName ? (
                            <span style={{ fontSize: "12px", color: "var(--cnm-orange)", fontWeight: 700 }}>
                              {item.variantName}
                            </span>
                          ) : null}
                        </div>

                        <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                          {item.lineTotalPkr.toLocaleString()} PKR
                        </span>
                      </div>

                      {/* Selected Modifiers */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {item.modifiers.map((m) => (
                            <span
                              key={m.id}
                              style={{
                                fontSize: "11px",
                                backgroundColor: "var(--cnm-surface)",
                                border: "1px solid var(--cnm-border)",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                color: "var(--cnm-text-muted)",
                              }}
                            >
                              +{m.name} ({m.pricePkr} PKR)
                            </span>
                          ))}
                        </div>
                      )}

                      {item.specialInstructions && (
                        <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", fontStyle: "italic" }}>
                          Note: {item.specialInstructions}
                        </span>
                      )}

                      {/* Quantity Stepper & Trash */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--cnm-border)",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "var(--cnm-surface)",
                            borderRadius: "var(--radius-xs)",
                            border: "1px solid var(--cnm-border)",
                          }}
                        >
                          <button
                            onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                            style={{ padding: "4px 8px", color: "var(--cnm-text-primary)", cursor: "pointer" }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: "13px", fontWeight: 800, minWidth: "22px", textAlign: "center" }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                            style={{ padding: "4px 8px", color: "var(--cnm-text-primary)", cursor: "pointer" }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.cartItemId)}
                          aria-label="Remove Item"
                          style={{ color: "var(--status-cancelled)", padding: "4px", cursor: "pointer" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Step 1 Footer */}
            {cartItems.length > 0 && (
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid var(--cnm-border)",
                  backgroundColor: "var(--cnm-surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                  <span style={{ color: "var(--cnm-text-muted)" }}>Food Subtotal</span>
                  <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)" }}>{foodSubtotalPkr.toLocaleString()} PKR</span>
                </div>

                {customDealDiscountPkr > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      fontSize: "13.5px",
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      border: "1px dashed var(--status-ready)",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 750, color: "var(--status-ready)" }}>
                        Custom Deal Discount ({Math.round(customDealDiscountRate * 100)}% OFF)
                      </span>
                    </div>
                    <span style={{ fontWeight: 900, color: "var(--status-ready)" }}>
                      -{customDealDiscountPkr.toLocaleString()} PKR
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "14px" }}>
                  <span style={{ color: "var(--cnm-text-muted)" }}>
                    {currentOrderType === "DELIVERY" ? "Estimated Delivery Fee" : "Service Fee"}
                  </span>
                  <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)" }}>
                    {currentOrderType === "DELIVERY" ? `${deliveryFee} PKR` : "0 PKR"}
                  </span>
                </div>

                <button
                  onClick={handleProceedToDetails}
                  className="btn btn-primary btn-block"
                  style={{ padding: "14px", fontSize: "15px", justifyContent: "space-between" }}
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <span>{totalPkr.toLocaleString()} PKR</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: CHECKOUT DETAILS & CASH SETTLEMENT */
          <form
            onSubmit={handleCheckout}
            style={{ display: "flex", flexDirection: "column", height: "calc(100% - 65px)" }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {/* Customer Contact */}
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "12px", letterSpacing: "0.05em" }}>
                  1. CONTACT INFORMATION
                </h3>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Hamza Tariq"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Staff calls to confirm) *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="e.g. 0302-1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Delivery Details */}
              {currentOrderType === "DELIVERY" && (
                <div style={{ marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "12px", letterSpacing: "0.05em" }}>
                    2. DELIVERY ADDRESS (KHARIAN)
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Kharian Village / Area *</label>
                    <select
                      required
                      className="form-select"
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                    >
                      {deliveryAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name} — {area.deliveryFeePkr} PKR (Est ~{area.estimatedDeliveryMins} mins)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Street Address / House # *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. House 24, Street 3, Main Mohallah"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nearby Landmark (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Near Raza CNG or Jamia Masjid"
                      value={deliveryLandmark}
                      onChange={(e) => setDeliveryLandmark(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Dine-In Arrival Timing */}
              {currentOrderType === "DINE_IN" && (
                <div style={{ marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "12px", letterSpacing: "0.05em" }}>
                    2. DINE-IN ARRIVAL TIME
                  </h3>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {["In 20 mins", "In 35 mins", "In 50 mins", "Custom"].map((timeChip) => {
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

                  {dineInTimePreset === "Custom" && (
                    <div className="form-group">
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. 9:15 PM Tonight"
                        value={customDineInTime}
                        onChange={(e) => setCustomDineInTime(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Payment Preference</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setDineInPaymentLoc("AT_COUNTER")}
                        style={{
                          padding: "10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontWeight: 800,
                          backgroundColor:
                            dineInPaymentLoc === "AT_COUNTER" ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                          border: `1px solid ${dineInPaymentLoc === "AT_COUNTER" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                          color: dineInPaymentLoc === "AT_COUNTER" ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Pay at Counter
                      </button>
                      <button
                        type="button"
                        onClick={() => setDineInPaymentLoc("ON_TABLE")}
                        style={{
                          padding: "10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontWeight: 800,
                          backgroundColor:
                            dineInPaymentLoc === "ON_TABLE" ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                          border: `1px solid ${dineInPaymentLoc === "ON_TABLE" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                          color: dineInPaymentLoc === "ON_TABLE" ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Pay on Table
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Order Notes */}
              <div className="form-group">
                <label className="form-label">Order Instructions (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Please bring exact change for 2000 PKR..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Cash Only Payment Highlight */}
              <div
                style={{
                  backgroundColor: "var(--cnm-orange-subtle)",
                  border: "1px dashed var(--cnm-orange)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <DollarSign size={20} color="var(--cnm-orange)" />
                <div style={{ fontSize: "12px" }}>
                  <span style={{ fontWeight: 800, color: "var(--cnm-orange)", display: "block" }}>
                    PAYMENT METHOD: CASH ONLY
                  </span>
                  <span style={{ color: "var(--cnm-text-primary)" }}>
                    {currentOrderType === "DELIVERY"
                      ? "Pay exact cash to rider upon delivery."
                      : "Pay cash at the counter or table."}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    backgroundColor: "var(--status-cancelled-bg)",
                    border: "1px solid var(--status-cancelled)",
                    color: "var(--status-cancelled)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Sticky Step 2 Footer */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--cnm-border)",
                backgroundColor: "var(--cnm-surface)",
              }}
            >
              {/* Price Breakdown in Step 2 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginBottom: "12px",
                  fontSize: "13px",
                  borderBottom: "1px solid var(--cnm-border)",
                  paddingBottom: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--cnm-text-muted)" }}>Food Subtotal</span>
                  <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                    {foodSubtotalPkr.toLocaleString()} PKR
                  </span>
                </div>

                {customDealDiscountPkr > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--status-ready)" }}>
                    <span style={{ fontWeight: 700 }}>
                      Custom Deal Discount ({Math.round(customDealDiscountRate * 100)}% OFF)
                    </span>
                    <span style={{ fontWeight: 800 }}>
                      -{customDealDiscountPkr.toLocaleString()} PKR
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--cnm-text-muted)" }}>
                    {currentOrderType === "DELIVERY" ? "Delivery Fee" : "Service Fee"}
                  </span>
                  <span style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                    {currentOrderType === "DELIVERY" ? `${deliveryFee} PKR` : "0 PKR"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px", fontSize: "14px" }}>
                <span style={{ fontWeight: 700, color: "var(--cnm-text-secondary)" }}>Total Cash to Pay</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 900, color: "var(--cnm-text-primary)" }}>
                  {totalPkr.toLocaleString()} PKR
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-block"
                style={{ padding: "14px", fontSize: "15px" }}
              >
                {isSubmitting ? "PLACING YOUR ORDER..." : `PLACE CASH ORDER (${totalPkr.toLocaleString()} PKR)`}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes cartSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .cart-backdrop {
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          :global(.cart-drawer-panel) {
            max-width: 100% !important;
            height: 90vh !important;
            border-left: none !important;
            border-top-left-radius: var(--radius-lg) !important;
            border-top-right-radius: var(--radius-lg) !important;
            animation: cartSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }
      `}</style>
    </div>
  );
}
