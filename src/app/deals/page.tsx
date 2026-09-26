"use client";

import React, { useEffect, useState } from "react";
import { Product, CartItem } from "@/types";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { ProductCard } from "@/components/ProductCard";
import { ItemCustomizerModal } from "@/components/ItemCustomizerModal";
import { CartDrawer } from "@/components/CartDrawer";
import { BuildYourOwnDealModal } from "@/components/BuildYourOwnDealModal";
import { FloatingMiniCart } from "@/components/FloatingMiniCart";
import { Flame, Sparkles, Plus, ArrowRight } from "lucide-react";

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

      <main style={{ flex: 1, padding: cartCount > 0 ? "20px 0 calc(84px + env(safe-area-inset-bottom, 0px))" : "20px 0 48px" }}>
        <div className="container">
          <div style={{ marginBottom: "16px" }}>
            <span className="badge badge-orange" style={{ marginBottom: "6px" }}>
              <Flame size={12} /> BIGGEST SAVINGS IN TOWN
            </span>
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", color: "var(--cnm-text-primary)", marginBottom: "4px" }}>
              Exclusive Value Deals & Combos
            </h1>
            <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: 0 }}>
              Hand-crafted combo feasts designed for solo hunger or full family gatherings.
            </p>
          </div>

          {/* Compact Slim "Build Your Own Deal" Horizontal Rectangle Card */}
          <div
            className="card cnm-slim-deal-card"
            onClick={() => setIsByoDealOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsByoDealOpen(true);
              }
            }}
          >
            <div className="cnm-deal-card-content">
              <div className="cnm-deal-card-tags">
                <span className="badge badge-orange cnm-deal-badge">
                  <Sparkles size={10} /> BUILD CUSTOM DEAL
                </span>
                <span className="cnm-deal-savings-pill">
                  SAVE 5% TO 10%
                </span>
              </div>
              <h2 className="cnm-deal-card-title">
                Build Your Own Deal
              </h2>
              <p className="cnm-deal-card-desc">
                Mix & match dishes. Get <strong style={{ color: "var(--cnm-orange)" }}>5% OFF</strong> at 2,500 PKR or <strong style={{ color: "var(--status-ready)" }}>10% OFF</strong> at 3,500 PKR.
              </p>
            </div>

            <div className="cnm-deal-card-action">
              <button
                type="button"
                id="btn-open-byo-deal"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsByoDealOpen(true);
                }}
                className="btn btn-primary cnm-deal-build-btn"
                aria-label="Open Custom Deal Builder"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Build Deal</span>
                <ArrowRight size={13} strokeWidth={2.5} />
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

      <BuildYourOwnDealModal
        isOpen={isByoDealOpen}
        onClose={() => setIsByoDealOpen(false)}
        onAddDealToCart={handleAddCustomDealToCart}
      />

      <CustomerFooter hasFloatingCart={cartCount > 0} />

      <style jsx>{`
        .cnm-slim-deal-card {
          padding: 12px 16px;
          margin-bottom: 18px;
          border-radius: var(--radius-md);
          background-color: var(--cnm-surface);
          background-image: linear-gradient(135deg, var(--cnm-orange-subtle) 0%, var(--cnm-surface-elevated) 100%);
          border: 1.5px solid var(--cnm-orange);
          box-shadow: 0 4px 16px rgba(255, 130, 67, 0.15), var(--shadow-card);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .cnm-slim-deal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 130, 67, 0.25), var(--shadow-card-hover);
        }

        .cnm-deal-card-content {
          flex: 1;
          min-width: 0;
        }

        .cnm-deal-card-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
          flex-wrap: wrap;
        }

        .cnm-deal-badge {
          font-weight: 800;
          font-size: 10px;
          padding: 2px 7px;
          letter-spacing: 0.03em;
        }

        .cnm-deal-savings-pill {
          font-size: 10px;
          font-weight: 800;
          color: var(--status-ready);
          background-color: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          letter-spacing: 0.03em;
        }

        .cnm-deal-card-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          margin: 0 0 2px;
          line-height: 1.2;
        }

        .cnm-deal-card-desc {
          font-size: 11.5px;
          color: var(--cnm-text-muted);
          margin: 0;
          line-height: 1.35;
        }

        .cnm-deal-card-action {
          flex-shrink: 0;
        }

        .cnm-deal-build-btn {
          padding: 8px 15px;
          font-size: 12px;
          font-weight: 800;
          border-radius: var(--radius-full);
          box-shadow: 0 3px 12px rgba(255, 130, 67, 0.35);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          white-space: nowrap;
          min-height: 38px;
        }

        @media (max-width: 480px) {
          .cnm-slim-deal-card {
            padding: 10px 12px;
            gap: 10px;
          }
          .cnm-deal-card-title {
            font-size: 14.5px;
          }
          .cnm-deal-card-desc {
            font-size: 11px;
          }
          .cnm-deal-build-btn {
            padding: 7px 11px;
            font-size: 11.5px;
            min-height: 36px;
          }
        }

        @media (max-width: 350px) {
          .cnm-slim-deal-card {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .cnm-deal-build-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
