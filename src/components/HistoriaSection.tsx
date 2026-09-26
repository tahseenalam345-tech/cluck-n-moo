"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { BrandStorySection } from "./BrandStorySection";
import { getHistoriaProducts, clearUserHistory, HistoriaResult } from "@/lib/userHistory";
import { Clock, Flame, Sparkles, RefreshCw, Heart, ArrowRight, User } from "lucide-react";

interface HistoriaSectionProps {
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onExploreMenu: () => void;
}

export function HistoriaSection({
  allProducts,
  onSelectProduct,
  onExploreMenu,
}: HistoriaSectionProps) {
  const [historia, setHistoria] = useState<HistoriaResult>({
    lastOrderedProducts: [],
    frequentlyVisitedProducts: [],
    hasHistory: false,
    userPhone: "guest",
  });
  const [activeFilter, setActiveFilter] = useState<"all" | "ordered" | "visited">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load historia on mount and whenever allProducts change
  useEffect(() => {
    if (allProducts.length > 0) {
      const data = getHistoriaProducts(allProducts);
      setHistoria(data);
    }
  }, [allProducts]);

  const handleClear = () => {
    clearUserHistory(historia.userPhone);
    setHistoria({
      lastOrderedProducts: [],
      frequentlyVisitedProducts: [],
      hasHistory: false,
      userPhone: "guest",
    });
    setShowClearConfirm(false);
  };

  // Popular items as recommendations if empty or for discovery
  const popularRecommendations = useMemo(() => {
    return allProducts.slice(0, 4);
  }, [allProducts]);

  const hasOrdered = historia.lastOrderedProducts.length > 0;
  const hasVisited = historia.frequentlyVisitedProducts.length > 0;

  return (
    <div className="historia-container">
      {/* 1. Header Banner */}
      <div className="historia-header-card">
        <div className="historia-header-left">
          <div className="historia-badge-row">
            <span className="badge badge-orange">
              <Heart size={12} fill="var(--cnm-orange)" /> TU HISTORIA • PERSONAL ORDER HISTORY
            </span>
            <span className="historia-device-tag">
              <User size={11} />
              {historia.userPhone !== "guest"
                ? `Customer: ${historia.userPhone}`
                : "Saved on this Device"}
            </span>
          </div>

          <h1 className="historia-main-title">
            Your Orders & Frequent Bites
          </h1>
          <p className="historia-main-desc">
            Dishes you last ordered or frequently explore, saved locally for instant 1-tap reordering.
          </p>
        </div>

        {historia.hasHistory && (
          <div className="historia-header-actions">
            {showClearConfirm ? (
              <div className="clear-confirm-wrap">
                <span className="clear-confirm-text">Clear your personal history?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-secondary btn-sm"
                  style={{ color: "var(--status-cancelled)", padding: "4px 10px", fontSize: "11.5px" }}
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 10px", fontSize: "11.5px" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="btn btn-secondary historia-clear-btn"
                title="Reset your local order history"
              >
                <RefreshCw size={13} />
                <span>Reset History</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Filter Pills (if both sections exist) */}
      {hasOrdered && hasVisited && (
        <div className="historia-filter-pills no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`filter-pill ${activeFilter === "all" ? "active" : ""}`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ordered")}
            className={`filter-pill ${activeFilter === "ordered" ? "active" : ""}`}
          >
            🔥 Last Ordered ({historia.lastOrderedProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("visited")}
            className={`filter-pill ${activeFilter === "visited" ? "active" : ""}`}
          >
            👀 Frequent Visits ({historia.frequentlyVisitedProducts.length})
          </button>
        </div>
      )}

      {/* 3. Has History: Content Sections */}
      {historia.hasHistory ? (
        <div className="historia-sections-wrap">
          {/* A. Last Ordered Section */}
          {hasOrdered && (activeFilter === "all" || activeFilter === "ordered") && (
            <section className="historia-sub-section">
              <div className="section-title-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="icon-circle icon-orange">
                    <Flame size={15} />
                  </span>
                  <div>
                    <h2 className="section-title">Last Ordered Dishes</h2>
                    <p className="section-subtitle">
                      Items from your recent orders — tap to reorder in seconds.
                    </p>
                  </div>
                </div>
                <span className="badge badge-orange" style={{ fontSize: "11px" }}>
                  {historia.lastOrderedProducts.length} ITEMS
                </span>
              </div>

              <div className="product-responsive-grid">
                {historia.lastOrderedProducts.map((entry) => (
                  <div key={entry.product.id} className="historia-product-wrapper">
                    <div className="historia-meta-pill">
                      <Clock size={11} />
                      <span>{entry.orderNumber ? `Order #${entry.orderNumber}` : "Ordered recently"}</span>
                    </div>
                    <ProductCard
                      product={entry.product}
                      onSelect={(p) => onSelectProduct(p)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* B. Frequently Visited Section */}
          {hasVisited && (activeFilter === "all" || activeFilter === "visited") && (
            <section className="historia-sub-section" style={{ marginTop: hasOrdered ? "36px" : "0" }}>
              <div className="section-title-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="icon-circle icon-emerald">
                    <Sparkles size={15} />
                  </span>
                  <div>
                    <h2 className="section-title">Frequently Explored</h2>
                    <p className="section-subtitle">
                      Dishes you check out most often on this device.
                    </p>
                  </div>
                </div>
                <span className="badge" style={{ fontSize: "11px", backgroundColor: "rgba(16, 185, 129, 0.12)", color: "var(--status-ready)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  {historia.frequentlyVisitedProducts.length} ITEMS
                </span>
              </div>

              <div className="product-responsive-grid">
                {historia.frequentlyVisitedProducts.map((entry) => (
                  <div key={entry.product.id} className="historia-product-wrapper">
                    <div className="historia-meta-pill" style={{ color: "var(--status-ready)" }}>
                      <Sparkles size={11} />
                      <span>Viewed {entry.visitCount} times</span>
                    </div>
                    <ProductCard
                      product={entry.product}
                      onSelect={(p) => onSelectProduct(p)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* 4. Empty State: No History Yet */
        <div className="historia-empty-card">
          <div className="empty-icon-wrap">
            <Clock size={32} color="var(--cnm-orange)" />
          </div>
          <h2 className="empty-title">Your Historia Starts Here!</h2>
          <p className="empty-desc">
            As you browse and order dishes, your personal history will automatically gather here
            for quick, 1-tap reordering.
          </p>

          <button
            type="button"
            onClick={onExploreMenu}
            className="btn btn-primary empty-cta-btn"
          >
            <span>Explore Main Menú</span>
            <ArrowRight size={15} />
          </button>

          {/* Quick Recommendations Grid */}
          <div className="recommendations-box">
            <h3 className="recommendations-title">
              🔥 Kharian&apos;s Crowd Favorites to Try:
            </h3>
            <div className="product-responsive-grid">
              {popularRecommendations.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onSelect={(p) => onSelectProduct(p)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Authentic Brand Story & Heritage Section */}
      <div style={{ marginTop: "48px" }}>
        <BrandStorySection isHighlighted={false} />
      </div>

      <style jsx>{`
        .historia-container {
          padding-bottom: 24px;
        }

        .historia-header-card {
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--cnm-orange-subtle) 0%, var(--cnm-surface-elevated) 100%);
          border: 1.5px solid var(--cnm-orange);
          box-shadow: 0 4px 18px rgba(255, 130, 67, 0.12), var(--shadow-card);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .historia-header-left {
          flex: 1;
          min-width: 240px;
        }

        .historia-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .historia-device-tag {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--cnm-text-muted);
          background: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .historia-main-title {
          font-family: var(--font-display);
          font-size: clamp(19px, 4vw, 24px);
          font-weight: 850;
          color: var(--cnm-text-primary);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .historia-main-desc {
          font-size: 12.5px;
          color: var(--cnm-text-muted);
          margin: 0;
          line-height: 1.4;
        }

        .historia-header-actions {
          flex-shrink: 0;
        }

        .historia-clear-btn {
          font-size: 12px;
          font-weight: 700;
          padding: 7px 12px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }

        .clear-confirm-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .clear-confirm-text {
          font-size: 11px;
          color: var(--cnm-text-muted);
          margin-right: 4px;
        }

        .historia-filter-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          margin-bottom: 22px;
          padding-bottom: 2px;
        }

        .filter-pill {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 700;
          border: 1px solid var(--cnm-border);
          background: var(--cnm-surface-elevated);
          color: var(--cnm-text-primary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .filter-pill.active {
          border-color: var(--cnm-orange);
          background: var(--cnm-orange);
          color: #ffffff;
        }

        .historia-sub-section {
          margin-bottom: 28px;
        }

        .section-title-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 1.5px solid var(--cnm-border);
          margin-bottom: 16px;
        }

        .icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-orange {
          background: rgba(255, 130, 67, 0.15);
          color: var(--cnm-orange);
        }

        .icon-emerald {
          background: rgba(16, 185, 129, 0.15);
          color: var(--status-ready);
        }

        .section-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          margin: 0;
          line-height: 1.2;
        }

        .section-subtitle {
          font-size: 11.5px;
          color: var(--cnm-text-muted);
          margin: 2px 0 0;
        }

        .historia-product-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .historia-meta-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 5;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 2px 7px;
          border-radius: var(--radius-full);
          font-size: 9.5px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .historia-empty-card {
          padding: 36px 20px;
          text-align: center;
          border-radius: var(--radius-lg);
          background: var(--cnm-surface-elevated);
          border: 1px dashed var(--cnm-border);
          margin-bottom: 30px;
        }

        .empty-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(255, 130, 67, 0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .empty-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          margin: 0 0 6px;
        }

        .empty-desc {
          font-size: 13px;
          color: var(--cnm-text-muted);
          max-width: 440px;
          margin: 0 auto 18px;
          line-height: 1.45;
        }

        .empty-cta-btn {
          padding: 9px 20px;
          font-size: 13px;
          font-weight: 800;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 32px;
        }

        .recommendations-box {
          border-top: 1px solid var(--cnm-border);
          padding-top: 24px;
          text-align: left;
        }

        .recommendations-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 800;
          color: var(--cnm-text-primary);
          margin: 0 0 14px;
        }

        @media (max-width: 480px) {
          .historia-header-card {
            padding: 12px 14px;
          }
          .historia-main-title {
            font-size: 18px;
          }
          .historia-main-desc {
            font-size: 11.5px;
          }
          .section-title {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
