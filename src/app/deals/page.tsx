"use client";

import React, { useEffect, useState } from "react";
import { Product, CartItem } from "@/types";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { ProductCard } from "@/components/ProductCard";
import { ItemCustomizerModal } from "@/components/ItemCustomizerModal";
import { CartDrawer } from "@/components/CartDrawer";
import { BuildYourOwnDealModal } from "@/components/BuildYourOwnDealModal";
import { Flame, Sparkles, Plus } from "lucide-react";

export default function DealsPage() {
  const [deals, setDeals] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isByoDealOpen, setIsByoDealOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.categories) {
          const dealCategories = data.data.categories.filter((c: any) =>
            c.id.includes("deal") || c.name.toLowerCase().includes("deal") || c.name.toLowerCase().includes("offer")
          );
          const allDeals = dealCategories.flatMap((c: any) => c.products || []);
          setDeals(allDeals);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
    setIsCartOpen(true);
  };

  const handleAddCustomDealToCart = (dealItems: CartItem[]) => {
    setCartItems((prev) => [...prev, ...dealItems]);
    setIsCartOpen(true);
  };

  const cartCount = cartItems.reduce((acc, itm) => acc + itm.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, itm) => acc + itm.lineTotalPkr, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader
        cartCount={cartCount}
        cartTotalPkr={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main style={{ flex: 1, padding: "32px 0 48px" }}>
        <div className="container">
          <div style={{ marginBottom: "24px" }}>
            <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
              <Flame size={12} /> BIGGEST SAVINGS IN TOWN
            </span>
            <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "8px" }}>
              Exclusive Value Deals & Combos
            </h1>
            <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)" }}>
              Hand-crafted combo feasts designed for solo hunger or full family gatherings.
            </p>
          </div>

          {/* Prominent "Build Your Own Deal" Interactive Hero Card */}
          <div
            className="card"
            style={{
              padding: "24px",
              marginBottom: "32px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--cnm-surface)",
              backgroundImage: "linear-gradient(135deg, var(--cnm-orange-subtle) 0%, var(--cnm-surface-elevated) 100%)",
              border: "1.5px solid var(--cnm-orange)",
              boxShadow: "var(--shadow-card-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div style={{ maxWidth: "620px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span className="badge badge-orange" style={{ fontWeight: 800 }}>
                  <Sparkles size={12} /> INTERACTIVE DEAL BUILDER
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--status-ready)",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  SAVE 5% TO 10%
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 750,
                  color: "var(--cnm-text-primary)",
                  marginBottom: "6px",
                  lineHeight: 1.25,
                }}
              >
                Build Your Own Deal
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--cnm-text-muted)", marginBottom: "12px", lineHeight: 1.45 }}>
                Mix & match any combination of burgers, pizzas, wings, loaded fries, and drinks from our verified CNM menu.
                Unlock an automatic <strong style={{ color: "var(--cnm-orange)" }}>5% discount</strong> at 2,500 PKR or <strong style={{ color: "var(--status-ready)" }}>10% discount</strong> at 3,500 PKR!
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "12px",
                  color: "var(--cnm-text-secondary)",
                }}
              >
                <span>🍔 Choose Any Items</span>
                <span>•</span>
                <span>🔥 Auto Discount</span>
                <span>•</span>
                <span>⚡ Instant Cart Add</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                id="btn-open-byo-deal"
                onClick={() => setIsByoDealOpen(true)}
                className="btn btn-primary"
                style={{
                  padding: "14px 26px",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  borderRadius: "var(--radius-full)",
                  boxShadow: "0 4px 16px rgba(255, 130, 67, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Plus size={18} />
                <span>BUILD CUSTOM DEAL</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="product-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card" style={{ minHeight: "200px", opacity: 0.5 }} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <p style={{ fontSize: "15px", color: "var(--cnm-text-muted)" }}>
                No active bundle deals at this moment. Check back soon!
              </p>
            </div>
          ) : (
            <div className="product-grid">
              {deals.map((deal) => (
                <ProductCard
                  key={deal.id}
                  product={deal}
                  onSelect={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
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

      <BuildYourOwnDealModal
        isOpen={isByoDealOpen}
        onClose={() => setIsByoDealOpen(false)}
        onAddDealToCart={handleAddCustomDealToCart}
      />

      <CustomerFooter />
    </div>
  );
}
