"use client";

import React, { useState } from "react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  target?: "card" | "detail" | "thumbnail";
  aspectRatio?: string; // e.g. "4/3", "16/9", "1/1"
  priority?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Transforms a raw Cloudinary URL or publicId into an optimized, responsive Cloudinary URL.
 * Automatically applies:
 * - f_auto (auto WebP/AVIF depending on browser support)
 * - q_auto (intelligent quality optimization)
 * - c_limit,w_[WIDTH] (prevent serving giant multi-megabyte originals)
 */
export function buildCloudinaryUrl(
  urlOrId: string | null | undefined,
  width: number
): string {
  if (!urlOrId) return "";

  // If already a full Cloudinary delivery URL
  if (urlOrId.includes("res.cloudinary.com")) {
    const uploadIdx = urlOrId.indexOf("/image/upload/");
    if (uploadIdx !== -1) {
      const prefix = urlOrId.slice(0, uploadIdx + "/image/upload/".length);
      const afterUpload = urlOrId.slice(uploadIdx + "/image/upload/".length);

      // Strip existing transformations if present (e.g. f_auto,q_auto/ or v123/)
      // Cloudinary transformation segments don't have file extensions or are standard patterns
      const parts = afterUpload.split("/");
      let publicIdPart = afterUpload;

      if (parts.length > 1) {
        // If first part has comma or starts with common transform codes
        if (
          parts[0].includes(",") ||
          parts[0].startsWith("f_") ||
          parts[0].startsWith("q_") ||
          parts[0].startsWith("w_") ||
          parts[0].startsWith("c_")
        ) {
          publicIdPart = parts.slice(1).join("/");
        }
      }

      return `${prefix}c_limit,w_${width},f_auto,q_auto/${publicIdPart}`;
    }
  }

  // If provided as a raw Cloudinary public ID
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "duo55lhwh";
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${width},f_auto,q_auto/${urlOrId}`;
}

/**
 * Reusable ProductImage component conforming to CNM specifications:
 * - Next-gen responsive srcset for mobile (400w), tablet (600w), desktop (800w), modal (1000w)
 * - Fixed aspect ratio to guarantee zero Cumulative Layout Shift (CLS)
 * - Branded vector neutral seal fallback (Zero emojis)
 * - Adaptive light/dark theme contrast
 */
export function ProductImage({
  src,
  alt,
  target = "card",
  aspectRatio = "4/3",
  priority = false,
  sizes,
  className = "",
  style,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  // Generate responsive srcSet for Cloudinary
  const isCloudinary = src && (src.includes("res.cloudinary.com") || !src.startsWith("http"));

  // Default sizes based on target context
  const defaultSizes =
    sizes ||
    (target === "detail"
      ? "(max-width: 768px) 100vw, 800px"
      : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px");

  // Build responsive srcset
  let srcSet: string | undefined = undefined;
  let primarySrc = src || "";

  if (isCloudinary && src) {
    const w400 = buildCloudinaryUrl(src, 400);
    const w600 = buildCloudinaryUrl(src, 600);
    const w800 = buildCloudinaryUrl(src, 800);
    const w1000 = buildCloudinaryUrl(src, 1000);

    srcSet = `${w400} 400w, ${w600} 600w, ${w800} 800w, ${w1000} 1000w`;
    // Select default src based on target
    primarySrc = target === "detail" ? w1000 : target === "thumbnail" ? w400 : w600;
  }

  // Calculate percentage padding for aspect ratio to strictly avoid CLS
  let paddingTop = "75%"; // default 4:3
  if (aspectRatio === "16/9") paddingTop = "56.25%";
  if (aspectRatio === "16/10") paddingTop = "62.5%";
  if (aspectRatio === "1/1") paddingTop = "100%";
  if (aspectRatio === "3/2") paddingTop = "66.67%";

  const showFallback = !src || hasError;

  return (
    <div
      className={`cnm-product-image-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        paddingTop,
        backgroundColor: "var(--cnm-surface-elevated)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!showFallback ? (
          <img
            src={primarySrc}
            srcSet={srcSet}
            sizes={defaultSizes}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onError={() => setHasError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        ) : (
          /* Branded Neutral Fallback Card (No emojis, sleek vector seal) */
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at center, rgba(255, 130, 67, 0.12) 0%, var(--cnm-surface) 75%)",
              padding: "16px",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {/* CNM Signature Emblem Stamp */}
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                border: "1.5px dashed var(--cnm-orange)",
                backgroundColor: "rgba(255, 130, 67, 0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontSize: "13px",
                  color: "var(--cnm-orange)",
                  letterSpacing: "0.05em",
                  lineHeight: 1,
                }}
              >
                CNM
              </span>
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  color: "var(--cnm-text-muted)",
                  letterSpacing: "0.02em",
                  marginTop: "3px",
                  lineHeight: 1,
                }}
              >
                ORIGINAL
              </span>
            </div>

            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--cnm-text-secondary)",
                letterSpacing: "0.02em",
                maxWidth: "85%",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {alt}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
