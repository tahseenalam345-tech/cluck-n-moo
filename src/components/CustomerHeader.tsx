"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { useTheme } from "@/context/ThemeContext";
import { useOrderMode } from "@/context/OrderModeContext";
import { BRAND } from "@/lib/constants";
import {
  ShoppingBag,
  X,
  Sun,
  Moon,
  Bike,
  Clock,
  Utensils,
  MapPin,
  ChevronDown,
  Phone,
  Flame,
} from "lucide-react";

interface CustomerHeaderProps {
  cartCount?: number;
  cartTotalPkr?: number;
  onOpenCart?: () => void;
}

export function CustomerHeader({
  cartCount = 0,
  cartTotalPkr = 0,
  onOpenCart,
}: CustomerHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { modeState, openOrderModeModal } = useOrderMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState<{ isOpen: boolean; message: string }>({
    isOpen: true,
    message: "12:01 PM – 02:00 AM PKT",
  });

  useEffect(() => {
    fetch("/api/v1/store/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setStoreStatus({
            isOpen: data.data.isOpen,
            message: data.data.message || "12:01 PM – 02:00 AM PKT",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Format order mode chip text
  const getOrderModeLabel = () => {
    if (modeState.orderType === "DELIVERY") {
      return modeState.areaName ? `Delivery: ${modeState.areaName}` : "Delivery (Kharian)";
    }
    if (modeState.orderType === "PICKUP") {
      return "Takeaway (Main Branch)";
    }
    return modeState.dineInArrivalTime ? `Dine-In (${modeState.dineInArrivalTime})` : "Dine-In (Kharian)";
  };

  const getOrderModeIcon = () => {
    if (modeState.orderType === "DELIVERY") return <Bike size={14} color="var(--cnm-orange)" />;
    if (modeState.orderType === "PICKUP") return <Clock size={14} color="var(--cnm-orange)" />;
    return <Utensils size={14} color="var(--cnm-orange)" />;
  };

  return (
    <header
      id="main-customer-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backgroundColor: "var(--cnm-bg)",
        borderBottom: "1px solid var(--cnm-border)",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Live Store Status & Hotline Top Stripe */}
      <div
        style={{
          backgroundColor: "var(--cnm-surface-elevated)",
          borderBottom: "1px solid var(--cnm-border)",
          padding: "4px 16px",
          fontSize: "11px",
          color: "var(--cnm-text-muted)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: storeStatus.isOpen ? "#10b981" : "#ef4444",
                boxShadow: storeStatus.isOpen ? "0 0 8px #10b981" : "none",
              }}
            />
            <span style={{ fontWeight: 800, color: storeStatus.isOpen ? "#10b981" : "#ef4444" }}>
              {storeStatus.isOpen ? "OPEN NOW" : "CLOSED"}
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span className="status-full-schedule">Every day, 12:01 PM to 02:00 AM PKT</span>
            <span className="status-short-schedule">12:01 PM – 02:00 AM</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto", flexShrink: 0 }}>
            <a
              href={`tel:${BRAND.branch.phone}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--cnm-orange)",
                fontWeight: 700,
              }}
            >
              <Phone size={11} />
              <span className="status-phone-text">{BRAND.branch.phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Responsive Header Bar */}
      <div className="container" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "68px",
            padding: "4px 0",
            gap: "6px",
            width: "100%",
          }}
        >
          {/* Brand Logo */}
          <Link href="/" aria-label="Cluck N Moo Home" style={{ display: "flex", alignItems: "center", minWidth: 0, flexShrink: 1 }}>
            <BrandLogo size="md" showTagline={true} />
          </Link>

          {/* Desktop Navigation Links (hidden on mobile) */}
          <nav
            style={{
              display: "none",
              alignItems: "center",
              gap: "24px",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "0.03em",
            }}
            className="desktop-nav"
          >
            <Link href="/" style={{ color: "var(--cnm-text-primary)", transition: "color 0.15s" }}>
              HOME
            </Link>
            <Link href="/menu" style={{ color: "var(--cnm-text-muted)", transition: "color 0.15s" }}>
              MENU
            </Link>
            <Link href="/deals" style={{ color: "var(--cnm-orange)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Flame size={14} /> DEALS
            </Link>
            <Link href="/order/track" style={{ color: "var(--cnm-text-muted)", transition: "color 0.15s" }}>
              TRACK ORDER
            </Link>
            <Link href="/contact" style={{ color: "var(--cnm-text-muted)", transition: "color 0.15s" }}>
              CONTACT
            </Link>
          </nav>

          {/* Controls Cluster: Order-Mode Chip, Theme Toggle (desktop), Cart, Mobile Menu */}
          <div className="header-controls-cluster" style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>

            {/* Compact Order Mode / Location Chip */}
            <button
              onClick={openOrderModeModal}
              title="Change delivery location or order mode"
              className="order-mode-header-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-full)",
                padding: "6px 10px",
                color: "var(--cnm-text-primary)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                maxWidth: "170px",
                transition: "all 0.15s ease",
              }}
            >
              {getOrderModeIcon()}
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {getOrderModeLabel()}
              </span>
              <ChevronDown size={12} style={{ color: "var(--cnm-text-muted)", flexShrink: 0 }} />
            </button>

            {/* Dark / Light Theme Toggle (Desktop Only) */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="header-theme-toggle"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--cnm-surface)",
                border: "1px solid var(--cnm-border)",
                color: "var(--cnm-text-primary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Elevated Cart Button */}
            <button
              onClick={onOpenCart}
              aria-label="View Cart"
              className="header-cart-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: cartCount > 0 ? "var(--cnm-orange)" : "var(--cnm-surface)",
                color: cartCount > 0 ? "#ffffff" : "var(--cnm-text-primary)",
                border: cartCount > 0 ? "none" : "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "13px",
                boxShadow: cartCount > 0 ? "var(--shadow-cta)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <ShoppingBag size={17} />
              <span className="cart-text-desktop">
                {cartCount > 0 ? `${cartCount} • ${cartTotalPkr.toLocaleString()} PKR` : "CART"}
              </span>
              {cartCount > 0 && (
                <span className="cart-badge-mobile">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="mobile-hamburger-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--cnm-surface)",
                border: "1px solid var(--cnm-border)",
                color: "var(--cnm-text-primary)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {isMobileMenuOpen ? (
                <X size={20} color="var(--cnm-orange)" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Translucent Backdrop Overlay over the site */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="mobile-backdrop-overlay"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 998,
            transition: "opacity 0.25s ease",
          }}
        />
      )}

      {/* Translucent Glassmorphism Sidebar Drawer (Opens OVER the site) */}
      <aside
        className={`mobile-translucent-sidebar ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-label="Mobile Navigation Sidebar"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(340px, 86vw)",
          height: "100dvh",
          backgroundColor: theme === "dark" ? "rgba(20, 16, 14, 0.88)" : "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid var(--cnm-border)",
          boxShadow: "-12px 0 45px rgba(0, 0, 0, 0.65)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          transform: isMobileMenuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid var(--cnm-border)",
            backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <BrandLogo size="sm" showTagline={true} />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-text-primary)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Order Mode Quick Card */}
        <div style={{ padding: "16px 20px 8px" }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 130, 67, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getOrderModeIcon()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "10px", color: "var(--cnm-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Order Mode
                </p>
                <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--cnm-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {getOrderModeLabel()}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openOrderModeModal();
              }}
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--cnm-orange)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                flexShrink: 0,
              }}
            >
              Change
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "12px 16px",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "15px",
            letterSpacing: "0.02em",
            flex: 1,
          }}
        >
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              color: "var(--cnm-text-primary)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "background-color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>🏠</span>
            <span>HOME</span>
          </Link>
          <Link
            href="/menu"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              color: "var(--cnm-text-primary)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "background-color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>🍔</span>
            <span>FULL FOOD MENU</span>
          </Link>
          <Link
            href="/deals"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              color: "var(--cnm-orange)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(255, 130, 67, 0.08)",
              transition: "background-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Flame size={18} color="var(--cnm-orange)" />
              <span>EXCLUSIVE DEALS</span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 900,
                backgroundColor: "var(--cnm-orange)",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "var(--radius-full)",
              }}
            >
              HOT
            </span>
          </Link>
          <Link
            href="/order/track"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              color: "var(--cnm-text-primary)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "background-color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📦</span>
            <span>TRACK YOUR ORDER</span>
          </Link>
          <Link
            href="/contact"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              color: "var(--cnm-text-primary)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "background-color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>📍</span>
            <span>BRANCH & CONTACT</span>
          </Link>
        </nav>

        {/* Drawer Bottom Controls & Hotline */}
        <div
          style={{
            padding: "16px 20px 24px",
            borderTop: "1px solid var(--cnm-border)",
            backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Appearance Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13px",
              fontWeight: 800,
              color: "var(--cnm-text-primary)",
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {theme === "dark" ? <Sun size={16} color="var(--cnm-orange)" /> : <Moon size={16} color="var(--cnm-orange)" />}
              <span>Mode: {theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <span style={{ fontSize: "10px", color: "var(--cnm-orange)", textTransform: "uppercase" }}>
              Switch
            </span>
          </button>

          {/* Hotline Direct Call */}
          <a
            href={`tel:${BRAND.branch.phone}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "11px 16px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--cnm-surface-elevated)",
              border: "1px solid var(--cnm-border)",
              color: "var(--cnm-orange)",
              fontSize: "13px",
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            <Phone size={15} />
            <span>Call Hotline: {BRAND.branch.phone}</span>
          </a>

          <p
            style={{
              fontSize: "11px",
              color: "var(--cnm-text-muted)",
              textAlign: "center",
              marginTop: "4px",
            }}
          >
            100% Fresh & Halal • Cash on Delivery Only
          </p>
        </div>
      </aside>

      <style jsx>{`
        .status-short-schedule {
          display: none;
        }
        .cart-badge-mobile {
          display: none;
        }

        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-hamburger-btn {
            display: none !important;
          }
          .header-theme-toggle {
            display: flex !important;
          }
        }

        @media (max-width: 899px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-hamburger-btn {
            display: flex !important;
          }
          .header-theme-toggle {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .status-full-schedule {
            display: none !important;
          }
          .status-short-schedule {
            display: inline !important;
          }
          .header-controls-cluster {
            gap: 4px !important;
          }
          .order-mode-header-btn {
            max-width: 86px !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
          .cart-text-desktop {
            display: none !important;
          }
          .header-cart-btn {
            padding: 6px !important;
            min-width: 34px !important;
            width: 34px !important;
            height: 34px !important;
            justify-content: center !important;
          }
          .mobile-hamburger-btn {
            width: 34px !important;
            min-width: 34px !important;
            height: 34px !important;
            margin-right: 0 !important;
            flex-shrink: 0 !important;
          }
          .cart-badge-mobile {
            display: flex !important;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: -5px;
            right: -5px;
            width: 17px;
            height: 17px;
            border-radius: 50%;
            background-color: #ffffff;
            color: var(--cnm-orange);
            font-size: 10px;
            font-weight: 900;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
          }
        }

        @media (max-width: 380px) {
          .status-phone-text {
            display: none !important;
          }
          .order-mode-header-btn {
            max-width: 70px !important;
            font-size: 9px !important;
            padding: 3px 5px !important;
          }
          .header-cart-btn {
            width: 32px !important;
            min-width: 32px !important;
            height: 32px !important;
          }
          .mobile-hamburger-btn {
            width: 32px !important;
            min-width: 32px !important;
            height: 32px !important;
          }
        }

      `}</style>
    </header>
  );
}
