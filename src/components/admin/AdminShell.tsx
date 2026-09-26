"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  Utensils,
  Sparkles,
  Flame,
  MapPin,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import {
  DashboardIcon,
  LayersIcon,
  SlidersIcon,
  ImageIcon,
  UsersIcon,
  LogOutIcon,
  ExternalLinkIcon,
  KitchenIcon,
  RiderIcon,
} from "./AdminIcons";
import { BrandLogo } from "@/components/BrandLogo";

export type AdminSectionId =
  | "overview"
  | "orders"
  | "categories"
  | "products"
  | "deals"
  | "modifiers"
  | "media"
  | "promotions"
  | "delivery"
  | "settings"
  | "staff"
  | "audit";

interface AdminShellProps {
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  userEmail?: string | null;
  pendingOrdersCount?: number;
  totalProductsCount?: number;
  children: React.ReactNode;
}

export function AdminShell({
  activeSection,
  onSelectSection,
  userEmail,
  pendingOrdersCount = 0,
  totalProductsCount = 0,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/staff/login");
    } catch {
      router.push("/staff/login");
    }
  };

  const navItems: Array<{
    id: AdminSectionId;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    { id: "overview", label: "Overview", icon: DashboardIcon },
    {
      id: "orders",
      label: "Live Orders",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: "#ff6b35",
    },
    { id: "categories", label: "Menu Categories", icon: LayersIcon },
    {
      id: "products",
      label: "Menu Items",
      icon: Utensils,
      badge: totalProductsCount > 0 ? totalProductsCount : undefined,
    },
    { id: "deals", label: "Deals & Combos", icon: Sparkles },
    { id: "modifiers", label: "Add-ons & Modifiers", icon: SlidersIcon },
    { id: "media", label: "Media Library", icon: ImageIcon },
    { id: "promotions", label: "Promotions", icon: Flame },
    { id: "delivery", label: "Delivery Areas", icon: MapPin },
    { id: "settings", label: "Hours & Settings", icon: Clock },
    { id: "staff", label: "Staff & Riders", icon: UsersIcon },
    { id: "audit", label: "Audit Activity", icon: ShieldCheck },
  ];

  const handleNavClick = (id: AdminSectionId) => {
    onSelectSection(id);
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className={`admin-app-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      {/* 1. Desktop & Mobile Sticky Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <button
            type="button"
            aria-label="Toggle mobile menu"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="admin-mobile-menu-btn"
          >
            {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="admin-brand">
            <BrandLogo size="sm" />
            <div className="admin-badge-col">
              <span className="admin-badge-text">CONTROL CENTER</span>
              <span className="admin-badge-env">OPERATIONS</span>
            </div>
          </div>
        </div>

        <div className="admin-header-right">
          {/* View Customer Website Link */}
          <Link
            href="/"
            target="_blank"
            className="admin-store-link"
            title="Open customer storefront in new tab"
          >
            <span>Customer Site</span>
            <ExternalLinkIcon size={13} />
          </Link>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="admin-header-btn"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User info & Logout */}
          <div className="admin-user-pill">
            <span className="admin-user-dot" />
            <span className="admin-user-email">{userEmail || "Admin"}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="admin-logout-btn"
            title="Sign out of Admin"
          >
            <LogOutIcon size={15} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <div className="admin-body-container">
        {/* 2. Desktop Sidebar */}
        <aside className={`admin-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className="admin-sidebar-nav">
            <span className="admin-nav-group-title">RESTAURANT MANAGEMENT</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`admin-nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={17} className="admin-nav-icon" />
                  <span className="admin-nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="admin-nav-badge"
                      style={item.badgeColor ? { backgroundColor: item.badgeColor } : undefined}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={13} className="admin-nav-arrow" />}
                </button>
              );
            })}

            <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid var(--admin-border-subtle, rgba(255,255,255,0.06))" }}>
              <span className="admin-nav-group-title" style={{ display: "block", marginBottom: "0.5rem" }}>OPERATIONS & WORKSTATIONS</span>
              <Link
                href="/kitchen"
                className="admin-nav-item"
                title="Open Live Kitchen Display Board"
              >
                <KitchenIcon size={17} className="admin-nav-icon" color="#f97316" />
                <span className="admin-nav-label">Kitchen Display</span>
                <span
                  className="admin-nav-badge"
                  style={{ backgroundColor: "rgba(249, 115, 22, 0.15)", color: "#f97316", fontWeight: 700, fontSize: "0.68rem" }}
                >
                  LIVE
                </span>
              </Link>
              <Link
                href="/rider"
                className="admin-nav-item"
                title="Open Rider Delivery Dispatch Board"
              >
                <RiderIcon size={17} className="admin-nav-icon" color="#3b82f6" />
                <span className="admin-nav-label">Rider Dispatch</span>
                <span
                  className="admin-nav-badge"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontWeight: 700, fontSize: "0.68rem" }}
                >
                  DISPATCH
                </span>
              </Link>
            </div>
          </div>

          <div className="admin-sidebar-footer">
            <span className="admin-version-tag">Cluck N Moo v2.4 · Admin</span>
          </div>
        </aside>

        {/* 3. Mobile Slide-out Drawer */}
        {isMobileDrawerOpen && (
          <div
            className="admin-drawer-backdrop"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <div
              className="admin-drawer-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-drawer-header">
                <BrandLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="admin-drawer-close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-drawer-nav">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`admin-nav-item ${isActive ? "active" : ""}`}
                    >
                      <Icon size={18} className="admin-nav-icon" />
                      <span className="admin-nav-label">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className="admin-nav-badge"
                          style={item.badgeColor ? { backgroundColor: item.badgeColor } : undefined}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--admin-border-subtle, rgba(255,255,255,0.06))" }}>
                  <span className="admin-nav-group-title" style={{ display: "block", marginBottom: "0.5rem" }}>OPERATIONS</span>
                  <Link
                    href="/kitchen"
                    className="admin-nav-item"
                    onClick={() => setIsMobileDrawerOpen(false)}
                  >
                    <KitchenIcon size={18} className="admin-nav-icon" color="#f97316" />
                    <span className="admin-nav-label">Kitchen Display</span>
                    <span
                      className="admin-nav-badge"
                      style={{ backgroundColor: "rgba(249, 115, 22, 0.15)", color: "#f97316", fontWeight: 700, fontSize: "0.68rem" }}
                    >
                      LIVE
                    </span>
                  </Link>
                  <Link
                    href="/rider"
                    className="admin-nav-item"
                    onClick={() => setIsMobileDrawerOpen(false)}
                  >
                    <RiderIcon size={18} className="admin-nav-icon" color="#3b82f6" />
                    <span className="admin-nav-label">Rider Dispatch</span>
                    <span
                      className="admin-nav-badge"
                      style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontWeight: 700, fontSize: "0.68rem" }}
                    >
                      DISPATCH
                    </span>
                  </Link>
                </div>
              </div>

              <div className="admin-drawer-footer">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="admin-drawer-logout"
                >
                  <LogOutIcon size={16} /> Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Main Dynamic Workspace Content */}
        <main className="admin-main-panel">{children}</main>
      </div>

      <style jsx global>{`
        /* Global Admin System Theme */
        .admin-app-root.theme-light {
          --admin-bg: #f8fafc;
          --admin-card-bg: #ffffff;
          --admin-card-elevated: #ffffff;
          --admin-border: #e2e8f0;
          --admin-border-focus: #ff6b35;
          --admin-text-main: #0f172a;
          --admin-text-muted: #64748b;
          --admin-sidebar-bg: #ffffff;
          --admin-sidebar-border: #e2e8f0;
          --admin-nav-hover: #f1f5f9;
          --admin-nav-active: rgba(255, 107, 53, 0.1);
          --admin-header-bg: #ffffff;
        }
        .admin-app-root.theme-dark {
          --admin-bg: #09090b;
          --admin-card-bg: #141417;
          --admin-card-elevated: #1a1a1f;
          --admin-border: #27272a;
          --admin-border-focus: #ff6b35;
          --admin-text-main: #f4f4f5;
          --admin-text-muted: #a1a1aa;
          --admin-sidebar-bg: #111113;
          --admin-sidebar-border: #27272a;
          --admin-nav-hover: #1c1c21;
          --admin-nav-active: rgba(255, 107, 53, 0.15);
          --admin-header-bg: #111113;
        }

        .admin-app-root {
          min-height: 100vh;
          background-color: var(--admin-bg);
          color: var(--admin-text-main);
          font-family: var(--font-body, system-ui, -apple-system, sans-serif);
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--admin-header-bg);
          border-bottom: 1px solid var(--admin-border);
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-mobile-menu-btn {
          display: none;
          background: transparent;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text-main);
          padding: 6px;
          cursor: pointer;
        }
        @media (max-width: 900px) {
          .admin-mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-badge-col {
          display: flex;
          flex-direction: column;
        }

        .admin-badge-text {
          font-family: var(--font-display, inherit);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.06em;
          color: #ff6b35;
          line-height: 1.1;
        }

        .admin-badge-env {
          font-size: 8.5px;
          font-weight: 750;
          letter-spacing: 0.04em;
          color: var(--admin-text-muted);
        }

        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-store-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--admin-text-muted);
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 5px 10px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .admin-store-link:hover {
          color: #ff6b35;
          border-color: #ff6b35;
        }
        @media (max-width: 640px) {
          .admin-store-link {
            display: none;
          }
        }

        .admin-header-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text-main);
          cursor: pointer;
        }

        .admin-user-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .admin-user-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }
        @media (max-width: 640px) {
          .admin-user-pill {
            display: none;
          }
        }

        .admin-logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
          font-size: 11px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        @media (max-width: 480px) {
          .logout-text {
            display: none;
          }
        }

        /* Body container with Sidebar and Main content */
        .admin-body-container {
          display: flex;
          flex: 1;
          min-height: calc(100vh - 60px);
        }

        .admin-sidebar {
          width: 240px;
          background: var(--admin-sidebar-bg);
          border-right: 1px solid var(--admin-sidebar-border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 10px;
          flex-shrink: 0;
        }
        @media (max-width: 900px) {
          .admin-sidebar {
            display: none;
          }
        }

        .admin-sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .admin-nav-group-title {
          font-size: 9.5px;
          font-weight: 800;
          color: var(--admin-text-muted);
          letter-spacing: 0.08em;
          padding: 6px 10px 8px;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8.5px 11px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: var(--admin-text-main);
          font-size: 12.5px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .admin-nav-item:hover {
          background: var(--admin-nav-hover);
        }
        .admin-nav-item.active {
          background: var(--admin-nav-active);
          color: #ff6b35;
          font-weight: 750;
        }
        .admin-nav-icon {
          color: var(--admin-text-muted);
          flex-shrink: 0;
        }
        .admin-nav-item.active .admin-nav-icon {
          color: #ff6b35;
        }
        .admin-nav-label {
          flex: 1;
        }
        .admin-nav-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 10px;
          background: var(--admin-border);
          color: var(--admin-text-main);
        }
        .admin-nav-item.active .admin-nav-badge {
          background: #ff6b35;
          color: #ffffff;
        }
        .admin-nav-arrow {
          color: #ff6b35;
        }

        .admin-sidebar-footer {
          padding-top: 16px;
          border-top: 1px solid var(--admin-sidebar-border);
          text-align: center;
        }
        .admin-version-tag {
          font-size: 10px;
          font-weight: 600;
          color: var(--admin-text-muted);
        }

        /* Mobile Drawer */
        .admin-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
        }
        .admin-drawer-content {
          width: 280px;
          max-width: 85%;
          height: 100%;
          background: var(--admin-card-bg);
          border-right: 1px solid var(--admin-border);
          display: flex;
          flex-direction: column;
          animation: slideRight 0.25s ease;
        }
        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .admin-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--admin-border);
        }
        .admin-drawer-close {
          background: transparent;
          border: none;
          color: var(--admin-text-main);
          cursor: pointer;
        }
        .admin-drawer-nav {
          flex: 1;
          overflow-y: auto;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .admin-drawer-footer {
          padding: 14px 16px;
          border-top: 1px solid var(--admin-border);
        }
        .admin-drawer-logout {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
          font-size: 12px;
          font-weight: 750;
          justify-content: center;
          cursor: pointer;
        }

        /* Main Workspace Panel */
        .admin-main-panel {
          flex: 1;
          min-width: 0;
          padding: 20px 24px;
          overflow-x: hidden;
        }
        @media (max-width: 640px) {
          .admin-main-panel {
            padding: 14px 12px;
          }
        }
      `}</style>
    </div>
  );
}
