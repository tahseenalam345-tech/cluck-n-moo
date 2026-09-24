"use client";

import React, { useState } from "react";
import { Product, ProductVariant, ProductModifier, CartItem } from "@/types";
import { X, Plus, Minus, Check, Flame } from "lucide-react";
import { ProductImage } from "./ProductImage";

interface ItemCustomizerModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

const PRESET_INSTRUCTIONS = ["No Mayo", "Extra Spicy", "Cut into Halves", "Pack Separately", "Less Pickles"];

export function ItemCustomizerModal({
  product,
  onClose,
  onAddToCart,
}: ItemCustomizerModalProps) {
  const defaultVariant = product.variants?.[0] || null;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);
  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedInstructionChips, setSelectedInstructionChips] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState<string>("");

  const basePrice = selectedVariant ? selectedVariant.pricePkr : product.basePricePkr;
  const modifiersPrice = selectedModifiers.reduce((acc, m) => acc + m.pricePkr, 0);
  const unitPrice = basePrice + modifiersPrice;
  const lineTotal = unitPrice * quantity;

  const toggleModifier = (mod: ProductModifier, maxSelection: number) => {
    const isSelected = selectedModifiers.some((m) => m.id === mod.id);
    if (isSelected) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== mod.id));
    } else {
      const otherInGroup = selectedModifiers.filter((m) => m.groupId === mod.groupId);
      if (maxSelection === 1 && otherInGroup.length >= 1) {
        setSelectedModifiers([...selectedModifiers.filter((m) => m.groupId !== mod.groupId), mod]);
      } else {
        setSelectedModifiers([...selectedModifiers, mod]);
      }
    }
  };

  const toggleInstructionChip = (chip: string) => {
    if (selectedInstructionChips.includes(chip)) {
      setSelectedInstructionChips(selectedInstructionChips.filter((c) => c !== chip));
    } else {
      setSelectedInstructionChips([...selectedInstructionChips, chip]);
    }
  };

  const handleAdd = () => {
    const allNotes = [...selectedInstructionChips];
    if (customInstructions.trim()) allNotes.push(customInstructions.trim());

    const cartItem: CartItem = {
      cartItemId: `${product.id}_${selectedVariant?.id || "base"}_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      unitPricePkr: unitPrice,
      quantity,
      modifiers: selectedModifiers.map((m) => ({
        id: m.id,
        name: m.name,
        pricePkr: m.pricePkr,
      })),
      specialInstructions: allNotes.join(" • ") || undefined,
      lineTotalPkr: lineTotal,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div
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
      onClick={onClose}
    >
      <div
        className="card customizer-modal-box"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          boxShadow: "var(--shadow-elevated)",
          position: "relative",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "14px",
            borderBottom: "1px solid var(--cnm-border)",
          }}
        >
          <div>
            <span className="badge badge-orange" style={{ marginBottom: "6px" }}>
              <Flame size={11} /> CUSTOMIZE YOUR ORDER
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                fontWeight: 900,
                color: "var(--cnm-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
            </h2>
            {product.description && (
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
                {product.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: "8px",
              color: "var(--cnm-text-muted)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--cnm-surface-elevated)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Customizer Body */}
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px", paddingBottom: "16px" }}>
          {/* Detail View Product Image */}
          {product.imageUrl && (
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "18px", border: "1px solid var(--cnm-border)" }}>
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                target="detail"
                aspectRatio="16/9"
                priority
              />
            </div>
          )}

          {/* Variants (Single Choice Radio Cards - REQUIRED) */}
          {product.variants && product.variants.length > 0 && (
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <h4
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "var(--cnm-orange)",
                    letterSpacing: "0.05em",
                  }}
                >
                  1. CHOOSE SIZE / PATTY (REQUIRED)
                </h4>
                <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", fontWeight: 700 }}>
                  Select 1
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {product.variants.map((v) => {
                  const isChosen = selectedVariant?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "13px 15px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: isChosen ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                        border: `1.5px solid ${isChosen ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: `2px solid ${isChosen ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isChosen ? "var(--cnm-orange)" : "transparent",
                          }}
                        >
                          {isChosen && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                          {v.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "14px",
                          fontWeight: 800,
                          color: isChosen ? "var(--cnm-orange)" : "var(--cnm-text-primary)",
                        }}
                      >
                        {v.pricePkr.toLocaleString()} PKR
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Groups (Add-ons / Extras - OPTIONAL) */}
          {product.modifierGroups &&
            product.modifierGroups.map((grp) => (
              <div key={grp.id} style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h4
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "var(--cnm-orange)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    2. {grp.name.toUpperCase()} (OPTIONAL)
                  </h4>
                  <span style={{ fontSize: "11px", color: "var(--cnm-text-muted)", fontWeight: 700 }}>
                    {grp.maxSelection ? `Up to ${grp.maxSelection}` : "Optional"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {grp.modifiers.map((m) => {
                    const isChecked = selectedModifiers.some((sm) => sm.id === m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModifier(m, grp.maxSelection || 5)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: isChecked ? "var(--cnm-orange-subtle)" : "var(--cnm-surface-elevated)",
                          border: `1.5px solid ${isChecked ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              border: `2px solid ${isChecked ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isChecked ? "var(--cnm-orange)" : "transparent",
                            }}
                          >
                            {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--cnm-text-primary)" }}>
                            {m.name}
                          </span>
                        </div>

                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "var(--cnm-orange)",
                          }}
                        >
                          +{m.pricePkr.toLocaleString()} PKR
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Quick Cooking Instruction Chips */}
          <div style={{ marginBottom: "18px" }}>
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--cnm-orange)",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              3. SPECIAL INSTRUCTIONS FOR KITCHEN
            </h4>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {PRESET_INSTRUCTIONS.map((chip) => {
                const isSelected = selectedInstructionChips.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleInstructionChip(chip)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "12px",
                      fontWeight: 700,
                      backgroundColor: isSelected ? "var(--cnm-orange)" : "var(--cnm-surface-elevated)",
                      color: isSelected ? "#ffffff" : "var(--cnm-text-primary)",
                      border: `1px solid ${isSelected ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="e.g. Extra Moo sauce in cup, crispy fries..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={150}
              style={{ fontSize: "13px", padding: "10px 12px" }}
            />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div
          style={{
            paddingTop: "16px",
            borderTop: "1px solid var(--cnm-border)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {/* Quantity Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--cnm-surface-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--cnm-border)",
            }}
          >
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              style={{
                padding: "10px 12px",
                color: "var(--cnm-text-primary)",
                display: "flex",
                alignItems: "center",
                cursor: quantity <= 1 ? "not-allowed" : "pointer",
                opacity: quantity <= 1 ? 0.4 : 1,
              }}
            >
              <Minus size={16} />
            </button>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 900,
                color: "var(--cnm-text-primary)",
                minWidth: "28px",
                textAlign: "center",
              }}
            >
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{
                padding: "10px 12px",
                color: "var(--cnm-text-primary)",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add to Tray Button with Dynamic Price */}
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: "12px 18px",
              fontSize: "14px",
              justifyContent: "space-between",
            }}
          >
            <span>ADD TO ORDER</span>
            <span>{lineTotal.toLocaleString()} PKR</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.customizer-modal-box) {
            max-height: 92vh !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            padding: 20px 16px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
