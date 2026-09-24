"use client";

import React, { useState } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const SIZE_MAP = {
  sm: { box: 36, title: "15px", badge: "8px", tagline: "11px" },
  md: { box: 48, title: "18px", badge: "9px", tagline: "12px" },
  lg: { box: 60, title: "22px", badge: "10px", tagline: "13px" },
};

export function BrandLogo({ size = "md", showTagline = true }: BrandLogoProps) {
  const [imgSrc, setImgSrc] = useState<string>("/logo.png");
  const [imgError, setImgError] = useState(false);

  const dim = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className="brand-logo-container"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
        flexShrink: 0,
        maxWidth: "100%",
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
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "center" }}>
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
              backgroundColor: "rgba(255, 130, 67, 0.12)",
              border: "1px solid rgba(255, 130, 67, 0.35)",
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
              color: "var(--cnm-orange)",
              marginTop: "2px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              lineHeight: 1.1,
            }}
          >
            juiciest in town • Kharian
          </span>
        )}
      </div>
    </div>
  );
}
