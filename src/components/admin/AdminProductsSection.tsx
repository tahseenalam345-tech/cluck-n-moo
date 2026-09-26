"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Flame,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  FilterIcon,
  EditIcon,
  CopyIcon,
  ArchiveIcon,
  EyeIcon,
  ImageIcon,
  GridIcon,
  ListIcon,
  SlidersIcon,
} from "./AdminIcons";
import { Product, Category } from "@/types";
import { buildCloudinaryUrl } from "../ProductImage";

interface AdminProductsSectionProps {
  categories: Category[];
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
  onOpenPreviewCustomerCard?: (product: Product) => void;
}

export function AdminProductsSection({
  categories,
  onOpenAddModal,
  onOpenEditModal,
  onOpenPreviewCustomerCard,
}: AdminProductsSectionProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all"); // 'all' | 'available' | 'sold_out' | 'archived'
  const [selectedImageStatus, setSelectedImageStatus] = useState("all"); // 'all' | 'has_image' | 'no_image'
  const [sortBy, setSortBy] = useState("displayOrder");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Compute popular items count
  const popularCount = useMemo(
    () => products.filter((p) => p.isFeatured && !p.isArchived).length,
    [products]
  );

  // Fetch products from server API
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedAvailability !== "all") params.set("availability", selectedAvailability);
      if (selectedImageStatus !== "all") params.set("imageStatus", selectedImageStatus);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/v1/admin/products?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error("Failed to load admin products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedAvailability, selectedImageStatus, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Quick 1-tap Toggle Availability (Sold Out / Available)
  const handleToggleAvailability = async (productId: string, currentVal: boolean) => {
    setActionLoadingId(productId);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !currentVal }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isAvailable: !currentVal } : p))
        );
      }
    } catch (err) {
      console.error("Toggle availability error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick 1-tap Toggle Featured (Popular Pick)
  const handleToggleFeatured = async (productId: string, currentVal: boolean) => {
    setActionLoadingId(productId);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !currentVal }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isFeatured: !currentVal } : p))
        );
      }
    } catch (err) {
      console.error("Toggle featured error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Soft Archive
  const handleArchiveProduct = async (product: any) => {
    if (!confirm(`Are you sure you want to archive '${product.name}'? It will no longer appear on the customer menu.`)) {
      return;
    }
    setActionLoadingId(product.id);
    try {
      const res = await fetch(`/api/v1/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error("Archive error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Restore Archived Product
  const handleRestoreProduct = async (product: any) => {
    setActionLoadingId(product.id);
    try {
      const res = await fetch(`/api/v1/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false, isAvailable: true }),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error("Restore error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Active categories for filter
  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived),
    [categories]
  );

  // Duplicate Product
  const handleDuplicateProduct = (product: any) => {
    const duplicated: Product = {
      ...product,
      id: "",
      name: `${product.name} (Copy)`,
      slug: `${product.slug}-copy`,
    };
    onOpenEditModal(duplicated);
  };

  return (
    <div className="admin-products-container">
      {/* 1. Header Toolbar */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Menu Items &amp; Inventory</h1>
          <p className="admin-page-subtitle">
            Manage your verified dishes, portion sizes, add-ons, pricing, and availability states.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchProducts}
            className="admin-btn-secondary"
            title="Refresh items list"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="admin-btn-primary"
          >
            <Plus size={15} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="admin-filters-card">
        {/* Search Row */}
        <div className="admin-search-row">
          <div className="admin-search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish name, slug, ingredients, or tags..."
              className="admin-search-input"
            />
          </div>

          <div className="admin-view-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
            >
              <GridIcon size={15} />
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Data Table View"
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="admin-filters-pills-row">
          {/* Category Dropdown */}
          <div className="filter-select-wrap">
            <label>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">All Categories ({activeCategories.length})</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Pills */}
          <div className="filter-pills-group">
            <span className="pills-label">Status:</span>
            {[
              { id: "all", label: "All Items" },
              { id: "available", label: "Available Only" },
              { id: "sold_out", label: "Sold Out Only" },
              { id: "popular", label: `⭐ Popular (${popularCount})` },
              { id: "archived", label: "Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedAvailability(tab.id)}
                className={`filter-pill-btn ${selectedAvailability === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Image Filter */}
          <div className="filter-pills-group">
            <span className="pills-label">Images:</span>
            {[
              { id: "all", label: "All" },
              { id: "has_image", label: "Has Cloudinary" },
              { id: "no_image", label: "Missing Image" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedImageStatus(tab.id)}
                className={`filter-pill-btn ${selectedImageStatus === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="filter-select-wrap">
            <label>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="admin-filter-select"
            >
              <option value="displayOrder">Display Order</option>
              <option value="name">Dish Name</option>
              <option value="price">Base Price</option>
              <option value="createdAt">Date Created</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              className="sort-dir-btn"
              title={`Sort direction: ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Popular Picks Limit Info / Warning Banner */}
      {popularCount > 6 && (
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            fontSize: "12.5px",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span>
            <strong>{popularCount} dishes</strong> are currently marked as Popular Picks.
            Note: Customer homepage displays the <strong>first 6 items</strong> (ordered by Display Order).
          </span>
        </div>
      )}

      {/* 3. Items View: Grid Mode */}
      {viewMode === "grid" ? (
        <div className="admin-product-cards-grid">
          {products.map((p) => {
            const isSoldOut = !p.isAvailable || p.isArchived;
            return (
              <div
                key={p.id}
                className={`admin-item-card ${isSoldOut ? "sold-out" : ""} ${p.isArchived ? "archived" : ""}`}
              >
                {/* Image Frame */}
                <div className="item-card-image-box">
                  {p.cloudinaryPublicId ? (
                    <img
                      src={buildCloudinaryUrl(p.cloudinaryPublicId, 400)}
                      alt={p.name}
                      className="item-card-img"
                    />
                  ) : p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="item-card-img" />
                  ) : (
                    <div className="item-card-no-img">
                      <ImageIcon size={28} color="var(--admin-text-muted)" />
                      <span>No Image</span>
                    </div>
                  )}

                  {/* Badges on image */}
                  <div className="item-card-img-badges">
                    {p.isFeatured && (
                      <span className="badge-featured" title="Featured in Popular Picks">
                        ★ POPULAR
                      </span>
                    )}
                    {p.isArchived ? (
                      <span className="badge-archived">ARCHIVED</span>
                    ) : (
                      !p.cloudinaryPublicId && !p.imageUrl && (
                        <span className="badge-missing-image" title="Image missing - food image needed">
                          IMAGE MISSING
                        </span>
                      )
                    )}
                  </div>

                  <span className="item-card-category">{p.categoryName || "Dish"}</span>
                </div>

                {/* Card Content */}
                <div className="item-card-body">
                  <div className="item-card-title-row">
                    <h3 className="item-card-title">{p.name}</h3>
                    <div className="item-card-price-pill">
                      <span className="price-num">{p.basePricePkr.toLocaleString()}</span>
                      <span className="price-curr">PKR</span>
                    </div>
                  </div>

                  {p.description && <p className="item-card-desc">{p.description}</p>}

                  {/* Metadata Chips */}
                  <div className="item-card-meta-row">
                    {p.variantCount > 0 && (
                      <span className="meta-chip">
                        {p.variantCount} {p.variantCount === 1 ? "Size" : "Sizes"}
                      </span>
                    )}
                    {p.modifierGroupCount > 0 && (
                      <span className="meta-chip">
                        {p.modifierGroupCount} {p.modifierGroupCount === 1 ? "Addon Group" : "Addon Groups"}
                      </span>
                    )}
                    {Array.isArray(p.tags) &&
                      p.tags.slice(0, 2).map((t: string) => (
                        <span key={t} className="meta-chip tag">
                          {t}
                        </span>
                      ))}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="item-card-footer">
                    {/* 1-Tap Availability Switch */}
                    <button
                      type="button"
                      disabled={actionLoadingId === p.id}
                      onClick={() => handleToggleAvailability(p.id, p.isAvailable)}
                      className={`btn-stock-toggle ${p.isAvailable ? "in-stock" : "out-of-stock"}`}
                      title={p.isAvailable ? "Click to mark Sold Out" : "Click to mark Available"}
                    >
                      {p.isAvailable ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={13} />
                          <span>Sold Out</span>
                        </>
                      )}
                    </button>

                    {/* Action buttons */}
                    <div className="item-card-actions">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(p.id, p.isFeatured)}
                        className={`action-btn ${p.isFeatured ? "active-star" : ""}`}
                        title={p.isFeatured ? "Remove from Popular Picks" : "Feature in Popular Picks"}
                      >
                        <Sparkles size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEditModal(p)}
                        className="action-btn"
                        title="Edit Item"
                      >
                        <EditIcon size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateProduct(p)}
                        className="action-btn"
                        title="Duplicate Item"
                      >
                        <CopyIcon size={13} />
                      </button>

                      {p.isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreProduct(p)}
                          className="action-btn restore"
                          title="Restore / Unarchive Item"
                        >
                          <RefreshCw size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArchiveProduct(p)}
                          className="action-btn danger"
                          title="Archive Item"
                        >
                          <ArchiveIcon size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4. Items View: Table Mode */
        <div className="admin-table-container">
          <table className="admin-full-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>Image</th>
                <th>Dish Name</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Sizes</th>
                <th>Modifiers</th>
                <th>Stock</th>
                <th style={{ width: "120px" }}>Popular Pick</th>
                <th style={{ width: "130px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={!p.isAvailable ? "table-row-soldout" : ""}>
                  <td>
                    <div className="table-thumb">
                      {p.cloudinaryPublicId ? (
                        <img src={buildCloudinaryUrl(p.cloudinaryPublicId, 100)} alt={p.name} />
                      ) : p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} />
                      ) : (
                        <div className="table-no-img-badge" title="Image missing - food image needed">
                          <ImageIcon size={14} color="#d97706" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-dish-name">
                      <strong>{p.name}</strong>
                      <span className="table-slug">{p.slug}</span>
                    </div>
                  </td>
                  <td>
                    <span className="table-cat-badge">{p.categoryName || "Menu"}</span>
                  </td>
                  <td>
                    <strong className="table-price">{p.basePricePkr.toLocaleString()} PKR</strong>
                  </td>
                  <td>{p.variantCount || 0}</td>
                  <td>{p.modifierGroupCount || 0}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(p.id, p.isAvailable)}
                      className={`btn-stock-pill ${p.isAvailable ? "in" : "out"}`}
                    >
                      {p.isAvailable ? "Available" : "Sold Out"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={actionLoadingId === p.id}
                      onClick={() => handleToggleFeatured(p.id, p.isFeatured)}
                      className={`btn-stock-pill ${p.isFeatured ? "in" : "out"}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: p.isFeatured ? "#fff7ed" : "#f8fafc",
                        color: p.isFeatured ? "#ea580c" : "#64748b",
                        border: p.isFeatured ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                        fontWeight: 700,
                      }}
                      title={p.isFeatured ? "Click to remove from Popular Picks" : "Click to feature in Popular Picks"}
                    >
                      <Sparkles size={11} color={p.isFeatured ? "#ea580c" : "#94a3b8"} />
                      {p.isFeatured ? "Featured" : "Not Featured"}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions-row">
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(p)}
                        className="table-action-btn"
                        title="Edit Dish"
                      >
                        <EditIcon size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateProduct(p)}
                        className="table-action-btn"
                        title="Duplicate Dish"
                      >
                        <CopyIcon size={13} />
                      </button>
                      {p.isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreProduct(p)}
                          className="table-action-btn restore"
                          title="Restore / Unarchive Dish"
                        >
                          <RefreshCw size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArchiveProduct(p)}
                          className="table-action-btn danger"
                          title="Archive Dish"
                        >
                          <ArchiveIcon size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products.length === 0 && !isLoading && (
        <div className="admin-no-items">
          <p>No dishes match the selected search or filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedAvailability("all");
              setSelectedImageStatus("all");
            }}
            className="admin-btn-secondary"
          >
            Clear All Filters
          </button>
        </div>
      )}

      <style jsx>{`
        .admin-products-container {
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

        /* Filter Card */
        .admin-filters-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admin-search-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-search-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 7px;
          padding: 8px 12px;
        }
        .search-icon {
          color: var(--admin-text-muted);
        }
        .admin-search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 12.5px;
          outline: none;
          color: var(--admin-text-main);
        }

        .admin-view-toggle {
          display: flex;
          align-items: center;
          border: 1px solid var(--admin-border);
          border-radius: 7px;
          overflow: hidden;
          background: var(--admin-bg);
        }
        .view-btn {
          background: transparent;
          border: none;
          padding: 7px 11px;
          color: var(--admin-text-muted);
          cursor: pointer;
        }
        .view-btn.active {
          background: #ff6b35;
          color: #ffffff;
        }

        .admin-filters-pills-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
        }

        .filter-select-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-select-wrap label {
          color: var(--admin-text-muted);
          font-weight: 700;
          font-size: 11px;
        }
        .admin-filter-select {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
        }
        .sort-dir-btn {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 13px;
          font-weight: 800;
          color: var(--admin-text-main);
          cursor: pointer;
        }

        .filter-pills-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pills-label {
          color: var(--admin-text-muted);
          font-weight: 700;
          font-size: 11px;
        }
        .filter-pill-btn {
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 650;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .filter-pill-btn.active {
          background: var(--admin-nav-active);
          border-color: #ff6b35;
          color: #ff6b35;
          font-weight: 750;
        }

        /* Product Cards Grid */
        .admin-product-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .admin-item-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.15s ease;
        }
        .admin-item-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        .admin-item-card.sold-out {
          opacity: 0.85;
        }

        .item-card-image-box {
          position: relative;
          width: 100%;
          height: 145px;
          background: #141416;
          overflow: hidden;
        }
        .item-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .item-card-no-img {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 11px;
          color: var(--admin-text-muted);
        }

        .item-card-img-badges {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .badge-featured {
          background: rgba(255, 107, 53, 0.9);
          color: #ffffff;
          font-size: 9px;
          font-weight: 850;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .badge-archived {
          background: rgba(239, 68, 68, 0.9);
          color: #ffffff;
          font-size: 9px;
          font-weight: 850;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .badge-missing-image {
          background: rgba(217, 119, 6, 0.95);
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 850;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }

        .item-card-category {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 750;
          padding: 2px 7px;
          border-radius: 4px;
          backdrop-filter: blur(4px);
        }

        .item-card-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 8px;
        }

        .item-card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .item-card-title {
          font-family: var(--font-display, inherit);
          font-size: 13.5px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
          line-height: 1.25;
        }

        .item-card-price-pill {
          display: flex;
          align-items: baseline;
          gap: 2px;
          flex-shrink: 0;
        }
        .price-num {
          font-family: var(--font-display, inherit);
          font-size: 15px;
          font-weight: 850;
          color: #ff6b35;
        }
        .price-curr {
          font-size: 9.5px;
          font-weight: 800;
          color: #ff6b35;
        }

        .item-card-desc {
          font-size: 11px;
          color: var(--admin-text-muted);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .item-card-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .meta-chip {
          font-size: 10px;
          font-weight: 700;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-muted);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .meta-chip.tag {
          color: #ff6b35;
        }

        .item-card-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid var(--admin-border);
          gap: 6px;
        }

        .btn-stock-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }
        .btn-stock-toggle.in-stock {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .btn-stock-toggle.out-of-stock {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .item-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .action-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 5px;
          color: var(--admin-text-main);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-btn:hover {
          border-color: #ff6b35;
          color: #ff6b35;
        }
        .action-btn.active-star {
          color: #ff6b35;
          border-color: #ff6b35;
          background: rgba(255, 107, 53, 0.1);
        }
        .action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        /* Table Mode */
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
          padding: 8px 14px;
          border-bottom: 1px solid var(--admin-border);
        }
        .table-thumb {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          background: #141416;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .table-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .table-dish-name {
          display: flex;
          flex-direction: column;
        }
        .table-dish-name strong {
          color: var(--admin-text-main);
        }
        .table-slug {
          font-size: 10.5px;
          color: var(--admin-text-muted);
        }
        .table-cat-badge {
          font-size: 10.5px;
          font-weight: 700;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 2px 7px;
          border-radius: 4px;
        }
        .table-price {
          font-family: var(--font-display, inherit);
          font-weight: 850;
          color: #ff6b35;
        }
        .btn-stock-pill {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10.5px;
          font-weight: 750;
          border: none;
          cursor: pointer;
        }
        .btn-stock-pill.in {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }
        .btn-stock-pill.out {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }
        .table-actions-row {
          display: flex;
          align-items: center;
          gap: 5px;
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
        .action-btn.restore {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.4);
        }
        .action-btn.restore:hover {
          background: rgba(16, 185, 129, 0.15);
        }

        .table-action-btn.restore {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.4);
        }
        .table-action-btn.restore:hover {
          background: rgba(16, 185, 129, 0.15);
        }

        .table-no-img-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(217, 119, 6, 0.1);
        }

        .table-action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .admin-no-items {
          background: var(--admin-card-bg);
          border: 1px dashed var(--admin-border);
          border-radius: 10px;
          padding: 36px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
