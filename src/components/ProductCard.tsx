"use client";

import React from "react";
import { Product } from "@/types";
import { Plus, SlidersHorizontal, Flame, Sparkles } from "lucide-react";
import { getCategoryEmoji } from "@/lib/categoryEmojis";

import { ProductImage } from "./ProductImage";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  priority?: boolean;
}

export function ProductCard({ product, onSelect, priority = false }: ProductCardProps) {
  const hasVariants = product.variants && product.variants.length > 0;
  const isAvailable = product.isAvailable !== 0;

  // Compute lowest price display
  let displayPrice = product.basePricePkr;
  if (hasVariants) {
    const minVariantPrice = Math.min(...product.variants!.map((v) => v.pricePkr));
    if (minVariantPrice < displayPrice) {
      displayPrice = minVariantPrice;
    }
  }

  // Get category badge text
  const getCategoryBadge = () => {
    switch (product.categoryId) {
      case "cat_beef_burgers":
        return "100% BEEF";
      case "cat_chicken_burgers":
        return "CLUCK BURGER";
      case "cat_appetizers":
        return "APPETIZER";
      case "cat_fries_more":
        return "CRUNCH FRIES";
      case "cat_wraps":
        return "WRAP";
      case "cat_sandwiches":
        return "SANDWICH";
      case "cat_pizzas":
      case "cat_pizza_specials":
        return "OVEN PIZZA";
      case "cat_pasta_sides":
        return "PASTA & SIDES";
      case "cat_box_deals":
      case "cat_combo_deals":
      case "cat_student_deals":
        return "EXCLUSIVE DEAL";
      case "cat_desserts":
        return "SWEET TREAT";
      case "cat_drinks":
        return "BEVERAGE";
      default:
        return "CNM ORIGINAL";
    }
  };

  return (
    <article
      className="card product-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        position: "relative",
        opacity: isAvailable ? 1 : 0.65,
      }}
    >
      {/* Top Image Frame with Fixed Aspect Ratio (4:3) via ProductImage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderBottom: "1px solid var(--cnm-border)",
        }}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          target="card"
          aspectRatio="4/3"
          priority={priority}
        />


        {/* Status / Feature Badges */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 2,
          }}
        >
          {product.isFeatured === 1 && (
            <span className="badge badge-orange" style={{ fontSize: "9px", padding: "2px 6px" }}>
              ★ POPULAR
            </span>
          )}
          {(product.categoryId === "cat_box_deals" || product.categoryId === "cat_combo_deals") && (
            <span className="badge badge-outline" style={{ fontSize: "9px", padding: "2px 6px", backgroundColor: "var(--cnm-surface)" }}>
              VALUE FEAST
            </span>
          )}
        </div>

        {/* Sold-out banner */}
        {!isAvailable && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3,
            }}
          >
            <span
              style={{
                backgroundColor: "var(--status-cancelled)",
                color: "#ffffff",
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.08em",
                padding: "4px 10px",
                borderRadius: "4px",
              }}
            >
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Product Content Body */}
      <div
        className="product-card-body"
        style={{
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 650,
              lineHeight: 1.3,
              color: "var(--cnm-text-primary)",
              marginBottom: "6px",
              letterSpacing: "-0.01em",
            }}
          >
            {product.name}
          </h3>


          <p
            className="product-card-desc"
            style={{
              fontSize: "11px",
              color: "var(--cnm-text-muted)",
              lineHeight: 1.3,
              marginBottom: "10px",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </p>
        </div>

        {/* Bottom Price & Action Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "10px",
            borderTop: "1px solid var(--cnm-border)",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {hasVariants && (
              <span style={{ fontSize: "10px", color: "var(--cnm-text-subtle)", fontWeight: 600 }}>
                FROM
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--cnm-text-primary)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {displayPrice.toLocaleString()} <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--cnm-text-muted)" }}>PKR</span>
            </span>
          </div>

          <button
            onClick={() => onSelect(product)}
            disabled={!isAvailable}
            className="btn btn-primary product-action-btn"
            style={{
              padding: "5px 8px",
              fontSize: "11px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {hasVariants ? (
              <>
                <SlidersHorizontal size={12} />
                <span className="btn-text">Options</span>
              </>
            ) : (
              <>
                <Plus size={12} />
                <span className="btn-text">Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 400px) {
          .btn-text {
            display: none !important;
          }
          .product-card-desc {
            display: none !important;
          }
          .product-card-body {
            padding: 8px 6px !important;
          }
          .product-action-btn {
            padding: 6px !important;
            width: 28px !important;
            height: 28px !important;
            justify-content: center !important;
            border-radius: 50% !important;
          }
        }
      `}</style>
    </article>
  );
}
