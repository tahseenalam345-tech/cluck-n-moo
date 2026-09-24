"use client";

import React, { useEffect, useState } from "react";
import { Category, Product, CartItem } from "@/types";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { ProductCard } from "@/components/ProductCard";
import { ItemCustomizerModal } from "@/components/ItemCustomizerModal";
import { CartDrawer } from "@/components/CartDrawer";
import { MenuSearchBar } from "@/components/MenuSearchBar";
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
    fetch("/api/v1/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.categories) {
          setCategories(data.data.categories);
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

      <main style={{ flex: 1, padding: "32px 0 48px" }}>
        <div className="container">
          <div style={{ marginBottom: "28px" }}>
            <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
              KHARIAN&apos;S BEST BITES
            </span>
            <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "8px" }}>
              Complete Food Menu
            </h1>
            <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)" }}>
              Explore our freshly smashed beef burgers, golden fried chicken, loaded fries, and refreshing beverages.
            </p>

            {/* Search Input with Auto-typing Placeholder */}
            <div style={{ maxWidth: "680px", marginTop: "16px" }}>
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
                    padding: "16px",
                    minHeight: "260px",
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
                      style={{ width: "100%", height: "140px", marginBottom: "12px" }}
                    />
                    <div className="skeleton-shimmer" style={{ width: "35%", height: "12px", marginBottom: "8px" }} />
                    <div className="skeleton-shimmer" style={{ width: "70%", height: "16px", marginBottom: "8px" }} />
                    <div className="skeleton-shimmer" style={{ width: "90%", height: "12px" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                    <div className="skeleton-shimmer" style={{ width: "40%", height: "18px" }} />
                    <div className="skeleton-shimmer" style={{ width: "30%", height: "32px", borderRadius: "var(--radius-sm)" }} />
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

      <CustomerFooter />
    </div>
  );
}
