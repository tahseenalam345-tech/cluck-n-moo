"use client";

import React, { useState, useEffect } from "react";
import { Promotion, PromotionRule, PromotionRuleOption, CartItem } from "@/types";
import { X, Check, Plus, Minus, Sparkles, AlertCircle, ShoppingBag, Flame, Utensils } from "lucide-react";
import { buildCloudinaryUrl } from "./ProductImage";
import {
  COMPLETE_PROMOTIONS_DATA,
  PROMOTION_EXTRAS,
  PRESET_KITCHEN_NOTES,
  PromotionExtraOption,
} from "@/lib/promotionRulesData";

interface PromotionModalProps {
  promotion: Promotion;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export function PromotionModal({ promotion: propPromotion, onClose, onAddToCart }: PromotionModalProps) {
  // Synchronously resolve complete rules from authoritative data if missing
  const resolveFullPromotion = (p: Promotion): Promotion => {
    if (p.rules && p.rules.length > 0) return p;
    const match = COMPLETE_PROMOTIONS_DATA.find((item) => item.slug === p.slug || item.id === p.id);
    if (match && match.rules && match.rules.length > 0) {
      return { ...p, rules: match.rules };
    }
    return p;
  };

  const [promotion, setPromotion] = useState<Promotion>(() => resolveFullPromotion(propPromotion));
  const [selectedByRule, setSelectedByRule] = useState<Record<string, string[]>>({});
  const [selectedExtras, setSelectedExtras] = useState<PromotionExtraOption[]>([]);
  const [selectedInstructionChips, setSelectedInstructionChips] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Keep state synced if prop changes
  useEffect(() => {
    const full = resolveFullPromotion(propPromotion);
    setPromotion(full);
  }, [propPromotion]);

  // Also query live API in background if needed
  useEffect(() => {
    fetch("/api/v1/promotions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const match = data.data.find(
            (p: any) => p.slug === promotion.slug || p.id === promotion.id
          );
          if (match && match.rules && match.rules.length > 0) {
            setPromotion(match);
          }
        }
      })
      .catch(() => {});
  }, [promotion.id, promotion.slug]);

  // Initialize default selections where applicable
  useEffect(() => {
    const initial: Record<string, string[]> = {};
    if (promotion.rules) {
      for (const rule of promotion.rules) {
        if (rule.ruleType === "fixed_item" && rule.options.length > 0) {
          initial[rule.id] = [rule.options[0].id];
        } else if (rule.required && rule.options.length > 0 && rule.minSelections === 1 && rule.maxSelections === 1) {
          // Pre-select first flavor/option for fast 1-tap UX
          initial[rule.id] = [rule.options[0].id];
        } else {
          initial[rule.id] = [];
        }
      }
    }
    setSelectedByRule(initial);
  }, [promotion]);

  // Handle option selection for a rule (flavors, tiers, drinks)
  const handleToggleOption = (rule: PromotionRule, option: PromotionRuleOption) => {
    setValidationError(null);
    setSelectedByRule((prev) => {
      const current = prev[rule.id] || [];
      const isSelected = current.includes(option.id);

      if (rule.maxSelections === 1) {
        if (isSelected && !rule.required) {
          return { ...prev, [rule.id]: [] };
        }
        return { ...prev, [rule.id]: [option.id] };
      } else {
        if (isSelected) {
          return { ...prev, [rule.id]: current.filter((id) => id !== option.id) };
        } else {
          if (current.length >= rule.maxSelections) {
            return prev;
          }
          return { ...prev, [rule.id]: [...current, option.id] };
        }
      }
    });
  };

  // Toggle optional extras
  const toggleExtra = (extra: PromotionExtraOption) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.id === extra.id);
      if (exists) {
        return prev.filter((e) => e.id !== extra.id);
      }
      return [...prev, extra];
    });
  };

  // Toggle instruction chips
  const toggleInstructionChip = (chip: string) => {
    setSelectedInstructionChips((prev) => {
      if (prev.includes(chip)) {
        return prev.filter((c) => c !== chip);
      }
      return [...prev, chip];
    });
  };

  // Compute calculated unit price
  let calculatedUnitPrice = promotion.fixedPricePkr;
  const allSelectedOptionIds: string[] = [];
  const selectedOptionTitles: string[] = [];

  // Add rule adjustments (flavors / deal tiers)
  if (promotion.rules) {
    for (const rule of promotion.rules) {
      const selectedIds = selectedByRule[rule.id] || [];
      for (const optId of selectedIds) {
        allSelectedOptionIds.push(optId);
        const opt = rule.options.find((o) => o.id === optId);
        if (opt) {
          calculatedUnitPrice += opt.priceAdjustmentPkr;
          selectedOptionTitles.push(opt.optionTitle);
        }
      }
    }
  }

  // Add extras adjustments
  for (const extra of selectedExtras) {
    calculatedUnitPrice += extra.pricePkr;
  }

  const finalTotalPkr = calculatedUnitPrice * quantity;

  // Validation
  const validateForm = (): boolean => {
    if (!promotion.rules) return true;
    for (const rule of promotion.rules) {
      const selected = selectedByRule[rule.id] || [];
      if (rule.required && selected.length < rule.minSelections) {
        setValidationError(`Please select an option for: ${rule.ruleLabel}`);
        return false;
      }
    }
    return true;
  };

  const handleAddDeal = () => {
    if (!validateForm()) return;

    const flavorsSummary = selectedOptionTitles.join(" • ");
    const extrasSummary = selectedExtras.length > 0
      ? `Extras: ${selectedExtras.map((e) => `${e.name} (+${e.pricePkr})`).join(", ")}`
      : "";
    const combinedSnapshot = [flavorsSummary, extrasSummary].filter(Boolean).join(" | ");

    const finalInstructions = [
      selectedInstructionChips.join(", "),
      customInstructions.trim(),
    ]
      .filter(Boolean)
      .join(" - ");

    const cartItem: CartItem = {
      cartItemId: `deal_${promotion.id}_${Date.now()}`,
      productId: promotion.id,
      productName: promotion.title,
      variantName: combinedSnapshot || undefined,
      unitPricePkr: calculatedUnitPrice,
      modifiers: selectedExtras.map((e) => ({
        id: `mod_${e.id}`,
        name: e.name,
        pricePkr: e.pricePkr,
      })),
      quantity,
      lineTotalPkr: finalTotalPkr,
      specialInstructions: finalInstructions || undefined,
      promotionId: promotion.id,
      promotionSlug: promotion.slug,
      promotionTitle: promotion.title,
      promotionSnapshot: combinedSnapshot,
    };

    (cartItem as any).promotionSelectedOptionIds = allSelectedOptionIds;

    onAddToCart(cartItem);
    onClose();
  };

  const isCloudinary = Boolean(promotion.cloudinaryPublicId);
  const bannerUrl = isCloudinary
    ? buildCloudinaryUrl(promotion.cloudinaryPublicId, 1000)
    : promotion.imageUrl;

  return (
    <div className="promo-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="promo-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close Button */}
        <button
          onClick={onClose}
          aria-label="Close deal modal"
          className="promo-modal-close"
        >
          <X size={18} />
        </button>

        {/* Modal Scrollable Body */}
        <div className="promo-modal-scrollable">
          {/* Banner Graphic Frame */}
          <div className="promo-modal-banner-frame">
            <img
              src={bannerUrl}
              alt={promotion.title}
              className="promo-modal-banner"
            />
            {promotion.badgeText && (
              <span className="promo-modal-badge">
                <Sparkles size={10} /> {promotion.badgeText}
              </span>
            )}
          </div>

          {/* Deal Title & Overview */}
          <div className="promo-modal-info">
            <div className="promo-modal-title-row">
              <h2 className="promo-modal-title">{promotion.title}</h2>
              <div className="promo-modal-price-pill">
                <span className="promo-modal-price">{calculatedUnitPrice.toLocaleString()}</span>
                <span className="promo-modal-currency">PKR</span>
              </div>
            </div>

            {promotion.shortDescription && (
              <p className="promo-modal-desc">{promotion.shortDescription}</p>
            )}

            {/* Pizza Specific Notice if applicable */}
            {promotion.slug === "cheesier-medium-pizza-launch" && (
              <div className="promo-modal-notice">
                🍕 <strong>Size: Medium (10 inch) Only</strong> — This exclusive launch offer is locked strictly to Medium size.
              </div>
            )}
            {promotion.slug === "pizza-treat" && (
              <div className="promo-modal-notice">
                🎉 <strong>Full Feast Included</strong> — 1x Tray Pizza + 6 Pcs Baked Wings + Regular Fries + 1.5L Drink!
              </div>
            )}
            {promotion.slug === "bogo-pizza-deal" && (
              <div className="promo-modal-notice">
                🍕 <strong>Buy 1 Get 1 Free</strong> — Choose flavors for both of your freshly baked Medium (10 inch) pizzas!
              </div>
            )}
          </div>

          {/* 1. Flavours & Required Choices (Selection Rules) */}
          {promotion.rules && promotion.rules.length > 0 && (
            <div className="promo-modal-rules">
              <div className="promo-section-header">
                <span className="promo-section-title">
                  <Flame size={14} color="var(--cnm-orange)" />
                  1. CHOOSE YOUR FLAVOURS &amp; OPTIONS
                </span>
              </div>

              {promotion.rules.map((rule) => {
                const selectedIds = selectedByRule[rule.id] || [];
                const isSatisfied = selectedIds.length >= rule.minSelections;

                return (
                  <div key={rule.id} className="promo-rule-card">
                    <div className="promo-rule-header">
                      <div>
                        <h3 className="promo-rule-title">{rule.ruleLabel}</h3>
                        <span className="promo-rule-sub">
                          {rule.maxSelections === 1
                            ? "Select 1 option"
                            : `Select up to ${rule.maxSelections} options`}
                        </span>
                      </div>
                      {rule.required && (
                        <span
                          className={`promo-rule-badge ${
                            isSatisfied ? "badge-satisfied" : "badge-required"
                          }`}
                        >
                          {isSatisfied ? "SELECTED" : "REQUIRED"}
                        </span>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="promo-options-grid">
                      {rule.options.map((opt) => {
                        const isSelected = selectedIds.includes(opt.id);
                        const isFixed = rule.ruleType === "fixed_item";

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isFixed}
                            onClick={() => handleToggleOption(rule, opt)}
                            className={`promo-option-btn ${isSelected ? "selected" : ""}`}
                          >
                            <div className="promo-option-left">
                              <div className={`promo-checkbox ${isSelected ? "checked" : ""}`}>
                                {isSelected && <Check size={12} />}
                              </div>
                              <span className="promo-option-text">{opt.optionTitle}</span>
                            </div>

                            {opt.priceAdjustmentPkr > 0 && (
                              <span className="promo-option-price">
                                +{opt.priceAdjustmentPkr} PKR
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Optional Extras & Add-ons */}
          <div className="promo-extras-section">
            <div className="promo-section-header">
              <span className="promo-section-title">
                <Utensils size={14} color="var(--cnm-orange)" />
                2. EXTRAS &amp; ADD-ONS (OPTIONAL)
              </span>
              <span className="promo-section-sub">Customize your meal</span>
            </div>

            <div className="promo-extras-grid">
              {PROMOTION_EXTRAS.map((extra) => {
                const isSelected = selectedExtras.some((e) => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={`promo-extra-btn ${isSelected ? "selected" : ""}`}
                  >
                    <div className="promo-extra-checkbox">
                      {isSelected ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                    </div>
                    <span className="promo-extra-name">{extra.name}</span>
                    <span className="promo-extra-price">+{extra.pricePkr} PKR</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Special Instructions / Kitchen Notes */}
          <div className="promo-instructions-section">
            <div className="promo-section-header">
              <span className="promo-section-title">
                📝 3. SPECIAL INSTRUCTIONS / NOTES
              </span>
              <span className="promo-section-sub">Optional kitchen requests</span>
            </div>

            {/* Quick Preset Chips */}
            <div className="promo-chips-row">
              {PRESET_KITCHEN_NOTES.map((chip) => {
                const isSelected = selectedInstructionChips.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleInstructionChip(chip)}
                    className={`promo-chip-btn ${isSelected ? "selected" : ""}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Freeform Notes Input */}
            <input
              type="text"
              placeholder="e.g. Extra napkins, less spicy, call before delivery..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              maxLength={150}
              className="promo-notes-input"
            />
          </div>

          {/* Terms & Conditions */}
          {promotion.termsText && (
            <div className="promo-modal-terms">
              <strong>Terms:</strong> {promotion.termsText}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="promo-modal-footer">
          {validationError && (
            <div className="promo-modal-error">
              <AlertCircle size={13} /> {validationError}
            </div>
          )}

          <div className="promo-modal-footer-row">
            {/* Quantity Stepper */}
            <div className="promo-qty-stepper">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="promo-qty-btn"
              >
                <Minus size={14} />
              </button>
              <span className="promo-qty-val">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                aria-label="Increase quantity"
                className="promo-qty-btn"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              type="button"
              onClick={handleAddDeal}
              className="btn btn-primary promo-add-cart-btn"
            >
              <ShoppingBag size={15} />
              <span>Add Deal to Cart</span>
              <span className="promo-footer-total">
                · {finalTotalPkr.toLocaleString()} PKR
              </span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .promo-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(5px);
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .promo-modal-backdrop {
            align-items: center;
            padding: 20px;
          }
        }
        .promo-modal-content {
          position: relative;
          background: var(--cnm-surface);
          width: 100%;
          max-width: 580px;
          max-height: 88vh;
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: var(--radius-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--cnm-border);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .promo-modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: background 0.15s ease;
        }
        .promo-modal-close:hover {
          background: rgba(0, 0, 0, 0.85);
        }
        .promo-modal-scrollable {
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .promo-modal-banner-frame {
          position: relative;
          width: 100%;
          padding-top: 33.33%; /* 3:1 Banner Aspect Ratio */
          background: #141414;
          overflow: hidden;
        }
        .promo-modal-banner {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .promo-modal-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          border: 1px solid rgba(255, 130, 67, 0.4);
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }
        .promo-modal-info {
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--cnm-border);
        }
        .promo-modal-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }
        .promo-modal-title {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 750;
          color: var(--cnm-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .promo-modal-price-pill {
          display: flex;
          align-items: baseline;
          gap: 3px;
          background: rgba(255, 130, 67, 0.12);
          border: 1px solid rgba(255, 130, 67, 0.3);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }
        .promo-modal-price {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 800;
          color: var(--cnm-orange);
        }
        .promo-modal-currency {
          font-size: 10px;
          font-weight: 800;
          color: var(--cnm-orange);
        }
        .promo-modal-desc {
          font-size: 13px;
          color: var(--cnm-text-muted);
          margin: 0 0 10px;
          line-height: 1.4;
        }
        .promo-modal-notice {
          font-size: 11.5px;
          background: rgba(255, 130, 67, 0.08);
          border: 1px solid rgba(255, 130, 67, 0.25);
          color: var(--cnm-text-primary);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          line-height: 1.4;
        }
        .promo-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .promo-section-title {
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 800;
          color: var(--cnm-orange);
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .promo-section-sub {
          font-size: 11px;
          color: var(--cnm-text-muted);
          font-weight: 600;
        }
        .promo-modal-rules {
          padding: 16px 18px 4px;
        }
        .promo-rule-card {
          background: var(--cnm-surface-elevated);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .promo-rule-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .promo-rule-title {
          font-size: 13px;
          font-weight: 750;
          color: var(--cnm-text-primary);
          margin: 0 0 2px;
        }
        .promo-rule-sub {
          font-size: 11px;
          color: var(--cnm-text-muted);
        }
        .promo-rule-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          letter-spacing: 0.04em;
        }
        .badge-required {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-satisfied {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .promo-options-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .promo-option-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: var(--radius-sm);
          background: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
        }
        .promo-option-btn:hover:not(:disabled) {
          border-color: var(--cnm-orange);
          background: rgba(255, 130, 67, 0.04);
        }
        .promo-option-btn.selected {
          border-color: var(--cnm-orange);
          background: rgba(255, 130, 67, 0.08);
        }
        .promo-option-btn:disabled {
          cursor: default;
          opacity: 0.85;
        }
        .promo-option-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .promo-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid var(--cnm-border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .promo-checkbox.checked {
          background: var(--cnm-orange);
          border-color: var(--cnm-orange);
          color: #ffffff;
        }
        .promo-option-text {
          font-size: 12.5px;
          font-weight: 650;
          color: var(--cnm-text-primary);
        }
        .promo-option-price {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--cnm-orange);
        }
        .promo-extras-section {
          padding: 12px 18px 14px;
          border-top: 1px solid var(--cnm-border);
        }
        .promo-extras-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        @media (max-width: 420px) {
          .promo-extras-grid {
            grid-template-columns: 1fr;
          }
        }
        .promo-extra-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          background: var(--cnm-surface-elevated);
          border: 1.5px solid var(--cnm-border);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .promo-extra-btn:hover {
          border-color: var(--cnm-orange);
        }
        .promo-extra-btn.selected {
          border-color: var(--cnm-orange);
          background: rgba(255, 130, 67, 0.1);
        }
        .promo-extra-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid var(--cnm-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--cnm-surface);
        }
        .promo-extra-btn.selected .promo-extra-checkbox {
          background: var(--cnm-orange);
          border-color: var(--cnm-orange);
        }
        .promo-extra-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--cnm-text-primary);
          flex: 1;
        }
        .promo-extra-price {
          font-size: 11px;
          font-weight: 800;
          color: var(--cnm-orange);
          white-space: nowrap;
        }
        .promo-instructions-section {
          padding: 12px 18px 16px;
          border-top: 1px solid var(--cnm-border);
        }
        .promo-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .promo-chip-btn {
          padding: 5px 11px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          background: var(--cnm-surface-elevated);
          border: 1px solid var(--cnm-border);
          color: var(--cnm-text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .promo-chip-btn:hover {
          border-color: var(--cnm-orange);
        }
        .promo-chip-btn.selected {
          background: var(--cnm-orange);
          border-color: var(--cnm-orange);
          color: #ffffff;
        }
        .promo-notes-input {
          width: 100%;
          background: var(--cnm-surface-elevated);
          border: 1px solid var(--cnm-border);
          color: var(--cnm-text-primary);
          padding: 9px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .promo-notes-input:focus {
          border-color: var(--cnm-orange);
        }
        .promo-modal-terms {
          padding: 10px 18px 14px;
          font-size: 11px;
          color: var(--cnm-text-muted);
          border-top: 1px solid var(--cnm-border);
          line-height: 1.4;
        }
        .promo-modal-footer {
          padding: 14px 18px;
          background: var(--cnm-surface);
          border-top: 1px solid var(--cnm-border);
        }
        .promo-modal-error {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #ef4444;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .promo-modal-footer-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .promo-qty-stepper {
          display: flex;
          align-items: center;
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-sm);
          background: var(--cnm-surface-elevated);
        }
        .promo-qty-btn {
          width: 34px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--cnm-text-primary);
          cursor: pointer;
        }
        .promo-qty-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .promo-qty-val {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 800;
          min-width: 24px;
          text-align: center;
          color: var(--cnm-text-primary);
        }
        .promo-add-cart-btn {
          flex: 1;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: var(--font-display);
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.02em;
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-cta);
        }
        .promo-footer-total {
          font-weight: 800;
          opacity: 0.95;
        }
      `}</style>
    </div>
  );
}
