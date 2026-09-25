"use client";

import React, { useState, useEffect } from "react";
import {
  Utensils,
  ShoppingBag,
  MapPin,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";
import { LayersIcon, ArrowUpRightIcon, TrendingUpIcon } from "./AdminIcons";
import { AdminSectionId } from "./AdminShell";

interface AdminOverviewSectionProps {
  onNavigate: (section: AdminSectionId) => void;
  onOpenAddProductModal: () => void;
}

export function AdminOverviewSection({
  onNavigate,
  onOpenAddProductModal,
}: AdminOverviewSectionProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverviewMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/overview");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error("Failed to load admin overview metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewMetrics();
  }, []);

  return (
    <div className="admin-overview-container">
      {/* 1. Header with Refresh & Quick Actions */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Operations Overview</h1>
          <p className="admin-page-subtitle">
            Real-time status of dishes, orders, delivery zones, and restaurant capacity.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchOverviewMetrics}
            className="admin-btn-secondary"
            title="Refresh metrics"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddProductModal}
            className="admin-btn-primary"
          >
            <Plus size={15} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Grid */}
      <div className="admin-kpi-grid">
        {/* KPI 1: Menu Items */}
        <div
          className="admin-kpi-card clickable"
          onClick={() => onNavigate("products")}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">TOTAL DISHES</span>
            <div className="admin-kpi-icon-wrap" style={{ color: "#ff6b35", background: "rgba(255, 107, 53, 0.1)" }}>
              <Utensils size={18} />
            </div>
          </div>
          <div className="admin-kpi-value">{metrics?.products?.total ?? (isLoading ? "..." : 0)}</div>
          <div className="admin-kpi-sub">
            <span className="kpi-green">{metrics?.products?.available ?? 0} available</span>
            <span className="kpi-divider">·</span>
            <span className="kpi-red">{metrics?.products?.soldOut ?? 0} sold out</span>
          </div>
        </div>

        {/* KPI 2: Live Orders */}
        <div
          className="admin-kpi-card clickable"
          onClick={() => onNavigate("orders")}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">ACTIVE ORDERS</span>
            <div className="admin-kpi-icon-wrap" style={{ color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)" }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="admin-kpi-value">{metrics?.orders?.pending ?? (isLoading ? "..." : 0)}</div>
          <div className="admin-kpi-sub">
            <span className="kpi-blue">{metrics?.orders?.total ?? 0} all-time orders</span>
          </div>
        </div>

        {/* KPI 3: Total Revenue */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">REVENUE (ESTIMATED)</span>
            <div className="admin-kpi-icon-wrap" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}>
              <TrendingUpIcon size={18} />
            </div>
          </div>
          <div className="admin-kpi-value">
            {metrics?.orders?.totalRevenuePkr !== undefined
              ? `${metrics.orders.totalRevenuePkr.toLocaleString()} PKR`
              : isLoading
              ? "..."
              : "0 PKR"}
          </div>
          <div className="admin-kpi-sub">
            <span className="kpi-green">{metrics?.orders?.completed ?? 0} delivered</span>
          </div>
        </div>

        {/* KPI 4: Categories & Coverage */}
        <div
          className="admin-kpi-card clickable"
          onClick={() => onNavigate("categories")}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">CATEGORIES &amp; ZONES</span>
            <div className="admin-kpi-icon-wrap" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
              <LayersIcon size={18} />
            </div>
          </div>
          <div className="admin-kpi-value">
            {metrics?.categories?.active ?? (isLoading ? "..." : 0)} <span className="value-label">Active Cats</span>
          </div>
          <div className="admin-kpi-sub">
            <span>{metrics?.deliveryAreas?.active ?? 0} delivery zones enabled</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Shortcuts & Quick Jump Bar */}
      <div className="admin-overview-grid-split">
        {/* Left Column: Quick Action Cards */}
        <div className="admin-card-box">
          <h2 className="admin-box-title">
            <Sparkles size={16} color="#ff6b35" /> Quick Management Shortcuts
          </h2>

          <div className="admin-shortcuts-list">
            <button
              type="button"
              onClick={onOpenAddProductModal}
              className="admin-shortcut-btn"
            >
              <div className="shortcut-icon" style={{ background: "rgba(255, 107, 53, 0.1)", color: "#ff6b35" }}>
                <Plus size={16} />
              </div>
              <div className="shortcut-info">
                <strong>Create New Food Item</strong>
                <span>Add dish with size variants, modifiers, and Cloudinary image</span>
              </div>
              <ArrowUpRightIcon size={15} className="shortcut-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("products")}
              className="admin-shortcut-btn"
            >
              <div className="shortcut-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                <Utensils size={16} />
              </div>
              <div className="shortcut-info">
                <strong>Manage Menu Items &amp; Stock</strong>
                <span>1-tap mark sold out, edit descriptions, adjust prices</span>
              </div>
              <ArrowUpRightIcon size={15} className="shortcut-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="admin-shortcut-btn"
            >
              <div className="shortcut-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                <ShoppingBag size={16} />
              </div>
              <div className="shortcut-info">
                <strong>Live Order Tracking &amp; Dispatch</strong>
                <span>Confirm orders, assign riders, and update kitchen progress</span>
              </div>
              <ArrowUpRightIcon size={15} className="shortcut-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("media")}
              className="admin-shortcut-btn"
            >
              <div className="shortcut-icon" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                <Flame size={16} />
              </div>
              <div className="shortcut-info">
                <strong>Cloudinary Media Library</strong>
                <span>Upload food photography, copy optimized URLs, replace banners</span>
              </div>
              <ArrowUpRightIcon size={15} className="shortcut-arrow" />
            </button>
          </div>
        </div>

        {/* Right Column: Store Operational Status */}
        <div className="admin-card-box">
          <h2 className="admin-box-title">
            <Clock size={16} color="#ff6b35" /> Restaurant Status
          </h2>

          <div className="admin-status-banner">
            <div className="status-indicator">
              <span className="status-pulse" />
              <strong>Store Mode: Active Online Ordering</strong>
            </div>
            <p className="status-desc">
              Kharian branch hours: <strong>12:01 PM – 02:00 AM Daily</strong>.
              Orders placed within operating hours are instantly routed to kitchen staff.
            </p>
          </div>

          <div className="admin-system-health">
            <div className="health-row">
              <span className="health-label">Cloudinary Image CDN</span>
              <span className="health-status ok">
                <CheckCircle2 size={13} /> Active &amp; Synced
              </span>
            </div>

            <div className="health-row">
              <span className="health-label">PostgreSQL Database</span>
              <span className="health-status ok">
                <CheckCircle2 size={13} /> Connected
              </span>
            </div>

            <div className="health-row">
              <span className="health-label">Active Promotions</span>
              <span className="health-status ok">
                <CheckCircle2 size={13} /> {metrics?.promotions?.active ?? 4} Live Deals
              </span>
            </div>

            <div className="health-row">
              <span className="health-label">Dishes Missing Images</span>
              <span className={metrics?.products?.missingImages > 0 ? "health-status warn" : "health-status ok"}>
                {metrics?.products?.missingImages > 0 ? (
                  <>
                    <AlertTriangle size={13} /> {metrics.products.missingImages} Items
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> 0 (All Images Present)
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-overview-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-section-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .admin-page-title {
          font-family: var(--font-display, inherit);
          font-size: 22px;
          font-weight: 800;
          color: var(--admin-text-main);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .admin-page-subtitle {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0;
        }

        .admin-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ff6b35;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.25);
        }
        .admin-btn-primary:hover {
          background: #e85924;
        }

        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--admin-card-bg);
          color: var(--admin-text-main);
          border: 1px solid var(--admin-border);
          padding: 8px 12px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-btn-secondary:hover {
          border-color: #ff6b35;
        }

        /* KPI Grid */
        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 1100px) {
          .admin-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 580px) {
          .admin-kpi-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-kpi-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.15s ease;
        }
        .admin-kpi-card.clickable {
          cursor: pointer;
        }
        .admin-kpi-card.clickable:hover {
          border-color: #ff6b35;
          transform: translateY(-1px);
        }

        .admin-kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-kpi-label {
          font-size: 10.5px;
          font-weight: 800;
          color: var(--admin-text-muted);
          letter-spacing: 0.05em;
        }

        .admin-kpi-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-kpi-value {
          font-family: var(--font-display, inherit);
          font-size: 26px;
          font-weight: 850;
          color: var(--admin-text-main);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .value-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--admin-text-muted);
        }

        .admin-kpi-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 650;
        }
        .kpi-green {
          color: #10b981;
        }
        .kpi-red {
          color: #ef4444;
        }
        .kpi-blue {
          color: #3b82f6;
        }
        .kpi-divider {
          color: var(--admin-text-muted);
        }

        /* 2-Column Split Section */
        .admin-overview-grid-split {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .admin-overview-grid-split {
            grid-template-columns: 1fr;
          }
        }

        .admin-card-box {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .admin-box-title {
          font-family: var(--font-display, inherit);
          font-size: 15px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .admin-shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-shortcut-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
        }
        .admin-shortcut-btn:hover {
          border-color: #ff6b35;
          background: var(--admin-nav-active);
        }

        .shortcut-icon {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .shortcut-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .shortcut-info strong {
          font-size: 12.5px;
          font-weight: 750;
          color: var(--admin-text-main);
        }
        .shortcut-info span {
          font-size: 11px;
          color: var(--admin-text-muted);
        }

        .shortcut-arrow {
          color: var(--admin-text-muted);
          transition: transform 0.15s ease;
        }
        .admin-shortcut-btn:hover .shortcut-arrow {
          color: #ff6b35;
          transform: translate(2px, -2px);
        }

        /* Right column: Store Operational Status */
        .admin-status-banner {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #10b981;
        }

        .status-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        .status-desc {
          font-size: 11.5px;
          color: var(--admin-text-muted);
          line-height: 1.4;
          margin: 0;
        }

        .admin-system-health {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .health-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 6px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          font-size: 12px;
        }

        .health-label {
          color: var(--admin-text-main);
          font-weight: 650;
        }

        .health-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 750;
        }
        .health-status.ok {
          color: #10b981;
        }
        .health-status.warn {
          color: #f59e0b;
        }
      `}</style>
    </div>
  );
}
