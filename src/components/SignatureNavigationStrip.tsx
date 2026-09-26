"use client";

import React, { useRef, useState, useEffect } from "react";
import { SIGNATURE_SECTIONS, SignatureSectionConfig } from "@/lib/signatureSections";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SignatureNavigationStripProps {
  activeSectionSlug: string;
  onSelectSection: (slug: string) => void;
  stickyTop?: number;
}

export function SignatureNavigationStrip({
  activeSectionSlug,
  onSelectSection,
  stickyTop,
}: SignatureNavigationStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = 220;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, slug: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectSection(slug);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIdx = (index + 1) % SIGNATURE_SECTIONS.length;
      const nextBtn = document.getElementById(`sig-btn-${SIGNATURE_SECTIONS[nextIdx].slug}`);
      nextBtn?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIdx = (index - 1 + SIGNATURE_SECTIONS.length) % SIGNATURE_SECTIONS.length;
      const prevBtn = document.getElementById(`sig-btn-${SIGNATURE_SECTIONS[prevIdx].slug}`);
      prevBtn?.focus();
    }
  };

  return (
    <nav
      aria-label="CNM Signature Sections"
      className="signature-navigation-wrapper"
      style={{
        width: "100%",
        padding: "3px 0 5px",
        position: "sticky",
        top: typeof stickyTop === "number" ? `${stickyTop}px` : "68px",
        zIndex: 35,
        backgroundColor: "var(--cnm-bg)",
        borderBottom: "1px solid var(--cnm-border)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        backdropFilter: "blur(10px)",
        transition: "top 0.15s ease, background-color 0.2s ease",
      }}
    >
      <div className="container">
        {/* Desktop Container with subtle overflow arrows if needed */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          {/* Left Arrow (Appears only if actual overflow exists on desktop) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll signature sections left"
              className="signature-scroll-arrow signature-arrow-left"
              style={{
                position: "absolute",
                left: "-18px",
                zIndex: 10,
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                color: "var(--cnm-text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Swipeable / Scrollable Horizontal Strip */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            role="tablist"
            className="signature-strip-track no-scrollbar"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "22px",
              overflowX: "auto",
              padding: "2px 6px 4px",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            {SIGNATURE_SECTIONS.filter((s) => s.isActive).map((sec, idx) => {
              const isActive = activeSectionSlug === sec.slug;

              return (
                <div
                  key={sec.id}
                  className="signature-item-box"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    scrollSnapAlign: "center",
                    flexShrink: 0,
                    userSelect: "none",
                  }}
                >
                  {/* Black Circular Icon Button (64-76px) */}
                  <button
                    id={`sig-btn-${sec.slug}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`section-${sec.slug}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => onSelectSection(sec.slug)}
                    onKeyDown={(e) => handleKeyDown(e, idx, sec.slug)}
                    title={sec.subtitle}
                    className={`signature-circle-btn ${isActive ? "active" : ""}`}
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      backgroundColor: "#171717",
                      border: isActive
                        ? "2.5px solid var(--cnm-orange)"
                        : "2px solid var(--cnm-border)",
                      boxShadow: isActive
                        ? "0 0 16px rgba(255, 130, 67, 0.35), 0 4px 14px rgba(35, 25, 15, 0.15)"
                        : "0 2px 8px rgba(35, 25, 15, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                      position: "relative",
                      overflow: "hidden",
                      padding: 0,
                    }}
                  >
                    {/* Inner Specular Edge */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: isActive
                          ? "radial-gradient(circle at 35% 25%, rgba(255, 130, 67, 0.22), transparent 70%)"
                          : "radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.12), transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />

                    {/* Icon Graphic (Optimized WebP) or Typographic Fallback */}
                    {sec.iconAsset ? (
                      <img
                        src={sec.iconAsset}
                        alt={sec.altText || `${sec.displayName} signature section`}
                        width={74}
                        height={74}
                        loading="eager"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                          display: "block",
                          zIndex: 1,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1,
                          lineHeight: 1,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "18px",
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            color: isActive ? "#ffffff" : "var(--cnm-cream)",
                            textTransform: "uppercase",
                          }}
                        >
                          {sec.glyph}
                        </span>
                        <div
                          style={{
                            width: "14px",
                            height: "2px",
                            backgroundColor: isActive ? "var(--cnm-orange)" : "rgba(255, 130, 67, 0.4)",
                            borderRadius: "2px",
                            marginTop: "3px",
                          }}
                        />
                      </div>
                    )}
                  </button>

                  {/* Label Below Icon */}
                  <span
                    className={`signature-label ${isActive ? "active" : ""}`}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "12px",
                      fontWeight: isActive ? 800 : 600,
                      color: "var(--cnm-text-primary)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-full)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.01em",
                      transition: "all 0.15s ease",
                      textTransform: "capitalize",
                    }}
                  >
                    {sec.displayName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Arrow (Desktop only if overflow exists) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll signature sections right"
              className="signature-scroll-arrow signature-arrow-right"
              style={{
                position: "absolute",
                right: "-18px",
                zIndex: 10,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                color: "var(--cnm-text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                cursor: "pointer",
              }}
            >
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .signature-circle-btn:hover {
          transform: translateY(-2px);
          border-color: var(--cnm-orange);
        }
        .signature-circle-btn:active {
          transform: scale(0.95);
        }

        @media (max-width: 640px) {
          .signature-scroll-arrow {
            display: none !important;
          }
          :global(.signature-navigation-wrapper) {
            padding: 2px 0 3px !important;
          }
          .signature-item-box {
            gap: 2px !important;
          }
          .signature-strip-track {
            justify-content: flex-start !important;
            gap: 12px !important;
            padding: 1px 12px 2px !important;
          }
          .signature-circle-btn {
            width: 44px !important;
            height: 44px !important;
            border-width: 2px !important;
          }
          .signature-label {
            font-size: 10.5px !important;
            line-height: 1.15 !important;
            padding: 1px 4px !important;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .signature-strip-track {
            justify-content: center !important;
            gap: 18px !important;
            padding: 2px 8px 4px !important;
          }
          .signature-circle-btn {
            width: 68px !important;
            height: 68px !important;
          }
        }

        @media (min-width: 1025px) {
          .signature-strip-track {
            justify-content: center !important;
            gap: 24px !important;
            padding: 2px 8px 4px !important;
          }
          .signature-circle-btn {
            width: 72px !important;
            height: 72px !important;
          }
        }
      `}</style>
    </nav>
  );
}
