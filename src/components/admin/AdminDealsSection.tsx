"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Plus, CheckCircle2, XCircle, RefreshCw, Flame } from "lucide-react";
import { EditIcon } from "./AdminIcons";
import { Product } from "@/types";
import { buildCloudinaryUrl } from "../ProductImage";

interface AdminDealsSectionProps {
  onOpenEditModal: (product: Product) => void;
  onOpenAddModal: () => void;
}

export function AdminDealsSection({ onOpenEditModal, onOpenAddModal }: AdminDealsSectionProps) {
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter products whose category is a deal category
        const dealItems = data.data.filter(
          (p: any) =>
            p.categoryId === "cat_deals" ||
            p.categoryId === "cat_box_deals" ||
            p.categoryId === "cat_combo_deals" ||
            p.name.toLowerCase().includes("deal") ||
            (p.tags && p.tags.includes("Deal"))
        );
        setDeals(dealItems);
      }
    } catch (err) {
      console.error("Failed to fetch deals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleToggleDealAvailability = async (dealId: string, currentVal: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/products/${dealId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !currentVal }),
      });
      if (res.ok) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, isAvailable: !currentVal } : d))
        );
      }
    } catch (err) {
      console.error("Toggle deal error:", err);
    }
  };

  return (
    <div className="admin-deals-container">
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Deals &amp; Combos</h1>
          <p className="admin-page-subtitle">
            Manage bundled feasts, box deals, and combo pricing.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchDeals}
            className="admin-btn-secondary"
            title="Refresh deals"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button type="button" onClick={onOpenAddModal} className="admin-btn-primary">
            <Plus size={15} />
            <span>Create New Deal</span>
          </button>
        </div>
      </div>

      <div className="admin-deals-grid">
        {deals.map((deal) => (
          <div key={deal.id} className="admin-deal-card">
            <div className="deal-image-frame">
              {deal.cloudinaryPublicId ? (
                <img src={buildCloudinaryUrl(deal.cloudinaryPublicId, 400)} alt={deal.name} />
              ) : (
                <div className="no-img-placeholder">
                  <Sparkles size={24} color="#ff6b35" />
                </div>
              )}
              <span className="deal-cat-tag">{deal.categoryName || "Combo"}</span>
            </div>

            <div className="deal-body">
              <div className="deal-header-row">
                <h3 className="deal-name">{deal.name}</h3>
                <span className="deal-price">{deal.basePricePkr.toLocaleString()} PKR</span>
              </div>

              {deal.description && <p className="deal-desc">{deal.description}</p>}

              <div className="deal-footer-row">
                <button
                  type="button"
                  onClick={() => handleToggleDealAvailability(deal.id, deal.isAvailable)}
                  className={`deal-toggle-btn ${deal.isAvailable ? "in" : "out"}`}
                >
                  {deal.isAvailable ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  <span>{deal.isAvailable ? "In Stock" : "Sold Out"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEditModal(deal)}
                  className="deal-edit-btn"
                >
                  <EditIcon size={13} /> Edit Deal
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-deals-container {
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

        .admin-deals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .admin-deal-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.15s ease;
        }
        .admin-deal-card:hover {
          border-color: #ff6b35;
        }

        .deal-image-frame {
          position: relative;
          width: 100%;
          height: 145px;
          background: #121214;
        }
        .deal-image-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .deal-cat-tag {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 750;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .deal-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 8px;
        }

        .deal-header-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .deal-name {
          font-size: 14px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
        }

        .deal-price {
          font-family: var(--font-display, inherit);
          font-size: 15px;
          font-weight: 850;
          color: #ff6b35;
          white-space: nowrap;
        }

        .deal-desc {
          font-size: 11.5px;
          color: var(--admin-text-muted);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .deal-footer-row {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid var(--admin-border);
        }

        .deal-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          border: none;
        }
        .deal-toggle-btn.in {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }
        .deal-toggle-btn.out {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        .deal-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
