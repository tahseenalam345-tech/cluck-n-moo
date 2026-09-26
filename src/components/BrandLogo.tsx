"use client";

import React, { useState } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  layout?: "horizontal" | "vertical";
}

const SIZE_MAP = {
  sm: { box: 36, title: "15px", badge: "8px", tagline: "11px" },
  md: { box: 48, title: "18px", badge: "9px", tagline: "12px" },
  lg: { box: 64, title: "22px", badge: "10px", tagline: "14px" },
};

export function BrandLogo({ size = "md", showTagline = true, layout = "horizontal" }: BrandLogoProps) {
  const [imgSrc, setImgSrc] = useState<string>("/logo.png");
  const [imgError, setImgError] = useState(false);

  const dim = SIZE_MAP[size] || SIZE_MAP.md;
  const isVertical = layout === "vertical";

  return (
    <div
      className={`brand-logo-container ${isVertical ? "brand-logo-vertical" : ""}`}
      style={{
        display: isVertical ? "flex" : "inline-flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: isVertical ? "12px" : "10px",
        userSelect: "none",
        flexShrink: 0,
        maxWidth: "100%",
        textAlign: isVertical ? "center" : "left",
      }}
    >
      {!imgError && (
        <div
          className={`brand-logo-img-wrap brand-logo-${size}`}
          style={{
            width: `${dim.box}px`,
            height: `${dim.box}px`,
            minWidth: `${dim.box}px`,
            minHeight: `${dim.box}px`,
            maxWidth: `${dim.box}px`,
            maxHeight: `${dim.box}px`,
            flexShrink: 0,
            borderRadius: "50%",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0C0C0C",
            border: "1.5px solid rgba(255, 130, 67, 0.4)",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
          }}
        >
          <img
            src={imgSrc}
            alt="Cluck N Moo Logo"
            onError={() => {
              if (imgSrc === "/logo.png") {
                setImgSrc("/logo.jpg");
              } else {
                setImgError(true);
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "50%",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Authoritative Typographic Lockup */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          justifyContent: "center",
          alignItems: isVertical ? "center" : "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          <span
            className={`brand-logo-title brand-logo-title-${size}`}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: dim.title,
              color: "var(--cnm-text-primary)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            CLUCK <span style={{ color: "var(--cnm-orange)" }}>N</span> MOO
          </span>
          <span
            className="brand-logo-badge"
            style={{
              backgroundColor: "var(--cnm-surface)",
              border: "1.5px solid var(--cnm-orange)",
              color: "var(--cnm-orange)",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "4px",
              lineHeight: 1,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.04em",
              fontSize: dim.badge,
              whiteSpace: "nowrap",
            }}
          >
            CNM
          </span>
        </div>

        {showTagline && (
          <span
            className="brand-logo-tagline"
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: dim.tagline,
              color: "var(--cnm-text-secondary)",
              fontWeight: 700,
              marginTop: "1px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              lineHeight: 1.1,
            }}
          >
            juiciest in town <span style={{ color: "var(--cnm-orange)" }}>•</span> Kharian
          </span>
        )}
      </div>
    </div>
  );
}
