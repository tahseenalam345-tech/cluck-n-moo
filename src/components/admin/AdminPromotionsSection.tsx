"use client";

import React, { useState, useEffect } from "react";
import { Flame, Sparkles, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Promotion } from "@/types";
import { buildCloudinaryUrl } from "../ProductImage";

export function AdminPromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/promotions");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPromotions(data.data);
      }
    } catch (err) {
      console.error("Failed to load promotions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  return (
    <div className="admin-promotions-container">
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Homepage Promotion Deals</h1>
          <p className="admin-page-subtitle">
            Manage the 4 verified Cloudinary billboard promotions, launch offers, and tier rules.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchPromotions}
            className="admin-btn-secondary"
            title="Refresh promotions"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="admin-promos-grid">
        {promotions.map((promo) => (
          <div key={promo.id} className="admin-promo-card">
            <div className="promo-img-box">
              <img
                src={buildCloudinaryUrl(promo.cloudinaryPublicId, 600) || promo.imageUrl}
                alt={promo.title}
                className="promo-img"
              />
              {promo.badgeText && <span className="promo-badge">{promo.badgeText}</span>}
            </div>

            <div className="promo-body">
              <div className="promo-header-row">
                <h3 className="promo-title">{promo.title}</h3>
                <span className="promo-price">{promo.fixedPricePkr.toLocaleString()} PKR</span>
              </div>

              {promo.shortDescription && <p className="promo-desc">{promo.shortDescription}</p>}

              <div className="promo-rules-count">
                <Flame size={13} color="#ff6b35" />
                <span>
                  {(promo.rules || []).length} Selection Rules Active (Flavors, Drinks, Options)
                </span>
              </div>

              <div className="promo-footer-row">
                <span className={promo.isActive ? "status-tag active" : "status-tag inactive"}>
                  {promo.isActive ? (
                    <>
                      <CheckCircle2 size={12} /> Active on Storefront
                    </>
                  ) : (
                    <>
                      <XCircle size={12} /> Inactive
                    </>
                  )}
                </span>
                <span className="promo-order">Order #{promo.displayOrder}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-promotions-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
        }

        .admin-page-subtitle {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0;
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
        }

        .admin-promos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .admin-promo-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .promo-img-box {
          position: relative;
          width: 100%;
          height: 140px;
          background: #141416;
        }
        .promo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .promo-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: #ffffff;
          border: 1px solid rgba(255, 107, 53, 0.5);
          font-size: 9.5px;
          font-weight: 850;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .promo-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .promo-header-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }
        .promo-title {
          font-family: var(--font-display, inherit);
          font-size: 15px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
        }
        .promo-price {
          font-family: var(--font-display, inherit);
          font-size: 16px;
          font-weight: 850;
          color: #ff6b35;
          white-space: nowrap;
        }

        .promo-desc {
          font-size: 12px;
          color: var(--admin-text-muted);
          line-height: 1.4;
          margin: 0;
        }

        .promo-rules-count {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--admin-text-main);
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 6px 10px;
          border-radius: 6px;
        }

        .promo-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--admin-border);
        }

        .status-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 750;
        }
        .status-tag.active {
          color: #10b981;
        }
        .status-tag.inactive {
          color: #ef4444;
        }
        .promo-order {
          font-size: 11px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}
