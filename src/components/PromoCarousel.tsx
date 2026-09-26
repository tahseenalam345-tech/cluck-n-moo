"use client";

import React, { useState, useEffect, useRef } from "react";
import { ACTIVE_PROMOTIONS, PromotionBanner } from "@/lib/promotions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCloudinaryUrl } from "./ProductImage";

interface PromoCarouselProps {
  onSelectPromotion?: (promo: PromotionBanner) => void;
}

export function PromoCarousel({ onSelectPromotion }: PromoCarouselProps) {
  const activePromos = ACTIVE_PROMOTIONS.filter((p) => p.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-slide smoothly every 5 seconds
  useEffect(() => {
    if (activePromos.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }, 12000);

    return () => clearInterval(timer);
  }, [activePromos.length, isPaused]);

  if (activePromos.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activePromos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      aria-label="Exclusive Deals and Promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        margin: "14px 0 20px",
        position: "relative",
      }}
    >
      <div className="container">
        {/* Fixed Outer Mask Container with Exact Same Dimensions for all Banners */}
        <div
          className="promo-carousel-container"
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "33.333%",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid var(--cnm-border)",
            backgroundColor: "var(--cnm-surface)",
          }}
        >
          {/* Smooth Sliding Track */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              width: "100%",
              height: "100%",
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)",
              willChange: "transform",
            }}
          >
            {activePromos.map((promo, idx) => (
              <div
                key={promo.id}
                onClick={() => onSelectPromotion && onSelectPromotion(promo)}
                role="button"
                tabIndex={0}
                aria-label={`Open promotion ${promo.title}`}
                className="promo-slide-item"
                style={{
                  minWidth: "100%",
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: promo.bgGradient,
                  overflow: "hidden",
                  userSelect: "none",
                }}
              >
                {/* Visual Deal Banner Image / Artwork (No text or buttons overlaid) */}
                {promo.imageUrl ? (
                  <img
                    src={buildCloudinaryUrl(promo.imageUrl, 800) || promo.imageUrl}
                    srcSet={
                      promo.imageUrl.includes("cloudinary.com")
                        ? `${buildCloudinaryUrl(promo.imageUrl, 500)} 500w, ${buildCloudinaryUrl(promo.imageUrl, 800)} 800w, ${buildCloudinaryUrl(promo.imageUrl, 1200)} 1200w`
                        : undefined
                    }
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
                    alt={promo.title}
                    width={1200}
                    height={400}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={idx === 0 ? "high" : "low"}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      background: promo.bgGradient,
                    }}
                  >
                    {/* Atmospheric Glow Rings */}
                    <div
                      style={{
                        position: "absolute",
                        width: "280px",
                        height: "280px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(255, 130, 67, 0.22) 0%, transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />

                    {/* Clean Graphic Banner Design */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        height: "100%",
                        padding: "0 28px",
                        zIndex: 1,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            color: "var(--cnm-orange)",
                            textTransform: "uppercase",
                          }}
                        >
                          🔥 {promo.badge}
                        </span>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#ffffff",
                            lineHeight: 1.15,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {promo.title}
                        </div>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "#F3EAE0",
                            maxWidth: "480px",
                            lineHeight: 1.4,
                          }}
                        >
                          {promo.subtitle}
                        </div>
                      </div>

                      {promo.priceHighlight && (
                        <div
                          style={{
                            backgroundColor: "var(--cnm-orange)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "14px",
                            padding: "6px 14px",
                            borderRadius: "var(--radius-full)",
                            boxShadow: "0 4px 14px rgba(255, 130, 67, 0.4)",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {promo.priceHighlight}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Left / Right Navigation Chevrons */}
          <div
            className="carousel-desktop-arrows"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              pointerEvents: "none",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous Deal"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                pointerEvents: "auto",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next Deal"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                pointerEvents: "auto",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Pagination Dots at Bottom Center */}
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              zIndex: 3,
            }}
          >
            {activePromos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  padding: "0",
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                <span
                  style={{
                    width: idx === currentIndex ? "18px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    backgroundColor: idx === currentIndex ? "var(--cnm-orange)" : "rgba(255, 255, 255, 0.55)",
                    transition: "opacity 0.25s ease, background-color 0.25s ease",
                    display: "block",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .promo-carousel-container {
          width: 100%;
          padding-top: 33.333%;
          position: relative;
        }
        .promo-slide-item {
          width: 100%;
          height: 100%;
        }

        @media (max-width: 640px) {
          .carousel-desktop-arrows {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
