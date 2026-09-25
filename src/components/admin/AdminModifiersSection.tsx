"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Utensils,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";
import { EditIcon, SlidersIcon } from "./AdminIcons";

interface ModifierOption {
  id?: string;
  name: string;
  pricePkr: number;
  isAvailable: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  productId: string;
  productName: string;
  productBasePrice: number;
  productAvailable: boolean;
  options: ModifierOption[];
}

export function AdminModifiersSection() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "required" | "optional">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [targetProductId, setTargetProductId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [minSelection, setMinSelection] = useState<number>(0);
  const [maxSelection, setMaxSelection] = useState<number>(1);
  const [isRequired, setIsRequired] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModifierOption[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchModifiers = async () => {
    setIsLoading(true);
    try {
      const [modRes, prodRes] = await Promise.all([
        fetch("/api/v1/admin/modifiers"),
        fetch("/api/v1/admin/products?limit=200"),
      ]);

      const modData = await modRes.json();
      const prodData = await prodRes.json();

      if (modData.success && Array.isArray(modData.data)) {
        setGroups(modData.data);
      }
      if (prodData.success && Array.isArray(prodData.data)) {
        setProductsList(prodData.data.map((p: any) => ({ id: p.id, name: p.name })));
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

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (filterType === "required" && !g.isRequired) return false;
      if (filterType === "optional" && g.isRequired) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesProduct = (g.productName || "").toLowerCase().includes(q);
        const matchesOption = g.options.some((o) => o.name.toLowerCase().includes(q));
        return matchesName || matchesProduct || matchesOption;
      }
      return true;
    });
  }, [groups, filterType, searchQuery]);

  const handleOpenAdd = () => {
    setEditingGroupId(null);
    setTargetProductId(productsList[0]?.id || "");
    setGroupName("");
    setMinSelection(0);
    setMaxSelection(1);
    setIsRequired(false);
    setModalOptions([
      { name: "Regular / Default", pricePkr: 0, isAvailable: true },
      { name: "Extra Dip / Sauce", pricePkr: 100, isAvailable: true },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: ModifierGroup) => {
    setEditingGroupId(g.id);
    setTargetProductId(g.productId);
    setGroupName(g.name);
    setMinSelection(g.minSelection);
    setMaxSelection(g.maxSelection);
    setIsRequired(Boolean(g.isRequired));
    setModalOptions(g.options.map((o) => ({ ...o })));
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddOption = () => {
    setModalOptions((prev) => [
      ...prev,
      { name: "", pricePkr: 0, isAvailable: true },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setModalOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof ModifierOption, val: any) => {
    setModalOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!groupName.trim()) {
      setModalError("Modifier Group Name is required.");
      return;
    }

    if (modalOptions.length === 0) {
      setModalError("Please add at least one modifier option.");
      return;
    }

    const cleanOptions = modalOptions.filter((o) => o.name.trim());
    if (cleanOptions.length === 0) {
      setModalError("All modifier options must have a valid name.");
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = Boolean(editingGroupId);
      const url = "/api/v1/admin/modifiers";
      const method = isEdit ? "PUT" : "POST";
      const payload: any = {
        name: groupName.trim(),
        minSelection: Number(minSelection) || 0,
        maxSelection: Math.max(1, Number(maxSelection) || 1),
        isRequired,
        options: cleanOptions.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          pricePkr: parseInt(String(o.pricePkr), 10) || 0,
          isAvailable: o.isAvailable !== false,
        })),
      };

      if (isEdit) {
        payload.id = editingGroupId;
      } else {
        payload.productId = targetProductId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save modifier group.");
      }

      showToast(`✓ Modifier group "${groupName}" saved!`);
      setIsModalOpen(false);
      fetchModifiers();
    } catch (err: any) {
      setModalError(err?.message || "Error saving modifier group.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (g: ModifierGroup) => {
    if (!window.confirm(`Are you sure you want to delete modifier group "${g.name}" from "${g.productName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/modifiers?id=${g.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Modifier group removed safely.");
        fetchModifiers();
      } else {
        alert(data.error?.message || "Failed to delete modifier group");
      }
    } catch {
      alert("Network error deleting modifier group");
    }
  };

  return (
    <div className="admin-mods-container">
      {/* Toast */}
      {toastMessage && <div className="admin-toast">{toastMessage}</div>}

      {/* Top Bar */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Add-ons, Crusts &amp; Modifiers</h1>
          <p className="admin-page-subtitle">
            Configure dipping sauces, burger extras, stuffed crusts, and portion choices attached to menu dishes.
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
          <button
            type="button"
            onClick={handleOpenAdd}
            className="admin-btn-primary"
          >
            <Plus size={15} />
            <span>Add Modifier Group</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrapper">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by group name, dish, or option..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <div className="admin-filter-pills">
          <span className="filter-label">Filter:</span>
          {[
            { id: "all", label: "All Groups" },
            { id: "required", label: "Mandatory Required" },
            { id: "optional", label: "Optional Add-ons" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`pill-btn ${filterType === f.id ? "active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modifier Groups Grid / List */}
      <div className="mods-grid">
        {filteredGroups.map((g) => (
          <div key={g.id} className="mod-group-card">
            {/* Header */}
            <div className="mod-card-header">
              <div style={{ flex: 1 }}>
                <span className="attached-product-pill">
                  <Utensils size={12} /> {g.productName}
                </span>
                <h3 className="mod-group-name">{g.name}</h3>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(g)}
                  className="btn-card-edit"
                  title="Edit Group & Options"
                >
                  <EditIcon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(g)}
                  className="btn-card-del"
                  title="Delete Group"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Config metadata strip */}
            <div className="mod-meta-strip">
              <span className={`badge-req ${g.isRequired ? "required" : "optional"}`}>
                {g.isRequired ? "Required Choice" : "Optional Add-on"}
              </span>
              <span className="spec-pill">
                Min: {g.minSelection} | Max: {g.maxSelection}
              </span>
              <span className="spec-pill">
                {g.options.length} {g.options.length === 1 ? "Option" : "Options"}
              </span>
            </div>

            {/* Options List */}
            <div className="mod-options-list">
              {g.options.map((opt, idx) => (
                <div key={opt.id || idx} className="mod-option-row">
                  <div className="opt-name-box">
                    <span className="opt-bullet">•</span>
                    <span className="opt-name">{opt.name}</span>
                  </div>
                  <div className="opt-meta-box">
                    <span className="opt-price">
                      {opt.pricePkr > 0 ? `+${opt.pricePkr.toLocaleString()} PKR` : "Free"}
                    </span>
                    <span className={opt.isAvailable ? "opt-avail-ok" : "opt-avail-off"}>
                      {opt.isAvailable ? "In Stock" : "Sold Out"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && !isLoading && (
          <div className="empty-mods-box">
            <SlidersIcon size={32} color="#94a3b8" />
            <p>No modifier groups found matching your search.</p>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingGroupId ? `Edit: ${groupName}` : "Create New Modifier Group"}
                </h3>
                <span className="modal-subtitle">
                  Configure customizable add-on items, prices, and rules.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="modal-body">
              {modalError && <div className="modal-alert-error">{modalError}</div>}

              {/* Target Product (only selectable in Add mode) */}
              <div className="form-group">
                <label className="form-label">Attached Menu Item *</label>
                <select
                  disabled={Boolean(editingGroupId)}
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className={`form-select ${editingGroupId ? "disabled" : ""}`}
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Modifier Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Choose Free Dipping Sauce, Cheese Crust Add-on"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Min Selections</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={minSelection}
                    onChange={(e) => setMinSelection(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Selections</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxSelection}
                    onChange={(e) => setMaxSelection(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ justifyContent: "center" }}>
                  <label className="checkbox-label" style={{ marginTop: "18px" }}>
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                    />
                    <span>Required</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Options List */}
              <div className="options-section-box">
                <div className="options-header">
                  <strong>Group Options &amp; Price Adjustments</strong>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="btn-add-option"
                  >
                    <Plus size={13} /> Add Option
                  </button>
                </div>

                <div className="options-rows-container">
                  {modalOptions.map((opt, idx) => (
                    <div key={idx} className="option-edit-row">
                      <input
                        type="text"
                        placeholder="Option Name (e.g. Garlic Mayo Dip)"
                        value={opt.name}
                        onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
                        className="form-input"
                        style={{ flex: 2 }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price (+PKR)"
                        value={opt.pricePkr}
                        onChange={(e) => handleOptionChange(idx, "pricePkr", e.target.value)}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <label className="checkbox-mini" title="Available / In Stock">
                        <input
                          type="checkbox"
                          checked={opt.isAvailable}
                          onChange={(e) => handleOptionChange(idx, "isAvailable", e.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="btn-remove-opt"
                        title="Remove Option"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-submit"
                >
                  {isSaving ? "Saving..." : "Save Modifier Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-mods-container {
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

        .admin-topbar-actions {
          display: flex;
          gap: 8px;
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

        .admin-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: #ea580c;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .admin-search-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 240px;
          padding: 6px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .admin-search-input {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
          outline: none;
        }

        .admin-filter-pills {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        .pill-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
        }

        .pill-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .mods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .mod-group-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .mod-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .attached-product-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .mod-group-name {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .btn-card-edit,
        .btn-card-del {
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
        }

        .btn-card-del:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .mod-meta-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .badge-req {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .badge-req.required {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #ffedd5;
        }

        .badge-req.optional {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
        }

        .spec-pill {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }

        .mod-options-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #f8fafc;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .mod-option-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12.5px;
          padding: 4px 0;
          border-bottom: 1px dashed #e2e8f0;
        }

        .mod-option-row:last-child {
          border-bottom: none;
        }

        .opt-name-box {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #1e293b;
          font-weight: 600;
        }

        .opt-bullet {
          color: #ea580c;
        }

        .opt-meta-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .opt-price {
          font-weight: 700;
          color: #0f172a;
        }

        .opt-avail-ok {
          font-size: 10.5px;
          color: #059669;
          font-weight: 700;
        }

        .opt-avail-off {
          font-size: 10.5px;
          color: #dc2626;
          font-weight: 700;
        }

        .empty-mods-box {
          grid-column: 1 / -1;
          padding: 48px 16px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
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
          max-width: 540px;
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
          max-height: 80vh;
          overflow-y: auto;
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

        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .form-input,
        .form-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .form-select.disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .options-section-box {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          background: #f8fafc;
        }

        .options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 13px;
          color: #0f172a;
        }

        .btn-add-option {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
        }

        .options-rows-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .option-edit-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .checkbox-mini {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .btn-remove-opt {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 6px;
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
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }

        .btn-submit {
          padding: 8px 18px;
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
