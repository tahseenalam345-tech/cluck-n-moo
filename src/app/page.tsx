"use client";

import React, { useEffect, useState, useRef } from "react";
import { Category, Product, CartItem, Promotion } from "@/types";
import { AppDownloadBanner } from "@/components/AppDownloadBanner";
import { CustomerHeader } from "@/components/CustomerHeader";
import { PromoCarousel } from "@/components/PromoCarousel";
import { OrderModeModal } from "@/components/OrderModeModal";
import { SignatureNavigationStrip } from "@/components/SignatureNavigationStrip";
import { MenuSearchBar } from "@/components/MenuSearchBar";
import { PopularPicksSection } from "@/components/PopularPicksSection";
import { PromotionsSection } from "@/components/PromotionsSection";
import { PromotionModal } from "@/components/PromotionModal";
import { ProductCard } from "@/components/ProductCard";
import { BrandStorySection } from "@/components/BrandStorySection";
import { ItemCustomizerModal } from "@/components/ItemCustomizerModal";
import { CartDrawer } from "@/components/CartDrawer";
import { CustomerFooter } from "@/components/CustomerFooter";
import { useOrderMode } from "@/context/OrderModeContext";
import { filterProductsBySignature, SIGNATURE_SECTIONS } from "@/lib/signatureSections";
import { getCategoryEmoji } from "@/lib/categoryEmojis";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function StorefrontPage() {
  const { modeState } = useOrderMode();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSignatureSlug, setActiveSignatureSlug] = useState<string>("menu");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamic header height so sticky elements align correctly
  const [headerHeight, setHeaderHeight] = useState(68);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerEl = document.getElementById("main-customer-header");
      if (headerEl) {
        setHeaderHeight(headerEl.offsetHeight);
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    let ro: ResizeObserver | null = null;
    const headerEl = document.getElementById("main-customer-header");
    if (headerEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateHeaderHeight);
      ro.observe(headerEl);
    }

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      ro?.disconnect();
    };
  }, []);

  const handleScrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 260;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Fetch full verified menu from API
  const fetchMenu = () => {
    setIsLoading(true);
    setLoadError(null);
    fetch("/api/v1/menu")
      .then((res) => {
        if (!res.ok) throw new Error("Server responded with error status: " + res.status);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories);
        } else {
          throw new Error(data.error?.message || "Failed to load categories");
        }
      })
      .catch((err) => {
        console.error("Menu fetch error:", err);
        setLoadError(err.message || "Failed to connect to menu service");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === newItem.productId &&
          i.variantId === newItem.variantId &&
          i.specialInstructions === newItem.specialInstructions &&
          JSON.stringify(i.modifiers) === JSON.stringify(newItem.modifiers)
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const updatedQty = updated[existingIdx].quantity + newItem.quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updatedQty,
          lineTotalPkr: updated[existingIdx].unitPricePkr * updatedQty,
        };
        return updated;
      }
      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              quantity: newQuantity,
              lineTotalPkr: item.unitPricePkr * newQuantity,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.lineTotalPkr, 0);

  // Flatten all products across all categories for Popular Picks
  const allProducts: Product[] = categories.flatMap((c) => c.products || []);

  // Handle signature section selection (stays in place, no jump/scroll)
  const handleSelectSignature = (slug: string) => {
    setActiveSignatureSlug(slug);
    setSelectedCategory("all");
  };

  // 1. Signature-level filtering
  const { isHistoria, filteredCategories: signatureFilteredCategories } = filterProductsBySignature(
    activeSignatureSlug,
    categories
  );

  // 2. Category tab level filtering (when applicable)
  const categoryScoped =
    selectedCategory === "all"
      ? signatureFilteredCategories
      : signatureFilteredCategories.filter((c) => c.id === selectedCategory);

  // 3. Search query filtering
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const finalDisplayCategories = categoryScoped
    .map((c) => {
      if (!normalizedQuery) return c;
      const matchedProducts = (c.products || []).filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(normalizedQuery);
        const descMatch = (p.description || "").toLowerCase().includes(normalizedQuery);
        const catMatch = c.name.toLowerCase().includes(normalizedQuery);
        return nameMatch || descMatch || catMatch;
      });
      return {
        ...c,
        products: matchedProducts,
      };
    })
    .filter((c) => Boolean(c.products && c.products.length > 0));

  const totalMatchingProducts = finalDisplayCategories.reduce(
    (acc, c) => acc + (c.products?.length || 0),
    0
  );

  // Active signature section metadata
  const activeSignatureConfig = SIGNATURE_SECTIONS.find((s) => s.slug === activeSignatureSlug);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 1. Dismissible Top App Banner */}
      <AppDownloadBanner />

      {/* 2. Responsive Public Topbar */}
      <CustomerHeader
        cartCount={cartCount}
        cartTotalPkr={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 3. First-Visit Order Mode & Location Modal */}
      <OrderModeModal />

      <main style={{ flex: 1 }}>
        {/* 3. Promotional Banners Carousel */}
        <PromoCarousel
          onSelectPromotion={(promo) => {
            if (promo.actionCategoryId) {
              setActiveSignatureSlug("menu");
              setSelectedCategory(promo.actionCategoryId);
              const el = document.getElementById("dynamic-menu-catalog");
              el?.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />

        {/* 4. CNM Signature Navigation Strip (Sticky below topbar) */}
        <SignatureNavigationStrip
          activeSectionSlug={activeSignatureSlug}
          onSelectSection={handleSelectSignature}
          stickyTop={headerHeight}
        />

        {/* 5. Search Bar */}
        <div className="container" style={{ marginBottom: "14px" }}>
          <MenuSearchBar
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            resultCount={totalMatchingProducts}
            totalCount={allProducts.length}
          />
        </div>

        {/* 6. Popular Picks Section (Configurable 4–6 verified dishes) */}
        {!searchQuery && activeSignatureSlug === "menu" && (
          <PopularPicksSection
            products={allProducts}
            isLoading={isLoading}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {/* 6.5. Deals You'll Love (Homepage Promotions Grid) */}
        {!searchQuery && activeSignatureSlug === "menu" && (
          <PromotionsSection
            onSelectPromotion={(promo) => setSelectedPromotion(promo)}
          />
        )}

        {/* 7. Dynamic Menu Content */}
        <section id="dynamic-menu-catalog" style={{ padding: "12px 0 36px" }}>
          <div className="container">
            {/* Signature Section Title & Description */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "16px",
                borderBottom: "1.5px solid var(--cnm-border)",
                paddingBottom: "10px",
              }}
            >
              <div>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "var(--cnm-text-primary)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    textTransform: "capitalize",
                  }}
                >
                  {activeSignatureConfig?.displayName || "Menu"}
                </h1>
                <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>
                  {activeSignatureConfig?.subtitle || "Explore our handcrafted food offerings"}
                </p>
              </div>

              {activeSignatureSlug !== "menu" && (
                <button
                  type="button"
                  onClick={() => handleSelectSignature("menu")}
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--cnm-orange)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 130, 67, 0.08)",
                    cursor: "pointer",
                  }}
                >
                  ← View All Menú
                </button>
              )}
            </div>

            {/* Category Pills (Visible when in full menú mode) */}
            {activeSignatureSlug === "menu" && !searchQuery && (
              <div
                className="liquid-glass-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "24px",
                }}
              >
                <button
                  type="button"
                  aria-label="Scroll categories left"
                  onClick={() => handleScrollCategories("left")}
                  className="category-scroll-btn"
                >
                  <ChevronLeft size={17} />
                </button>

                <div
                  ref={categoryScrollRef}
                  className="no-scrollbar"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    overflowX: "auto",
                    padding: "2px 0",
                    scrollBehavior: "smooth",
                    flex: 1,
                  }}
                >
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="category-tab-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.01em",
                      backgroundColor: selectedCategory === "all" ? "var(--cnm-orange)" : "var(--cnm-surface)",
                      color: selectedCategory === "all" ? "#ffffff" : "var(--cnm-text-primary)",
                      border: `1px solid ${selectedCategory === "all" ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                      boxShadow: selectedCategory === "all" ? "0 4px 12px rgba(255, 130, 67, 0.35)" : "none",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "14px", lineHeight: 1 }}>✨</span>
                    <span>ALL ITEMS</span>
                  </button>

                  {categories
                    .filter((cat) => cat.products && cat.products.length > 0)
                    .map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const productCount = cat.products?.length || 0;
                    const emoji = getCategoryEmoji(cat.name || cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="category-tab-btn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "5px 10px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.01em",
                          backgroundColor: isSelected ? "var(--cnm-orange)" : "var(--cnm-surface)",
                          color: isSelected ? "#ffffff" : "var(--cnm-text-primary)",
                          border: `1px solid ${isSelected ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
                          boxShadow: isSelected ? "0 4px 12px rgba(255, 130, 67, 0.35)" : "none",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: "14px", lineHeight: 1 }}>{emoji}</span>
                        <span>{cat.name.toUpperCase()}</span>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: isSelected ? "rgba(0, 0, 0, 0.22)" : "var(--cnm-surface-elevated)",
                            color: isSelected ? "#ffffff" : "var(--cnm-text-muted)",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-full)",
                            fontWeight: 700,
                          }}
                        >
                          {productCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-label="Scroll categories right"
                  onClick={() => handleScrollCategories("right")}
                  className="category-scroll-btn"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {/* Catalog Grid Loading / Empty / Content States */}
            {isLoading ? (
              /* High-Quality Animated Skeleton Shimmer Loading Cards */
              <div className="product-responsive-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="card"
                    style={{
                      padding: "16px",
                      minHeight: "260px",
                      backgroundColor: "var(--cnm-surface)",
                      border: "1px solid var(--cnm-border)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        className="skeleton-shimmer"
                        style={{ width: "100%", height: "135px", borderRadius: "var(--radius-sm)", marginBottom: "12px" }}
                      />
                      <div
                        className="skeleton-shimmer"
                        style={{ width: "35%", height: "12px", marginBottom: "8px" }}
                      />
                      <div
                        className="skeleton-shimmer"
                        style={{ width: "70%", height: "16px", marginBottom: "8px" }}
                      />
                      <div
                        className="skeleton-shimmer"
                        style={{ width: "90%", height: "11px", marginBottom: "5px" }}
                      />
                      <div
                        className="skeleton-shimmer"
                        style={{ width: "65%", height: "11px" }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                      <div className="skeleton-shimmer" style={{ width: "38%", height: "18px" }} />
                      <div className="skeleton-shimmer" style={{ width: "32%", height: "30px", borderRadius: "var(--radius-sm)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : isHistoria ? (
              <BrandStorySection isHighlighted={true} />
            ) : loadError ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <p style={{ color: "var(--cnm-orange)", fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                  Unable to load menu
                </p>
                <p style={{ color: "var(--cnm-text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                  {loadError}. Please check your connection and retry.
                </p>
                <button
                  type="button"
                  onClick={fetchMenu}
                  className="btn btn-primary"
                  style={{
                    fontSize: "13px",
                    padding: "8px 20px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 700,
                  }}
                >
                  Retry Loading Menu
                </button>
              </div>
            ) : finalDisplayCategories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <p style={{ color: "var(--cnm-text-muted)", fontSize: "15px", marginBottom: "14px" }}>
                  {searchQuery ? (
                    <>
                      No dishes found matching &quot;<strong style={{ color: "var(--cnm-orange)" }}>{searchQuery}</strong>&quot;.
                    </>
                  ) : (
                    "No menu items found in this signature section."
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSignatureSlug("menu");
                    setSelectedCategory("all");
                  }}
                  className="btn btn-primary"
                  style={{
                    fontSize: "13px",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 700,
                  }}
                >
                  View Full Menú Catalog
                </button>
              </div>
            ) : (
              finalDisplayCategories.map((cat) => (
                <div key={cat.id} style={{ marginBottom: "36px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: "16px",
                      borderBottom: "1px solid var(--cnm-border)",
                      paddingBottom: "8px",
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "19px",
                        fontWeight: 650,
                        color: "var(--cnm-text-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <span style={{ marginRight: "6px" }}>{getCategoryEmoji(cat.name || cat.id)}</span>
                      {cat.name}
                    </h2>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--cnm-text-muted)", letterSpacing: "0.04em" }}>
                      {cat.products?.length || 0} ITEMS
                    </span>
                  </div>

                  <div className="product-responsive-grid">
                    {cat.products?.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={(p) => setSelectedProduct(p)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 8. Brand Story / Location Section ("Historia") - displayed at bottom when browsing menu */}
        {activeSignatureSlug !== "historia" && (
          <BrandStorySection isHighlighted={false} />
        )}
      </main>

      {/* 9. Public Footer */}
      <CustomerFooter />

      {/* Item Customizer Modal */}
      {selectedProduct && (
        <ItemCustomizerModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Promotion Deal Selector Modal */}
      {selectedPromotion && (
        <PromotionModal
          promotion={selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
          onAddToCart={handleAddToCart}
        />
      )}


      {/* Slide-Out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onQuickAddUpsell={(p) => setSelectedProduct(p)}
        onClearCart={handleClearCart}
      />


      <style jsx>{`
        .product-responsive-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .product-responsive-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
        }

        @media (max-width: 767px) {
          .product-responsive-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .product-responsive-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
