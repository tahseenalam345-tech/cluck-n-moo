"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { SlidersIcon } from "./AdminIcons";

export function AdminModifiersSection() {
  const [productsWithModifiers, setProductsWithModifiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModifiers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const withMods = data.data.filter((p: any) => p.modifierGroupCount > 0);
        setProductsWithModifiers(withMods);
      }
    } catch (err) {
      console.error("Failed to load modifiers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModifiers();
  }, []);

  return (
    <div className="admin-modifiers-container">
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Add-ons &amp; Customization Groups</h1>
          <p className="admin-page-subtitle">
            Overview of dipping sauces, stuffed crusts, and meal add-ons configured across dishes.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchModifiers}
            className="admin-btn-secondary"
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="admin-modifiers-grid">
        {productsWithModifiers.map((prod) => (
          <div key={prod.id} className="admin-mod-card">
            <div className="mod-card-header">
              <span className="mod-card-cat">{prod.categoryName || "Dish"}</span>
              <h3 className="mod-card-title">{prod.name}</h3>
              <span className="mod-groups-count">
                {prod.modifierGroupCount} {prod.modifierGroupCount === 1 ? "Customization Group" : "Customization Groups"} Attached
              </span>
            </div>

            <div className="mod-card-body">
              <p className="mod-note">
                To add, edit, or remove modifier groups and price adjustments for this dish, edit the dish in the <strong>Menu Items</strong> tab.
              </p>
            </div>
          </div>
        ))}
      </div>

      {productsWithModifiers.length === 0 && !isLoading && (
        <div className="admin-empty-mods">
          <SlidersIcon size={32} color="var(--admin-text-muted)" />
          <p>No add-on or modifier groups configured yet.</p>
        </div>
      )}

      <style jsx>{`
        .admin-modifiers-container {
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

        .admin-modifiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .admin-mod-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mod-card-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid var(--admin-border);
          padding-bottom: 10px;
        }

        .mod-card-cat {
          font-size: 10.5px;
          font-weight: 800;
          color: #ff6b35;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mod-card-title {
          font-family: var(--font-display, inherit);
          font-size: 15px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
        }

        .mod-groups-count {
          font-size: 11.5px;
          color: var(--admin-text-muted);
        }

        .mod-note {
          font-size: 12px;
          color: var(--admin-text-muted);
          line-height: 1.4;
          margin: 0;
        }

        .admin-empty-mods {
          background: var(--admin-card-bg);
          border: 1px dashed var(--admin-border);
          border-radius: 10px;
          padding: 36px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}
