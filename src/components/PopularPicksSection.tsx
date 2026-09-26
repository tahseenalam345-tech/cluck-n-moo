"use client";

import React from "react";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { Sparkles, Flame } from "lucide-react";

interface PopularPicksSectionProps {
  products: Product[];
  isLoading?: boolean;
  onSelectProduct: (product: Product) => void;
}

export function PopularPicksSection({
  products,
  isLoading = false,
  onSelectProduct,
}: PopularPicksSectionProps) {
  // Verified explicitly chosen popular items (is_featured = 1, available = 1), strictly maximum 6 items
  const popularItems = products
    .filter((p) => Number(p.isFeatured) === 1 && Number(p.isAvailable) === 1)
    .slice(0, 6);

  if (!isLoading && popularItems.length === 0) return null;

  return (
    <section
      aria-label="Popular Picks"
      className="popular-picks-section"
      style={{
        padding: "16px 0 28px",
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            borderBottom: "1px solid var(--cnm-border)",
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 130, 67, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cnm-orange)",
              }}
            >
              <Flame size={16} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--cnm-text-primary)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                POPULAR PICKS
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--cnm-text-muted)",
                }}
              >
                Kharian&apos;s most loved fast-casual bites
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--cnm-orange)",
              backgroundColor: "rgba(255, 130, 67, 0.08)",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              letterSpacing: "0.04em",
            }}
          >
            {isLoading ? "CURATING..." : `${popularItems.length} TOP DISHES`}
          </span>
        </div>

        {/* Responsive Popular Picks Grid */}
        <div className="popular-picks-grid">
          {isLoading ? (
            [1, 2, 3, 4].map((n) => (
              <div
                key={`pop-skeleton-${n}`}
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
                    style={{ width: "100%", height: "105px", borderRadius: "var(--radius-sm)", marginBottom: "8px" }}
                  />
                  <div className="skeleton-shimmer" style={{ width: "35%", height: "10px", marginBottom: "6px" }} />
                  <div className="skeleton-shimmer" style={{ width: "70%", height: "14px", marginBottom: "6px" }} />
                  <div className="skeleton-shimmer" style={{ width: "85%", height: "10px", marginBottom: "4px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                  <div className="skeleton-shimmer" style={{ width: "38%", height: "16px" }} />
                  <div className="skeleton-shimmer" style={{ width: "32%", height: "26px", borderRadius: "var(--radius-sm)" }} />
                </div>
              </div>
            ))
          ) : (
            popularItems.map((prod, idx) => (
              <ProductCard
                key={`popular-${prod.id}`}
                product={prod}
                priority={idx < 2}
                onSelect={onSelectProduct}
              />
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .popular-picks-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .popular-picks-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
        }

        @media (max-width: 767px) {
          .popular-picks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .popular-picks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
        }
      `}</style>
    </section>
  );
}
