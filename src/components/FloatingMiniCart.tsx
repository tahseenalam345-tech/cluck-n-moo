"use client";

import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface FloatingMiniCartProps {
  cartCount: number;
  totalPkr: number;
  onOpenCart: () => void;
}

export function FloatingMiniCart({ cartCount, totalPkr, onOpenCart }: FloatingMiniCartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (cartCount <= 0) return null;

  return (
    <aside
      aria-label="Floating shopping cart summary"
      className="floating-mini-cart-wrapper"
    >
      <button
        type="button"
        onClick={onOpenCart}
        className="floating-mini-cart-bar"
        aria-label={`View Cart with ${cartCount} items totaling ${totalPkr.toLocaleString()} PKR`}
      >
        {/* Left: Cart Icon with count badge + Total amount */}
        <div className="mini-cart-left">
          <div className="mini-cart-icon-bubble">
            <ShoppingBag size={17} strokeWidth={2.4} />
            <span key={cartCount} className="mini-cart-badge">{cartCount}</span>
          </div>

          <div className="mini-cart-text-col">
            <span className="mini-cart-count-label">
              {cartCount === 1 ? "1 item" : `${cartCount} items`}
            </span>
            <span className="mini-cart-total-price">
              {totalPkr.toLocaleString()} <span className="pkr-currency">PKR</span>
            </span>
          </div>
        </div>

        {/* Right: "View Cart" CTA Pill */}
        <div className="mini-cart-cta">
          <span className="cta-label">View Cart</span>
          <ArrowRight size={14} className="cta-arrow" strokeWidth={2.5} />
        </div>
      </button>

      <style jsx>{`
        .floating-mini-cart-wrapper {
          position: fixed;
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          z-index: 85;
          width: calc(100% - 24px);
          max-width: 420px;
          animation: miniCartEntrance 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }

        @keyframes miniCartEntrance {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .floating-mini-cart-bar {
          pointer-events: auto;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px 7px 12px;
          border-radius: 9999px;
          background: ${isDark
            ? "rgba(22, 18, 16, 0.84)"
            : "rgba(255, 255, 255, 0.88)"};
          backdrop-filter: blur(18px) saturate(190%);
          -webkit-backdrop-filter: blur(18px) saturate(190%);
          border: 1.5px solid ${isDark ? "rgba(255, 130, 67, 0.30)" : "rgba(255, 130, 67, 0.38)"};
          box-shadow: ${isDark
            ? "0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 4px 14px rgba(255, 130, 67, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
            : "0 10px 28px -4px rgba(35, 25, 15, 0.16), 0 3px 12px rgba(255, 130, 67, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.85)"};
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.18s ease;
          text-align: left;
        }

        .floating-mini-cart-bar:hover {
          transform: scale(1.015);
          box-shadow: ${isDark
            ? "0 16px 36px -4px rgba(0, 0, 0, 0.75), 0 6px 18px rgba(255, 130, 67, 0.30)"
            : "0 14px 32px -4px rgba(35, 25, 15, 0.22), 0 5px 16px rgba(255, 130, 67, 0.25)"};
        }

        .floating-mini-cart-bar:active {
          transform: scale(0.98);
        }

        .mini-cart-left {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .mini-cart-icon-bubble {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8243 0%, #ea580c 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(234, 88, 12, 0.35);
        }

        .mini-cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 999px;
          background: #111827;
          border: 1.5px solid #ffffff;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          animation: badgePop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes badgePop {
          0% { transform: scale(0.7); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .mini-cart-text-col {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
          min-width: 0;
        }

        .mini-cart-count-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--cnm-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mini-cart-total-price {
          font-size: 14.5px;
          font-weight: 900;
          color: var(--cnm-text-primary);
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .pkr-currency {
          font-size: 11px;
          font-weight: 700;
          color: var(--cnm-orange);
          margin-left: 2px;
        }

        .mini-cart-cta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, #ff8243 0%, #ea580c 100%);
          color: #ffffff;
          padding: 7px 13px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.01em;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.32);
          transition: transform 0.15s ease;
        }

        .cta-label {
          white-space: nowrap;
        }

        .cta-arrow {
          transition: transform 0.15s ease;
        }

        .floating-mini-cart-bar:hover .cta-arrow {
          transform: translateX(2px);
        }

        @media (max-width: 360px) {
          .floating-mini-cart-wrapper {
            width: calc(100% - 16px);
          }
          .floating-mini-cart-bar {
            padding: 5px 8px 5px 10px;
          }
          .mini-cart-icon-bubble {
            width: 31px;
            height: 31px;
          }
          .mini-cart-total-price {
            font-size: 13.5px;
          }
          .mini-cart-cta {
            padding: 5px 9px;
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-mini-cart-wrapper {
            animation: none;
          }
          .mini-cart-badge {
            animation: none;
          }
          .floating-mini-cart-bar,
          .cta-arrow {
            transition: none;
          }
        }
      `}</style>
    </aside>
  );
}
