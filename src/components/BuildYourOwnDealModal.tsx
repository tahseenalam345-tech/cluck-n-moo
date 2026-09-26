"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Product, Category, CartItem } from "@/types";
import { calculateCustomDealDiscount, TIER_1_THRESHOLD_PKR, TIER_2_THRESHOLD_PKR } from "@/lib/customDeal";
import { ProductImage } from "./ProductImage";
import { ItemCustomizerModal } from "./ItemCustomizerModal";
import { DealMilestoneCelebration } from "./DealMilestoneCelebration";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ShoppingBag,
  Flame,
  Check,
  ChevronDown,
} from "lucide-react";
import { getCategoryEmoji } from "@/lib/categoryEmojis";

interface BuildYourOwnDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDealToCart: (dealItems: CartItem[]) => void;
}

export function BuildYourOwnDealModal({
  isOpen,
  onClose,
  onAddDealToCart,
}: BuildYourOwnDealModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Custom deal tray state
  const [dealTray, setDealTray] = useState<CartItem[]>([]);
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  // Fetch full active menu
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch("/api/v1/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.categories) {
          setCategories(data.data.categories);
        }
      })
      .catch((err) => console.error("Failed to load menu for custom deal:", err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  // Flatten all available products
  const allProducts = useMemo(() => {
    return categories.flatMap((c) => c.products || []).filter((p) => p.isAvailable === 1);
  }, [categories]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allProducts.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allProducts, selectedCategory, searchQuery]);

  // Live Deal Calculations
  const dealSubtotal = dealTray.reduce((acc, item) => acc + item.lineTotalPkr, 0);
  const dealDiscount = calculateCustomDealDiscount(dealSubtotal);
  const totalItemCount = dealTray.reduce((acc, item) => acc + item.quantity, 0);

  // Celebration state & milestone tracking
  const [celebratingMilestone, setCelebratingMilestone] = useState<"5%" | "10%" | null>(null);
  const celebratedTiersRef = useRef<Set<string>>(new Set(["NONE"]));
  const prevTierRef = useRef<string>("NONE");

  useEffect(() => {
    if (!isOpen) {
      setCelebratingMilestone(null);
      celebratedTiersRef.current = new Set(["NONE"]);
      prevTierRef.current = "NONE";
      return;
    }

    const currentTier = dealDiscount.tier;
    if (currentTier !== prevTierRef.current) {
      if (currentTier === "TIER_1_5_PERCENT" && !celebratedTiersRef.current.has("TIER_1_5_PERCENT")) {
        celebratedTiersRef.current.add("TIER_1_5_PERCENT");
        setCelebratingMilestone("5%");
      } else if (currentTier === "TIER_2_10_PERCENT" && !celebratedTiersRef.current.has("TIER_2_10_PERCENT")) {
        celebratedTiersRef.current.add("TIER_2_10_PERCENT");
        setCelebratingMilestone("10%");
      }
      prevTierRef.current = currentTier;
    }
  }, [dealDiscount.tier, isOpen]);

  // Reset milestone memory if customer empties deal tray
  useEffect(() => {
    if (dealTray.length === 0) {
      celebratedTiersRef.current = new Set(["NONE"]);
      prevTierRef.current = "NONE";
    }
  }, [dealTray.length]);

  if (!isOpen) return null;

  // Add product to deal tray
  const handleSelectProduct = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasModifiers = product.modifierGroups && product.modifierGroups.length > 0;

    if (hasVariants || hasModifiers) {
      setCustomizingProduct(product);
    } else {
      // Direct add
      const existingIdx = dealTray.findIndex(
        (i) => i.productId === product.id && !i.variantId && (!i.modifiers || i.modifiers.length === 0)
      );

      if (existingIdx > -1) {
        setDealTray((prev) => {
          const updated = [...prev];
          const newQty = updated[existingIdx].quantity + 1;
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            lineTotalPkr: updated[existingIdx].unitPricePkr * newQty,
          };
          return updated;
        });
      } else {
        const newItem: CartItem = {
          cartItemId: `deal_item_${product.id}_${Date.now()}`,
          productId: product.id,
          productName: product.name,
          unitPricePkr: product.basePricePkr,
          quantity: 1,
          modifiers: [],
          lineTotalPkr: product.basePricePkr,
        };
        setDealTray((prev) => [...prev, newItem]);
      }
    }
  };

  const handleCustomizedItemAdd = (item: CartItem) => {
    setDealTray((prev) => [...prev, item]);
    setCustomizingProduct(null);
  };

  const handleUpdateTrayQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setDealTray((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setDealTray((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId
            ? { ...i, quantity: newQty, lineTotalPkr: i.unitPricePkr * newQty }
            : i
        )
      );
    }
  };

  const handleCommitDealToCart = () => {
    if (dealTray.length === 0) return;
    const dealGroupId = `deal_${Date.now()}`;
    const taggedItems = dealTray.map((item) => ({
      ...item,
      customDealId: dealGroupId,
    }));
    onAddDealToCart(taggedItems);
    setDealTray([]);
    onClose();
  };

  return (
    <div
      className="byo-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="card byo-deal-modal">
        {/* Celebration Overlay — subtle, brief fireworks/confetti on actual milestones */}
        <DealMilestoneCelebration
          milestone={celebratingMilestone}
          onComplete={() => setCelebratingMilestone(null)}
        />

        {/* 1. Modal Header (Slimmed for Mobile) */}
        <div className="byo-modal-header">
          <div className="byo-header-left">
            <div className="byo-cnm-badge">
              CNM
            </div>
            <div>
              <div className="byo-title-row">
                <h2 className="byo-modal-title">
                  Build Your Own Deal
                </h2>
                <span className="badge badge-orange byo-save-badge">
                  SAVE UP TO 10%
                </span>
              </div>
              <p className="byo-modal-subtitle">
                Pick your favorites and unlock automatic bundle savings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close deal builder"
            className="byo-close-btn"
          >
            <X size={17} />
          </button>
        </div>

        {/* 2. Interactive Discount Progress Meter (Compact) */}
        <div className="byo-progress-meter">
          <div className="byo-progress-meta-row">
            <div className="byo-progress-status">
              <span>{dealDiscount.discountPercent > 0 ? "🔥" : "✨"}</span>
              <span className="byo-status-text">
                {dealDiscount.tier === "TIER_2_10_PERCENT"
                  ? "MAX 10% DISCOUNT UNLOCKED!"
                  : dealDiscount.tier === "TIER_1_5_PERCENT"
                  ? "5% DISCOUNT UNLOCKED!"
                  : "Bundle items to unlock 5% or 10% OFF"}
              </span>
            </div>

            <div className="byo-progress-totals">
              <div>
                <span className="byo-muted-label">Subtotal: </span>
                <span className="byo-bold-val">{dealSubtotal.toLocaleString()} PKR</span>
              </div>
              {dealDiscount.discountPkr > 0 && (
                <div>
                  <span className="byo-savings-label">Saved: </span>
                  <span className="byo-savings-val">
                    -{dealDiscount.discountPkr.toLocaleString()} PKR ({dealDiscount.discountPercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="byo-track-wrap">
            <div
              className="byo-track-fill"
              style={{
                width: `${dealDiscount.progressPercentToNextTier}%`,
                background:
                  dealDiscount.discountPercent === 10
                    ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(90deg, #ff8243 0%, #ea580c 100%)",
              }}
            />
          </div>

          <div className="byo-milestone-ticks">
            <span>0 PKR</span>
            <span
              style={{
                color: dealSubtotal >= TIER_1_THRESHOLD_PKR ? "var(--cnm-orange)" : "inherit",
                fontWeight: dealSubtotal >= TIER_1_THRESHOLD_PKR ? 800 : 500,
              }}
            >
              2,500 PKR (5% OFF)
            </span>
            <span
              style={{
                color: dealSubtotal >= TIER_2_THRESHOLD_PKR ? "var(--status-ready)" : "inherit",
                fontWeight: dealSubtotal >= TIER_2_THRESHOLD_PKR ? 800 : 500,
              }}
            >
              3,500 PKR (10% OFF)
            </span>
          </div>

          {dealDiscount.amountNeededForNextThreshold > 0 && (
            <p className="byo-needed-hint">
              Add {dealDiscount.amountNeededForNextThreshold.toLocaleString()} PKR more to unlock{" "}
              {dealDiscount.nextDiscountPercent}% OFF!
            </p>
          )}
        </div>

        {/* 3. Search & Category Filter Bar (Compact Pills) */}
        <div className="byo-filter-bar">
          {/* Search Field */}
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cnm-text-muted)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items to build deal (burgers, wings...)"
              className="form-input byo-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Chips Scroll - Significantly smaller & compact with accessible touch area */}
          <div className="byo-category-scroll no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`byo-category-pill ${selectedCategory === "all" ? "active" : ""}`}
            >
              <span>✨</span>
              <span>ALL ITEMS</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const emoji = getCategoryEmoji(cat.name || cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`byo-category-pill ${isSelected ? "active" : ""}`}
                >
                  <span>{emoji}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Product Catalog Grid (Compact 2-Column Mobile Grid) */}
        <div
          className="byo-catalog-container"
          style={{
            paddingBottom: dealTray.length > 0 ? "130px" : "24px",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "var(--cnm-text-muted)", fontSize: "13px" }}>
              Loading CNM menu items...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "var(--cnm-text-muted)", fontSize: "13.5px" }}>
                No dishes found matching &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            <div className="byo-catalog-grid">
              {filteredProducts.map((product) => {
                const hasVariants = product.variants && product.variants.length > 0;
                const startingPrice = hasVariants
                  ? Math.min(...product.variants.map((v) => v.pricePkr))
                  : product.basePricePkr;

                const qtyInTray = dealTray
                  .filter((i) => i.productId === product.id)
                  .reduce((acc, i) => acc + i.quantity, 0);

                return (
                  <div
                    key={product.id}
                    className="card byo-item-card"
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="byo-item-image-frame">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          aspectRatio="16/10"
                          target="card"
                        />
                        {qtyInTray > 0 && (
                          <div className="byo-item-qty-badge">
                            {qtyInTray} in deal
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="byo-item-card-title">
                        {product.name}
                      </h4>
                      <p className="byo-item-card-desc">
                        {product.description || "Freshly handcrafted Cluck N Moo offering"}
                      </p>
                    </div>

                    {/* Bottom Price & Action */}
                    <div className="byo-item-card-footer">
                      <span className="byo-item-price">
                        {hasVariants ? `From ${startingPrice}` : `${startingPrice}`} <span className="pkr-text">PKR</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="byo-item-add-btn"
                        aria-label={`Add ${product.name} to deal`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>{hasVariants ? "Choose" : "Add"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Floating Custom Deal Tray / Footer Bar */}
        {dealTray.length > 0 && (
          <div className="byo-bottom-tray">
            {/* Collapsible item list tray */}
            {isTrayExpanded && (
              <div className="byo-expanded-tray">
                <div className="byo-expanded-header">
                  <span className="byo-expanded-title">
                    CUSTOM DEAL ITEMS ({totalItemCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => setDealTray([])}
                    className="byo-clear-tray-btn"
                  >
                    Clear Tray
                  </button>
                </div>

                {dealTray.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="byo-tray-item-row"
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                        {item.productName}
                        {item.variantName && (
                          <span style={{ color: "var(--cnm-orange)", fontWeight: 600, marginLeft: "4px" }}>
                            ({item.variantName})
                          </span>
                        )}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: "10.5px", color: "var(--cnm-text-muted)" }}>
                          + {item.modifiers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--cnm-text-primary)", whiteSpace: "nowrap" }}>
                        {item.lineTotalPkr.toLocaleString()} PKR
                      </span>

                      {/* Quantity Adjusters */}
                      <div className="byo-qty-adjuster">
                        <button
                          type="button"
                          onClick={() => handleUpdateTrayQuantity(item.cartItemId, item.quantity - 1)}
                          className="byo-qty-btn"
                          aria-label="Decrease quantity"
                        >
                          {item.quantity === 1 ? <Trash2 size={12} color="var(--status-cancelled)" /> : <Minus size={12} />}
                        </button>
                        <span className="byo-qty-num">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTrayQuantity(item.cartItemId, item.quantity + 1)}
                          className="byo-qty-btn"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tray Summary & Primary Action Bar */}
            <div className="byo-tray-action-bar">
              <button
                type="button"
                onClick={() => setIsTrayExpanded(!isTrayExpanded)}
                className="byo-tray-toggle-btn"
              >
                <span>
                  {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Deal
                </span>
                <ChevronDown
                  size={15}
                  style={{
                    transform: isTrayExpanded ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              <div className="byo-tray-right-wrap">
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10.5px", color: "var(--cnm-text-muted)" }}>
                    {dealDiscount.discountPkr > 0 ? (
                      <>
                        <span style={{ textDecoration: "line-through", marginRight: "4px" }}>
                          {dealSubtotal.toLocaleString()} PKR
                        </span>
                        <span style={{ color: "var(--status-ready)", fontWeight: 750 }}>
                          -{dealDiscount.discountPkr.toLocaleString()} PKR
                        </span>
                      </>
                    ) : (
                      "Deal Subtotal"
                    )}
                  </div>
                  <div className="byo-tray-final-price">
                    {dealDiscount.finalTotalPkr.toLocaleString()} <span className="pkr-currency-tag">PKR</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitDealToCart}
                  className="btn btn-primary byo-add-deal-btn"
                >
                  <ShoppingBag size={15} />
                  <span>Add Deal to Cart</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Product Customizer Sub-Modal */}
        {customizingProduct && (
          <ItemCustomizerModal
            product={customizingProduct}
            onClose={() => setCustomizingProduct(null)}
            onAddToCart={handleCustomizedItemAdd}
          />
        )}
      </div>

      <style jsx>{`
        .byo-deal-modal {
          width: 100%;
          maxWidth: 1050px;
          height: 92vh;
          maxHeight: 900px;
          display: flex;
          flex-direction: column;
          background-color: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          position: relative;
        }

        .byo-modal-header {
          padding: 12px 18px;
          border-bottom: 1px solid var(--cnm-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--cnm-surface-elevated);
          flex-shrink: 0;
        }

        .byo-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .byo-cnm-badge {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background-color: var(--cnm-orange);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }

        .byo-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .byo-modal-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          margin: 0;
          line-height: 1.2;
        }

        .byo-save-badge {
          font-size: 9.5px;
          padding: 2px 7px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .byo-modal-subtitle {
          font-size: 11.5px;
          color: var(--cnm-text-muted);
          margin: 2px 0 0;
          line-height: 1.3;
        }

        .byo-close-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          color: var(--cnm-text-primary);
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 0.15s ease;
        }

        .byo-progress-meter {
          padding: 10px 18px;
          background-color: rgba(255, 130, 67, 0.05);
          border-bottom: 1px solid var(--cnm-border);
          flex-shrink: 0;
        }

        .byo-progress-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .byo-progress-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .byo-status-text {
          font-size: 12px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          letter-spacing: 0.01em;
        }

        .byo-progress-totals {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }

        .byo-muted-label {
          color: var(--cnm-text-muted);
        }

        .byo-bold-val {
          font-weight: 750;
          color: var(--cnm-text-primary);
        }

        .byo-savings-label {
          color: var(--status-ready);
        }

        .byo-savings-val {
          font-weight: 800;
          color: var(--status-ready);
        }

        .byo-track-wrap {
          width: 100%;
          height: 6px;
          background-color: var(--cnm-border);
          border-radius: var(--radius-full);
          overflow: hidden;
          position: relative;
        }

        .byo-track-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .byo-milestone-ticks {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          font-size: 10.5px;
          color: var(--cnm-text-muted);
        }

        .byo-needed-hint {
          font-size: 11px;
          color: var(--cnm-orange);
          font-weight: 700;
          margin-top: 3px;
          margin-bottom: 0;
        }

        .byo-filter-bar {
          padding: 8px 18px;
          border-bottom: 1px solid var(--cnm-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-color: var(--cnm-surface);
          flex-shrink: 0;
        }

        .byo-search-input {
          padding-left: 32px;
          padding-right: 12px;
          height: 32px;
          font-size: 12px;
          border-radius: var(--radius-full);
        }

        .byo-category-scroll {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .byo-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--cnm-border);
          background-color: var(--cnm-surface-elevated);
          color: var(--cnm-text-primary);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          min-height: 28px;
          transition: all 0.15s ease;
        }

        .byo-category-pill.active {
          border-color: var(--cnm-orange);
          background-color: var(--cnm-orange);
          color: #ffffff;
        }

        .byo-catalog-container {
          flex: 1;
          overflow-y: auto;
          padding: 14px 18px;
        }

        .byo-catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }

        .byo-item-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px;
          border-radius: var(--radius-md);
          background-color: var(--cnm-surface-elevated);
          border: 1px solid var(--cnm-border);
          transition: transform 0.15s ease;
        }

        .byo-item-image-frame {
          width: 100%;
          height: 110px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          margin-bottom: 7px;
          position: relative;
        }

        .byo-item-qty-badge {
          position: absolute;
          top: 5px;
          right: 5px;
          background-color: var(--cnm-orange);
          color: #ffffff;
          font-weight: 800;
          font-size: 10px;
          border-radius: var(--radius-full);
          padding: 2px 7px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          z-index: 2;
        }

        .byo-item-card-title {
          font-size: 13px;
          font-weight: 750;
          color: var(--cnm-text-primary);
          margin-bottom: 2px;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .byo-item-card-desc {
          font-size: 11px;
          color: var(--cnm-text-muted);
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }

        .byo-item-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1px solid var(--cnm-border);
          gap: 6px;
        }

        .byo-item-price {
          font-family: var(--font-display);
          font-size: 12.5px;
          font-weight: 800;
          color: var(--cnm-orange);
          white-space: nowrap;
        }

        .pkr-text {
          font-size: 10px;
          font-weight: 700;
        }

        .byo-item-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background-color: var(--cnm-orange);
          color: #ffffff;
          border: none;
          padding: 4px 9px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.12s ease;
        }

        .byo-item-add-btn:active {
          transform: scale(0.96);
        }

        .byo-bottom-tray {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--cnm-surface-elevated);
          border-top: 2px solid var(--cnm-orange);
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4);
          z-index: 10;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .byo-expanded-tray {
          max-height: 200px;
          overflow-y: auto;
          padding: 10px 16px;
          border-bottom: 1px solid var(--cnm-border);
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--cnm-surface);
        }

        .byo-expanded-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .byo-expanded-title {
          font-size: 11px;
          font-weight: 800;
          color: var(--cnm-text-muted);
          letter-spacing: 0.04em;
        }

        .byo-clear-tray-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: var(--status-cancelled);
          cursor: pointer;
          font-weight: 700;
        }

        .byo-tray-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 9px;
          background-color: var(--cnm-surface-elevated);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-sm);
        }

        .byo-qty-adjuster {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background-color: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-full);
          padding: 2px 5px;
        }

        .byo-qty-btn {
          background: none;
          border: none;
          color: var(--cnm-text-primary);
          cursor: pointer;
          padding: 1px;
          display: flex;
          align-items: center;
        }

        .byo-qty-num {
          font-size: 11.5px;
          font-weight: 800;
          min-width: 14px;
          text-align: center;
        }

        .byo-tray-action-bar {
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .byo-tray-toggle-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: var(--cnm-text-primary);
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 700;
          padding: 0;
        }

        .byo-tray-right-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }

        .byo-tray-final-price {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 900;
          color: var(--cnm-text-primary);
          line-height: 1.1;
        }

        .pkr-currency-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--cnm-orange);
        }

        .byo-add-deal-btn {
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 800;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        @keyframes dealSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .byo-backdrop {
            align-items: flex-end !important;
          }
          :global(.byo-deal-modal) {
            max-width: 100% !important;
            height: 94vh !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            animation: dealSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .byo-modal-header {
            padding: 9px 12px;
          }
          .byo-cnm-badge {
            width: 26px;
            height: 26px;
            font-size: 11px;
          }
          .byo-modal-title {
            font-size: 14.5px;
          }
          .byo-modal-subtitle {
            display: none;
          }
          .byo-close-btn {
            width: 29px;
            height: 29px;
          }
          .byo-progress-meter {
            padding: 7px 12px;
          }
          .byo-status-text {
            font-size: 11px;
          }
          .byo-progress-totals {
            font-size: 11px;
            gap: 8px;
          }
          .byo-filter-bar {
            padding: 7px 12px;
            gap: 6px;
          }
          .byo-catalog-container {
            padding: 8px 10px;
          }
          /* COMPACT 2-COLUMN MOBILE GRID */
          .byo-catalog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .byo-item-card {
            padding: 6px;
          }
          .byo-item-image-frame {
            height: 74px !important;
            margin-bottom: 5px;
          }
          .byo-item-qty-badge {
            font-size: 9px;
            padding: 1px 5px;
          }
          .byo-item-card-title {
            font-size: 11px !important;
            -webkit-line-clamp: 1 !important;
          }
          .byo-item-card-desc {
            font-size: 9.5px !important;
            margin-bottom: 4px;
          }
          .byo-item-price {
            font-size: 11px !important;
          }
          .byo-item-add-btn {
            padding: 3px 6px !important;
            font-size: 10px !important;
          }
          .byo-tray-action-bar {
            padding: 8px 12px;
            gap: 8px;
          }
          .byo-add-deal-btn {
            padding: 7px 12px;
            font-size: 11.5px;
          }
          .byo-tray-final-price {
            font-size: 14.5px;
          }
        }

        @media (max-width: 360px) {
          .byo-catalog-grid {
            gap: 6px !important;
          }
          .byo-item-image-frame {
            height: 66px !important;
          }
          .byo-category-pill {
            padding: 3px 7px !important;
            font-size: 10px !important;
          }
          .byo-tray-action-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
          }
          .byo-tray-right-wrap {
            margin-left: 0;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
