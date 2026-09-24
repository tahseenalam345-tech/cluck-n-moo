"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, ShoppingBag } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { BrandLogo } from "./BrandLogo";

interface HeaderProps {
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
}

export function Header({ cartCount, cartSubtotal, onOpenCart }: HeaderProps) {
  const [storeStatus, setStoreStatus] = useState<{
    isOpen: boolean;
    currentPktTime: string;
    scheduleText: string;
    announcementBanner?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/v1/store/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStoreStatus(data.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header
      style={{
        backgroundColor: "var(--cnm-surface)",
        borderBottom: "1px solid var(--cnm-border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Optional Emergency Announcement Banner */}
      {storeStatus?.announcementBanner && (
        <div
          style={{
            backgroundColor: "var(--cnm-orange)",
            color: "var(--cnm-white)",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: 800,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {storeStatus.announcementBanner}
        </div>
      )}

      {/* Top Utility Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          borderBottom: "1px solid var(--cnm-border)",
          fontSize: "12px",
          color: "var(--cnm-text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {storeStatus ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className={storeStatus.isOpen ? "pulse-dot" : "pulse-dot-red"} />
              <span
                style={{
                  color: storeStatus.isOpen ? "var(--status-ready)" : "var(--status-cancelled)",
                  fontWeight: 800,
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                }}
              >
                {storeStatus.isOpen ? "OPEN NOW" : "CLOSED"}
              </span>
              <span style={{ color: "var(--cnm-border)" }}>•</span>
              <span style={{ fontSize: "11px" }}>12:01 PM – 02:00 AM PKT</span>
            </span>
          ) : (
            <span style={{ fontSize: "11px" }}>Checking hours...</span>
          )}
        </div>

        <a
          href={`tel:${BRAND.branch.phone}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "var(--cnm-orange)",
            fontWeight: 700,
            fontSize: "12px",
          }}
        >
          <Phone size={12} />
          <span>{BRAND.branch.phone}</span>
        </a>
      </div>

      {/* Main Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
        }}
      >
        <Link href="/" aria-label="Cluck N Moo Home">
          <BrandLogo size="md" />
        </Link>

        {/* Elevated Floating Cart Button */}
        <button
          onClick={onOpenCart}
          aria-label="View Cart"
          style={{
            position: "relative",
            backgroundColor: cartCount > 0 ? "var(--cnm-orange)" : "var(--cnm-surface-elevated)",
            color: cartCount > 0 ? "var(--cnm-white)" : "var(--cnm-text-secondary)",
            border: cartCount > 0 ? "none" : "1px solid var(--cnm-border)",
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "13px",
            boxShadow: cartCount > 0 ? "var(--shadow-cta)" : "none",
            transition: "all 0.18s ease",
          }}
        >
          <ShoppingBag size={17} />
          {cartCount > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  backgroundColor: "var(--cnm-black)",
                  color: "var(--cnm-white)",
                  fontSize: "11px",
                  fontWeight: 900,
                  borderRadius: "var(--radius-full)",
                  padding: "1px 6px",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {cartCount}
              </span>
              <span style={{ fontWeight: 900 }}>{cartSubtotal.toLocaleString()} PKR</span>
            </div>
          ) : (
            <span>Tray (0)</span>
          )}
        </button>
      </div>
    </header>
  );
}
