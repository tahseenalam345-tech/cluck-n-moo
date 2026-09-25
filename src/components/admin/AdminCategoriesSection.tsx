"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import { LayersIcon, EditIcon, ArchiveIcon } from "./AdminIcons";
import { Category } from "@/types";

export function AdminCategoriesSection() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/categories");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDisplayOrder(categories.length + 1);
    setIsActive(true);
    setImageUrl("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDisplayOrder(cat.displayOrder);
    setIsActive(Boolean(cat.isActive));
    setImageUrl(cat.imageUrl || "");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Category name is required.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        displayOrder: Number(displayOrder) || 0,
        isActive,
        imageUrl: imageUrl.trim() || null,
      };

      const url = editingCategory
        ? `/api/v1/admin/categories/${editingCategory.id}`
        : "/api/v1/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || "Failed to save category.");
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (
      !confirm(
        `Are you sure you want to delete/archive '${cat.name}'? If items are attached, it will be safely archived instead of deleted.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error?.message || "Action failed.");
      }
    } catch (err) {
      console.error("Delete category error:", err);
    }
  };

  return (
    <div className="admin-categories-container">
      {/* Top Bar */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Menu Categories</h1>
          <p className="admin-page-subtitle">
            Organize catalog groupings, ordering sequence, and customer menu visibility.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchCategories}
            className="admin-btn-secondary"
            title="Refresh categories"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button type="button" onClick={openAddModal} className="admin-btn-primary">
            <Plus size={15} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Categories Table Card */}
      <div className="admin-table-container">
        <table className="admin-full-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>Order</th>
              <th>Category Name</th>
              <th>Slug</th>
              <th>Attached Items</th>
              <th>Status</th>
              <th style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className={cat.isArchived ? "table-row-archived" : ""}>
                <td>
                  <span className="order-pill">{cat.displayOrder}</span>
                </td>
                <td>
                  <strong className="cat-name">{cat.name}</strong>
                </td>
                <td>
                  <code className="cat-slug">{cat.slug}</code>
                </td>
                <td>
                  <span className="item-count-badge">
                    {cat.productCount || 0} Dishes ({cat.activeProductCount || 0} active)
                  </span>
                </td>
                <td>
                  {cat.isArchived ? (
                    <span className="badge-status archived">Archived</span>
                  ) : cat.isActive ? (
                    <span className="badge-status active">Active</span>
                  ) : (
                    <span className="badge-status inactive">Hidden</span>
                  )}
                </td>
                <td>
                  <div className="table-actions-row">
                    <button
                      type="button"
                      onClick={() => openEditModal(cat)}
                      className="table-action-btn"
                      title="Edit Category"
                    >
                      <EditIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="table-action-btn danger"
                      title="Safe Archive/Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingCategory ? `Edit: ${editingCategory.name}` : "Create Menu Category"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="admin-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="admin-modal-alert error">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="admin-modal-body">
              <div className="admin-field-group">
                <label className="admin-label">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                      );
                    }
                  }}
                  placeholder="e.g. Crispy Appetizers"
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-label">Slug (URL identifier)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="crispy-appetizers"
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-label">Display Order (Sorting sequence)</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  className="admin-input"
                />
              </div>

              <div className="admin-checkbox-row">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Active &amp; Visible on Customer Storefront</span>
                </label>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="admin-btn-primary">
                  {isSaving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-categories-container {
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

        .admin-table-container {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          overflow-x: auto;
        }

        .admin-full-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .admin-full-table th {
          background: var(--admin-bg);
          padding: 10px 14px;
          font-weight: 750;
          color: var(--admin-text-muted);
          border-bottom: 1px solid var(--admin-border);
          text-align: left;
        }
        .admin-full-table td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--admin-border);
        }

        .order-pill {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
        }
        .cat-name {
          color: var(--admin-text-main);
        }
        .cat-slug {
          font-size: 11.5px;
          color: var(--admin-text-muted);
        }
        .item-count-badge {
          background: rgba(255, 107, 53, 0.1);
          color: #ff6b35;
          font-weight: 750;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
        }

        .badge-status {
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .badge-status.active {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }
        .badge-status.inactive {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }
        .badge-status.archived {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        .table-actions-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .table-action-btn {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          cursor: pointer;
        }
        .table-action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        /* Modal */
        .admin-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .admin-modal-content.small {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .admin-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--admin-border);
        }
        .admin-modal-title {
          font-size: 15px;
          font-weight: 800;
          margin: 0;
          color: var(--admin-text-main);
        }
        .admin-modal-close {
          background: transparent;
          border: none;
          color: var(--admin-text-muted);
          cursor: pointer;
        }
        .admin-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .admin-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .admin-label {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--admin-text-main);
        }
        .admin-input {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          padding: 8px 11px;
          border-radius: 6px;
          font-size: 12.5px;
          outline: none;
        }
        .admin-input:focus {
          border-color: #ff6b35;
        }
        .admin-checkbox-row {
          padding-top: 4px;
        }
        .admin-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          cursor: pointer;
        }
        .admin-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--admin-border);
        }
        .admin-modal-alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 650;
        }
      `}</style>
    </div>
  );
}
