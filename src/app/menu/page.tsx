"use client";

import React, { useEffect, useState } from "react";
import { Category, Product, CartItem } from "@/types";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { ProductCard } from "@/components/ProductCard";
import { ItemCustomizerModal } from "@/components/ItemCustomizerModal";
import { CartDrawer } from "@/components/CartDrawer";
import { MenuSearchBar } from "@/components/MenuSearchBar";
import { FloatingMiniCart } from "@/components/FloatingMiniCart";
import { Flame, Sparkles } from "lucide-react";
import { getCategoryEmoji } from "@/lib/categoryEmojis";

export default function FullMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("cnm_cached_menu");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
          setIsLoading(false);
        }
      }
    } catch {}

    fetch("/api/v1/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.categories) {
          setCategories(data.data.categories);
          try {
            localStorage.setItem("cnm_cached_menu", JSON.stringify(data.data.categories));
          } catch {}
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
    setIsCartOpen(true);
  };

  const cartCount = cartItems.reduce((acc, itm) => acc + itm.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, itm) => acc + itm.lineTotalPkr, 0);

  // Filter products by search query
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    products: cat.products?.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description ? p.description.toLowerCase().includes(searchQuery.toLowerCase()) : false)
    ),
  })).filter((cat) => cat.products && cat.products.length > 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader
        cartCount={cartCount}
        cartTotalPkr={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main
        className="menu-main-content"
        style={{
          flex: 1,
          minHeight: "calc(100vh - 70px)",
          paddingBottom: cartCount > 0 ? "calc(80px + env(safe-area-inset-bottom, 0px))" : undefined,
        }}
      >
        <div className="container">
          <div className="menu-hero-header">
            <span className="badge badge-orange" style={{ marginBottom: "6px" }}>
              KHARIAN&apos;S BEST BITES
            </span>
            <h1 className="menu-page-title">
              Complete Food Menu
            </h1>
            <p className="menu-page-subtitle">
              Explore our freshly smashed beef burgers, golden fried chicken, loaded fries, and refreshing beverages.
            </p>

            {/* Search Input with Auto-typing Placeholder */}
            <div className="menu-search-wrapper">
              <MenuSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </div>


          {isLoading ? (
            <div className="product-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="card"
                  style={{
                    padding: "8px",
                    minHeight: "290px",
                    backgroundColor: "var(--cnm-surface)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      className="skeleton-shimmer"
                      style={{ width: "100%", height: "105px", marginBottom: "8px", borderRadius: "var(--radius-sm)" }}
                    />
                    <div className="skeleton-shimmer" style={{ width: "35%", height: "10px", marginBottom: "6px" }} />
                    <div className="skeleton-shimmer" style={{ width: "70%", height: "14px", marginBottom: "6px" }} />
                    <div className="skeleton-shimmer" style={{ width: "90%", height: "10px" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                    <div className="skeleton-shimmer" style={{ width: "40%", height: "16px" }} />
                    <div className="skeleton-shimmer" style={{ width: "30%", height: "26px", borderRadius: "var(--radius-sm)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <p style={{ fontSize: "15px", color: "var(--cnm-text-muted)", marginBottom: "12px" }}>
                No dishes found matching &quot;{searchQuery}&quot;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="btn btn-secondary"
                style={{ fontSize: "13px" }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} style={{ marginBottom: "44px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "18px",
                    borderBottom: "1px solid var(--cnm-border)",
                    paddingBottom: "10px",
                  }}
                >
                  <h2 style={{ fontSize: "22px", color: "var(--cnm-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{getCategoryEmoji(cat.name || cat.id)}</span>
                    <span>{cat.name}</span>
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--cnm-text-muted)", fontWeight: 700 }}>
                    {cat.products?.length || 0} ITEMS
                  </span>
                </div>

                <div className="product-grid">
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
      </main>

      {selectedProduct && (
        <ItemCustomizerModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <FloatingMiniCart
        cartCount={cartCount}
        totalPkr={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={(id) => setCartItems((prev) => prev.filter((i) => i.cartItemId !== id))}
        onUpdateQuantity={(id, q) =>
          setCartItems((prev) =>
            prev.map((i) => (i.cartItemId === id ? { ...i, quantity: q, lineTotalPkr: i.unitPricePkr * q } : i))
          )
        }
        onQuickAddUpsell={() => {}}
        onClearCart={() => setCartItems([])}
      />

      <CustomerFooter hasFloatingCart={cartCount > 0} />

      <style jsx>{`
        .menu-main-content {
          flex: 1;
          padding: 16px 0 36px;
        }
        .menu-hero-header {
          margin-bottom: 16px;
        }
        .menu-page-title {
          font-size: clamp(22px, 5.5vw, 30px);
          color: var(--cnm-text-primary);
          margin-bottom: 4px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .menu-page-subtitle {
          font-size: 13px;
          color: var(--cnm-text-muted);
          line-height: 1.4;
          margin: 0;
        }
        .menu-search-wrapper {
          max-width: 680px;
          margin-top: 12px;
        }
        @media (min-width: 641px) {
          .menu-main-content {
            padding: 28px 0 48px;
          }
          .menu-hero-header {
            margin-bottom: 24px;
          }
          .menu-page-title {
            font-size: 32px;
            margin-bottom: 8px;
          }
          .menu-page-subtitle {
            font-size: 14px;
          }
          .menu-search-wrapper {
            margin-top: 16px;
          }
        }
      `}</style>
    </div>
  );
}
