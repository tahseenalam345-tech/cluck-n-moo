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
      onClick={() => isAvailable && onSelect(product)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        position: "relative",
        opacity: isAvailable ? 1 : 0.65,
        cursor: isAvailable ? "pointer" : "not-allowed",
      }}
    >
      {/* Top Image Frame with Compact Aspect Ratio (16:10) via ProductImage */}
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
          aspectRatio="16/10"
          priority={priority}
        />

        {/* Status / Feature Badges */}
        <div
          style={{
            position: "absolute",
            top: "6px",
            left: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            zIndex: 2,
          }}
        >
          {product.isFeatured === 1 && (
            <span className="badge badge-orange" style={{ fontSize: "8px", padding: "1px 5px", fontWeight: 700 }}>
              ★ POPULAR
            </span>
          )}
          {(product.categoryId === "cat_box_deals" || product.categoryId === "cat_combo_deals") && (
            <span className="badge badge-outline" style={{ fontSize: "8px", padding: "1px 5px", backgroundColor: "var(--cnm-surface)", fontWeight: 700 }}>
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
                fontSize: "10px",
                letterSpacing: "0.08em",
                padding: "3px 8px",
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
          padding: "7px 7px 6px 7px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            className="product-card-title"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "12.5px",
              fontWeight: 650,
              lineHeight: 1.25,
              color: "var(--cnm-text-primary)",
              marginBottom: "3px",
              letterSpacing: "-0.01em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </h3>

          <p
            className="product-card-desc"
            style={{
              fontSize: "10px",
              color: "var(--cnm-text-muted)",
              lineHeight: 1.22,
              marginBottom: "5px",
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
          className="product-card-footer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "6px",
            borderTop: "1px solid var(--cnm-border)",
            marginTop: "auto",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "center" }}>
            {hasVariants && (
              <span
                className="product-card-from"
                style={{
                  fontSize: "9px",
                  color: "var(--cnm-orange)",
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                FROM
              </span>
            )}
            <div
              className="product-card-price-container"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "3px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="product-card-price"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "17px",
                  fontWeight: 850,
                  color: "var(--cnm-orange)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                {displayPrice.toLocaleString()}
              </span>
              <span
                className="product-card-currency"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  color: "var(--cnm-orange)",
                  opacity: 0.9,
                  letterSpacing: "0.02em",
                }}
              >
                PKR
              </span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onSelect(product); }}
            disabled={!isAvailable}
            className="btn btn-primary product-action-btn"
            style={{
              padding: "4px 9px",
              fontSize: "11px",
              fontWeight: 750,
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              height: "28px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
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
        .product-card {
          width: 100%;
          min-width: 0;
        }
        .product-card-price {
          font-size: 17px;
          font-weight: 850;
        }
        @media (max-width: 640px) {
          .product-card-body {
            padding: 7px 6px 6px 6px !important;
          }
          .product-card-title {
            font-size: 12px !important;
            margin-bottom: 2px !important;
          }
          .product-card-desc {
            font-size: 9.5px !important;
            line-height: 1.25 !important;
            margin-bottom: 4px !important;
          }
          .product-card-footer {
            padding-top: 5px !important;
          }
          .product-card-price {
            font-size: 15.5px !important;
            font-weight: 850 !important;
          }
          .product-card-currency {
            font-size: 9.5px !important;
          }
          .product-action-btn {
            padding: 3.5px 7px !important;
            font-size: 10.5px !important;
            height: 26px !important;
          }
        }
        @media (max-width: 380px) {
          .btn-text {
            display: none !important;
          }
          .product-card-price {
            font-size: 14.5px !important;
          }
          .product-action-btn {
            padding: 3px !important;
            min-width: 24px !important;
            height: 24px !important;
            justify-content: center !important;
            border-radius: var(--radius-sm) !important;
          }
        }
      `}</style>
    </article>
  );
}
