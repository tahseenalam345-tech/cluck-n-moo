"use client";

import React, { useEffect, useState } from "react";
import { Promotion } from "@/types";
import { Sparkles, ChevronRight } from "lucide-react";
import { buildCloudinaryUrl } from "./ProductImage";

import { COMPLETE_PROMOTIONS_DATA } from "@/lib/promotionRulesData";

interface PromotionsSectionProps {
  onSelectPromotion: (promotion: Promotion) => void;
}

export function PromotionsSection({ onSelectPromotion }: PromotionsSectionProps) {
  const [promotions, setPromotions] = useState<Promotion[]>(COMPLETE_PROMOTIONS_DATA);

  useEffect(() => {
    fetch("/api/v1/promotions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setPromotions(data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load promotions from API, keeping verified fallbacks:", err);
      });
  }, []);

  const displayPromotions = promotions.length > 0 ? promotions : COMPLETE_PROMOTIONS_DATA;

  return (
    <section id="promotions-section" className="promotions-section" aria-label="Deals You'll Love">
      <div className="container">
        <div className="promotions-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 className="promotions-title">
              <span className="promotions-badge-icon">🔥</span>
              Deals You’ll Love
            </h2>
            <span className="promotions-pill">HOT DEALS</span>
          </div>
        </div>

        {/* Compact Grid: 2 columns on mobile, 4 columns on desktop */}
        <div className="promotions-grid">
          {displayPromotions.map((promo) => {
            // Build Cloudinary optimized delivery URLs with auto WebP/AVIF and intelligent quality
            const isCloudinary = Boolean(promo.cloudinaryPublicId);
            const w400 = isCloudinary ? buildCloudinaryUrl(promo.cloudinaryPublicId, 400) : promo.imageUrl;
            const w800 = isCloudinary ? buildCloudinaryUrl(promo.cloudinaryPublicId, 800) : promo.imageUrl;
            const w1200 = isCloudinary ? buildCloudinaryUrl(promo.cloudinaryPublicId, 1200) : promo.imageUrl;
            const srcSet = isCloudinary ? `${w400} 400w, ${w800} 800w, ${w1200} 1200w` : undefined;

            return (
              <div
                key={promo.id}
                className="promotion-card card"
                onClick={() => onSelectPromotion(promo)}
                role="button"
                tabIndex={0}
                aria-label={`View deal: ${promo.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPromotion(promo);
                  }
                }}
              >
                {/* 3:1 Banner Aspect Ratio Container strictly matching Cloudinary promotion banners */}
                <div className="promotion-image-frame">
                  <img
                    src={w800}
                    srcSet={srcSet}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 300px"
                    alt={promo.title}
                    loading="lazy"
                    decoding="async"
                    className="promotion-image"
                  />

                  {/* Deal Badge */}
                  {promo.badgeText && (
                    <span className="promotion-badge">
                      <Sparkles size={9} />
                      {promo.badgeText}
                    </span>
                  )}

                  {/* Compact Bottom Bar */}
                  <div className="promotion-bottom-overlay">
                    <span className="promotion-view-deal">
                      View Deal <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .promotions-section {
          padding: 20px 0 24px;
          border-bottom: 1px solid var(--cnm-border);
          background-color: var(--cnm-surface-elevated);
        }
        .promotions-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--cnm-border);
        }
        .promotions-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 750;
          color: var(--cnm-text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .promotions-pill {
          font-size: 9px;
          font-weight: 800;
          color: var(--cnm-orange);
          background: rgba(255, 130, 67, 0.12);
          border: 1px solid rgba(255, 130, 67, 0.25);
          padding: 2px 6px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
        }
        .promotions-count {
          font-size: 11px;
          font-weight: 700;
          color: var(--cnm-text-muted);
          letter-spacing: 0.04em;
        }
        .promotions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @media (min-width: 480px) {
          .promotions-grid {
            gap: 10px;
          }
        }
        @media (min-width: 1024px) {
          .promotions-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }
        }
        .promotion-card {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          border-radius: var(--radius-md);
          border: 1px solid var(--cnm-border);
          background: var(--cnm-surface);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .promotion-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
          border-color: var(--cnm-orange);
        }
        .promotion-image-frame {
          position: relative;
          width: 100%;
          padding-top: 33.33%; /* 3:1 banner aspect ratio */
          overflow: hidden;
          background: #141414;
        }
        .promotion-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform 0.3s ease;
        }
        .promotion-card:hover .promotion-image {
          transform: scale(1.02);
        }
        .promotion-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          border: 1px solid rgba(255, 130, 67, 0.4);
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 2;
        }
        .promotion-bottom-overlay {
          position: absolute;
          bottom: 4px;
          right: 6px;
          z-index: 2;
        }
        .promotion-view-deal {
          font-size: 9px;
          font-weight: 800;
          color: #ffffff;
          background: var(--cnm-orange);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 2px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        }
        @media (max-width: 360px) {
          .promotions-title {
            font-size: 16px;
          }
          .promotion-badge {
            font-size: 7.5px;
            padding: 1px 4px;
          }
          .promotion-view-deal {
            font-size: 8px;
            padding: 1px 5px;
          }
        }
      `}</style>
    </section>
  );
}
