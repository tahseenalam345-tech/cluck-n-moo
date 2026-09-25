"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Product, Category, CartItem } from "@/types";
import { calculateCustomDealDiscount, TIER_1_THRESHOLD_PKR, TIER_2_THRESHOLD_PKR } from "@/lib/customDeal";
import { ProductImage } from "./ProductImage";
import { ItemCustomizerModal } from "./ItemCustomizerModal";
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
      <div
        className="card byo-deal-modal"
        style={{
          width: "100%",
          maxWidth: "1050px",
          height: "92vh",
          maxHeight: "900px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          position: "relative",
        }}
      >
        {/* 1. Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--cnm-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--cnm-surface-elevated)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--cnm-orange)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "14px",
                letterSpacing: "-0.02em",
              }}
            >
              CNM
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--cnm-text-primary)",
                    margin: 0,
                  }}
                >
                  Build Your Own Deal
                </h2>
                <span
                  className="badge badge-orange"
                  style={{ fontSize: "10px", padding: "2px 8px", fontWeight: 700 }}
                >
                  SAVE UP TO 10%
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--cnm-text-muted)", margin: 0 }}>
                Pick your favorites and unlock automatic bundle savings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close deal builder"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-primary)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Interactive Discount Progress Meter */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "rgba(255, 130, 67, 0.05)",
            borderBottom: "1px solid var(--cnm-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>
                {dealDiscount.discountPercent > 0 ? "🔥" : "✨"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                {dealDiscount.tier === "TIER_2_10_PERCENT"
                  ? "🎉 MAXIMUM 10% DISCOUNT UNLOCKED!"
                  : dealDiscount.tier === "TIER_1_5_PERCENT"
                  ? "🔥 5% DISCOUNT UNLOCKED!"
                  : "Bundle items to unlock 5% or 10% OFF"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "13px" }}>
              <div>
                <span style={{ color: "var(--cnm-text-muted)" }}>Deal Subtotal: </span>
                <span style={{ fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                  {dealSubtotal.toLocaleString()} PKR
                </span>
              </div>
              {dealDiscount.discountPkr > 0 && (
                <div>
                  <span style={{ color: "var(--status-ready)" }}>You Save: </span>
                  <span style={{ fontWeight: 800, color: "var(--status-ready)" }}>
                    -{dealDiscount.discountPkr.toLocaleString()} PKR ({dealDiscount.discountPercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--cnm-border)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${dealDiscount.progressPercentToNextTier}%`,
                height: "100%",
                background:
                  dealDiscount.discountPercent === 10
                    ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(90deg, #ff8243 0%, #ff5722 100%)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              fontSize: "11px",
              color: "var(--cnm-text-muted)",
            }}
          >
            <span>0 PKR</span>
            <span
              style={{
                color: dealSubtotal >= TIER_1_THRESHOLD_PKR ? "var(--cnm-orange)" : "inherit",
                fontWeight: dealSubtotal >= TIER_1_THRESHOLD_PKR ? 700 : 400,
              }}
            >
              2,500 PKR (5% OFF)
            </span>
            <span
              style={{
                color: dealSubtotal >= TIER_2_THRESHOLD_PKR ? "var(--status-ready)" : "inherit",
                fontWeight: dealSubtotal >= TIER_2_THRESHOLD_PKR ? 700 : 400,
              }}
            >
              3,500 PKR (10% OFF)
            </span>
          </div>

          {dealDiscount.amountNeededForNextThreshold > 0 && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--cnm-orange)",
                fontWeight: 600,
                marginTop: "4px",
                marginBottom: 0,
              }}
            >
              Add {dealDiscount.amountNeededForNextThreshold.toLocaleString()} PKR more to unlock{" "}
              {dealDiscount.nextDiscountPercent}% OFF!
            </p>
          )}
        </div>

        {/* 3. Search & Category Filter Bar */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--cnm-border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            backgroundColor: "var(--cnm-surface)",
          }}
        >
          {/* Search Field */}
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cnm-text-muted)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items to build your deal (burgers, pizzas, wings...)"
              className="form-input"
              style={{
                paddingLeft: "36px",
                paddingRight: "14px",
                height: "38px",
                fontSize: "13px",
                borderRadius: "var(--radius-full)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips Scroll */}
          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "12px",
                fontWeight: 650,
                border: `1px solid ${selectedCategory === "all" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                backgroundColor: selectedCategory === "all" ? "var(--cnm-orange)" : "var(--cnm-surface-elevated)",
                color: selectedCategory === "all" ? "#fff" : "var(--cnm-text-primary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
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
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "12px",
                    fontWeight: 650,
                    border: `1px solid ${isSelected ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                    backgroundColor: isSelected ? "var(--cnm-orange)" : "var(--cnm-surface-elevated)",
                    color: isSelected ? "#fff" : "var(--cnm-text-primary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span>{emoji}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Product Catalog Grid (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            paddingBottom: dealTray.length > 0 ? "120px" : "20px",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cnm-text-muted)" }}>
              Loading CNM menu items...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ color: "var(--cnm-text-muted)", fontSize: "14px" }}>
                No dishes found matching &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              {filteredProducts.map((product) => {
                const hasVariants = product.variants && product.variants.length > 0;
                const startingPrice = hasVariants
                  ? Math.min(...product.variants.map((v) => v.pricePkr))
                  : product.basePricePkr;

                // Check how many of this product are in the deal tray
                const qtyInTray = dealTray
                  .filter((i) => i.productId === product.id)
                  .reduce((acc, i) => acc + i.quantity, 0);

                return (
                  <div
                    key={product.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--cnm-surface-elevated)",
                      border: "1px solid var(--cnm-border)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div>
                      {/* Image */}
                      <div
                        style={{
                          width: "100%",
                          height: "120px",
                          borderRadius: "var(--radius-sm)",
                          overflow: "hidden",
                          marginBottom: "10px",
                          position: "relative",
                        }}
                      >
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          aspectRatio="16/9"
                          target="card"
                        />
                        {qtyInTray > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              backgroundColor: "var(--cnm-orange)",
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: "11px",
                              borderRadius: "var(--radius-full)",
                              padding: "2px 7px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                            }}
                          >
                            {qtyInTray} added
                          </div>
                        )}
                      </div>

                      {/* Title & Price */}
                      <h4
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "var(--cnm-text-primary)",
                          marginBottom: "4px",
                          lineHeight: 1.25,
                        }}
                      >
                        {product.name}
                      </h4>
                      <p
                        style={{
                          fontSize: "11.5px",
                          color: "var(--cnm-text-muted)",
                          marginBottom: "8px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.3,
                        }}
                      >
                        {product.description || "Freshly handcrafted Cluck N Moo offering"}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "6px",
                        borderTop: "1px solid var(--cnm-border)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--cnm-orange)",
                        }}
                      >
                        {hasVariants ? `From ${startingPrice}` : `${startingPrice}`} PKR
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "var(--cnm-orange)",
                          color: "#fff",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={13} />
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
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "var(--cnm-surface-elevated)",
              borderTop: "2px solid var(--cnm-orange)",
              boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.4)",
              zIndex: 10,
            }}
          >
            {/* Collapsible item list tray */}
            {isTrayExpanded && (
              <div
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--cnm-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  backgroundColor: "var(--cnm-surface)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--cnm-text-muted)" }}>
                    CUSTOM DEAL ITEMS ({totalItemCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => setDealTray([])}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "11.5px",
                      color: "var(--status-cancelled)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Clear Tray
                  </button>
                </div>

                {dealTray.map((item) => (
                  <div
                    key={item.cartItemId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      backgroundColor: "var(--cnm-surface-elevated)",
                      border: "1px solid var(--cnm-border)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: "10px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                        {item.productName}
                        {item.variantName && (
                          <span style={{ color: "var(--cnm-orange)", fontWeight: 600, marginLeft: "6px" }}>
                            ({item.variantName})
                          </span>
                        )}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                          + {item.modifiers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--cnm-text-primary)" }}>
                        {item.lineTotalPkr.toLocaleString()} PKR
                      </span>

                      {/* Quantity Adjusters */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          backgroundColor: "var(--cnm-surface)",
                          border: "1px solid var(--cnm-border)",
                          borderRadius: "var(--radius-full)",
                          padding: "2px 6px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateTrayQuantity(item.cartItemId, item.quantity - 1)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cnm-text-primary)",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        >
                          {item.quantity === 1 ? <Trash2 size={13} color="var(--status-cancelled)" /> : <Minus size={13} />}
                        </button>
                        <span style={{ fontSize: "12px", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTrayQuantity(item.cartItemId, item.quantity + 1)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cnm-text-primary)",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tray Summary & Primary Action Bar */}
            <div
              style={{
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setIsTrayExpanded(!isTrayExpanded)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  color: "var(--cnm-text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 650,
                  padding: 0,
                }}
              >
                <span>
                  {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Deal
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: isTrayExpanded ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--cnm-text-muted)" }}>
                    {dealDiscount.discountPkr > 0 ? (
                      <>
                        <span style={{ textDecoration: "line-through", marginRight: "6px" }}>
                          {dealSubtotal.toLocaleString()} PKR
                        </span>
                        <span style={{ color: "var(--status-ready)", fontWeight: 700 }}>
                          -{dealDiscount.discountPkr.toLocaleString()} PKR
                        </span>
                      </>
                    ) : (
                      "Deal Subtotal"
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "17px",
                      fontWeight: 850,
                      color: "var(--cnm-text-primary)",
                    }}
                  >
                    {dealDiscount.finalTotalPkr.toLocaleString()} PKR
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitDealToCart}
                  className="btn btn-primary"
                  style={{
                    padding: "10px 20px",
                    fontSize: "13.5px",
                    fontWeight: 750,
                    borderRadius: "var(--radius-full)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ShoppingBag size={16} />
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
            height: 95vh !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            animation: dealSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }
      `}</style>
    </div>
  );
}
