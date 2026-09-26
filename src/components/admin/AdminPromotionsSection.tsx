"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import {
  CopyIcon,
  EditIcon,
  MoreVerticalIcon,
  EyeIcon,
  SlidersIcon,
} from "./AdminIcons";
import { buildCloudinaryUrl } from "../ProductImage";

interface AdminPromotionItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  fixedPricePkr: number;
  displayOrder: number;
  isActive: boolean;
  badgeText: string | null;
  imageUrl: string;
  cloudinaryPublicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  uploadedAt: string;
  isConfigured: boolean;
}

export function AdminPromotionsSection() {
  const [promotions, setPromotions] = useState<AdminPromotionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit Modal
  const [editingPromo, setEditingPromo] = useState<AdminPromotionItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editBadge, setEditBadge] = useState("");
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Preview Lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/promotions");
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

  const handleCopyUrl = (pubId: string, url: string) => {
    const finalUrl = buildCloudinaryUrl(pubId, 1600) || url;
    navigator.clipboard.writeText(finalUrl);
    setCopiedId(pubId);
    showToast("✓ Cloudinary CDN URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenEdit = (p: AdminPromotionItem) => {
    setEditingPromo(p);
    setEditTitle(p.title || "");
    setEditDesc(p.shortDescription || "");
    setEditPrice(p.fixedPricePkr || 0);
    setEditBadge(p.badgeText || "");
    setEditOrder(p.displayOrder || 0);
    setEditIsActive(Boolean(p.isActive));
    setEditError(null);
    setActiveMenuId(null);
  };

  const handleToggleActiveQuick = async (p: AdminPromotionItem) => {
    const nextActive = !p.isActive;
    setActiveMenuId(null);

    // 1. Optimistic Update (Immediate UI response <10ms)
    const prevPromos = [...promotions];
    setPromotions((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isActive: nextActive } : item))
    );
    showToast(`✓ Promotion ${nextActive ? "activated" : "deactivated"} on homepage`);

    // 2. Background server persistence
    try {
      const res = await fetch("/api/v1/admin/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          isActive: nextActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to toggle status");
      }
    } catch (err: any) {
      console.error("Promotion toggle error:", err);
      // Rollback to previous state on failure
      setPromotions(prevPromos);
      showToast("Could not update promotion. Please try again.");
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    setEditError(null);
    setIsSaving(true);

    try {
      const url = "/api/v1/admin/promotions";
      const method = editingPromo.isConfigured ? "PUT" : "POST";
      const payload: any = {
        title: editTitle.trim(),
        shortDescription: editDesc.trim() || null,
        fixedPricePkr: parseInt(String(editPrice), 10) || 0,
        badgeText: editBadge.trim() || null,
        displayOrder: Number(editOrder) || 0,
        isActive: editIsActive,
      };

      if (editingPromo.isConfigured) {
        payload.id = editingPromo.id;
      } else {
        payload.cloudinaryPublicId = editingPromo.cloudinaryPublicId;
        payload.imageUrl = editingPromo.imageUrl;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save promotion.");
      }

      showToast(`✓ Promotion "${editTitle}" saved and synchronized!`);
      setEditingPromo(null);
      fetchPromotions();
    } catch (err: any) {
      setEditError(err?.message || "Error saving promotion");
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="admin-promos-container">
      {/* Toast */}
      {toastMessage && <div className="admin-toast">{toastMessage}</div>}

      {/* Top Bar */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Cloudinary Billboard Promotions</h1>
          <p className="admin-page-subtitle">
            Discovered promotion deals directly from Cloudinary CDN storage (<code>cnm/promotions</code>).
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchPromotions}
            className="admin-btn-secondary"
            title="Scan Cloudinary CDN"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Rescan Cloudinary</span>
          </button>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="promos-grid">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className={`promo-admin-card ${!promo.isConfigured ? "unconfigured" : ""}`}
          >
            {/* Image Preview Box */}
            <div
              className="promo-image-wrapper"
              onClick={() => setPreviewImageUrl(buildCloudinaryUrl(promo.cloudinaryPublicId, 1600) || promo.imageUrl)}
              title="Click to view full billboard preview"
            >
              <img
                src={buildCloudinaryUrl(promo.cloudinaryPublicId, 800) || promo.imageUrl}
                alt={promo.title}
                className="promo-img"
              />
              {promo.badgeText && <span className="promo-badge">{promo.badgeText}</span>}
              {!promo.isConfigured && (
                <span className="unconfigured-pill">Unconfigured Cloudinary Asset</span>
              )}
            </div>

            {/* Body */}
            <div className="promo-card-body">
              <div className="promo-header-row">
                <div style={{ flex: 1 }}>
                  <h3 className="promo-title">{promo.title}</h3>
                  <div className="promo-public-id">
                    <code>{promo.cloudinaryPublicId}</code>
                  </div>
                </div>

                <div className="promo-actions-menu-wrapper">
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(activeMenuId === promo.id ? null : promo.id)}
                    className="btn-dots-menu"
                    title="Promotion options"
                  >
                    <MoreVerticalIcon size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuId === promo.id && (
                    <div className="dots-dropdown-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImageUrl(buildCloudinaryUrl(promo.cloudinaryPublicId, 1600) || promo.imageUrl);
                          setActiveMenuId(null);
                        }}
                        className="menu-item"
                      >
                        <EyeIcon size={13} /> Fullscreen Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyUrl(promo.cloudinaryPublicId, promo.imageUrl);
                          setActiveMenuId(null);
                        }}
                        className="menu-item"
                      >
                        <CopyIcon size={13} /> Copy CDN URL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(promo)}
                        className="menu-item"
                      >
                        <EditIcon size={13} /> Edit Title &amp; Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActiveQuick(promo)}
                        className="menu-item"
                      >
                        <SlidersIcon size={13} /> {promo.isActive ? "Deactivate from Homepage" : "Activate on Homepage"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {promo.shortDescription && (
                <p className="promo-short-desc">{promo.shortDescription}</p>
              )}

              {/* Technical Cloudinary Specs Bar */}
              <div className="promo-specs-strip">
                <span className="spec-item">
                  <strong>Dimensions:</strong> {promo.width ? `${promo.width} × ${promo.height}` : "—"}
                </span>
                <span className="spec-item">
                  <strong>Format:</strong> {promo.format?.toUpperCase() || "JPG"}
                </span>
                <span className="spec-item">
                  <strong>Size:</strong> {formatFileSize(promo.bytes)}
                </span>
              </div>

              {/* Footer Row */}
              <div className="promo-footer-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    className={`status-chip ${promo.isActive ? "active" : "inactive"}`}
                  >
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
                  <span className="order-pill">Order #{promo.displayOrder}</span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(promo.cloudinaryPublicId, promo.imageUrl)}
                    className="btn-quick-copy"
                    title="Copy CDN Link"
                  >
                    {copiedId === promo.cloudinaryPublicId ? <Check size={12} color="#059669" /> : <CopyIcon size={12} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(promo)}
                    className="btn-quick-edit"
                  >
                    {promo.isConfigured ? "Edit" : "Configure"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / CONFIGURE MODAL */}
      {editingPromo && (
        <div className="admin-modal-backdrop" onClick={() => setEditingPromo(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingPromo.isConfigured ? `Edit: ${editingPromo.title}` : "Configure Cloudinary Promotion"}
                </h3>
                <span className="modal-subtitle">
                  CDN ID: <code>{editingPromo.cloudinaryPublicId}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="modal-body">
              {editError && <div className="modal-alert-error">{editError}</div>}

              <div className="form-group">
                <label className="form-label">Promotion Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Pizza Treat Feast"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Billboard Badge Text (Optional)</label>
                <input
                  type="text"
                  value={editBadge}
                  onChange={(e) => setEditBadge(e.target.value)}
                  placeholder="e.g. MEGA DEAL or LIMITED TIME"
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Fixed Price (PKR)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    value={editOrder}
                    onChange={(e) => setEditOrder(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Short Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Brief customer description..."
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                  <span>Show active on homepage billboard carousel</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-submit"
                >
                  {isSaving ? "Saving..." : "Save Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW LIGHTBOX */}
      {previewImageUrl && (
        <div className="admin-lightbox-backdrop" onClick={() => setPreviewImageUrl(null)}>
          <div className="admin-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewImageUrl} alt="Full Promotion Preview" className="lightbox-img" />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="btn-close-lightbox"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-promos-container {
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
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .admin-page-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .promos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 18px;
        }

        .promo-admin-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .promo-admin-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }

        .promo-admin-card.unconfigured {
          border: 2px dashed #cbd5e1;
          background: #f8fafc;
        }

        .promo-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 6;
          background: #0f172a;
          cursor: pointer;
          overflow: hidden;
        }

        .promo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .promo-image-wrapper:hover .promo-img {
          transform: scale(1.02);
        }

        .promo-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #ea580c;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .unconfigured-pill {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: #334155;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 700;
        }

        .promo-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .promo-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          position: relative;
        }

        .promo-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .promo-public-id code {
          font-size: 11.5px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .promo-short-desc {
          font-size: 12.5px;
          color: #475569;
          margin: 0;
          line-height: 1.4;
        }

        .promo-specs-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 8px 10px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          font-size: 11.5px;
          color: #64748b;
        }

        .promo-specs-strip strong {
          color: #334155;
        }

        .promo-footer-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
        }

        .status-chip.active {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .status-chip.inactive {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .order-pill {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .btn-quick-copy {
          padding: 6px 9px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          color: #475569;
        }

        .btn-quick-edit {
          padding: 6px 12px;
          background: #ea580c;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
        }

        .promo-actions-menu-wrapper {
          position: relative;
        }

        .btn-dots-menu {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .dots-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          width: 200px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 50;
          overflow: hidden;
          padding: 4px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          text-align: left;
          border-radius: 6px;
        }

        .menu-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* LIGHTBOX */
        .admin-lightbox-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20000;
          padding: 24px;
        }

        .admin-lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .lightbox-img {
          width: 100%;
          height: auto;
          max-height: 85vh;
          object-fit: contain;
          display: block;
        }

        .btn-close-lightbox {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(15, 23, 42, 0.7);
          color: #ffffff;
          border: none;
          border-radius: 50%;
          padding: 6px;
          cursor: pointer;
        }

        /* MODAL */
        .admin-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .admin-modal-card {
          background: #ffffff;
          border-radius: 14px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .modal-subtitle {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
          display: block;
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-alert-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .form-input,
        .form-textarea {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #ea580c;
          box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.1);
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }

        .btn-submit {
          padding: 9px 18px;
          border-radius: 8px;
          border: none;
          background: #ea580c;
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          cursor: pointer;
        }

        .admin-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          z-index: 99999;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
