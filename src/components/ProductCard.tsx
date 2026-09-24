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
        style={{
          padding: "14px 12px",
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
              fontSize: "14.5px",
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
            style={{
              fontSize: "12px",
              color: "var(--cnm-text-muted)",
              lineHeight: 1.4,
              marginBottom: "14px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
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
                fontSize: "15px",
                fontWeight: 900,
                color: "var(--cnm-orange)",
                lineHeight: 1,
              }}
            >
              {displayPrice.toLocaleString()} <span style={{ fontSize: "11px", fontWeight: 700 }}>PKR</span>
            </span>
          </div>

          <button
            onClick={() => onSelect(product)}
            disabled={!isAvailable}
            className="btn btn-primary product-action-btn"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {hasVariants ? (
              <>
                <SlidersHorizontal size={13} />
                <span>Options</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
