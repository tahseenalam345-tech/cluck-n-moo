"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  UploadIcon,
  ImageIcon,
  CopyIcon,
} from "./AdminIcons";
import { Product, Category, ProductVariant, ProductModifierGroup } from "@/types";
import { buildCloudinaryUrl } from "../ProductImage";

interface AdminProductModalProps {
  product: Product | null; // null = Add Mode, Product = Edit Mode
  categories: Category[];
  allProducts?: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProduct?: any) => void;
}

const PRESET_TAGS = [
  "Popular",
  "Spicy",
  "New",
  "Deal",
  "Student Offer",
  "Crispy",
  "Chef Special",
];

export function AdminProductModal({
  product,
  categories,
  allProducts = [],
  isOpen,
  onClose,
  onSuccess,
}: AdminProductModalProps) {
  const isEditMode = Boolean(product);
  const [activeTab, setActiveTab] = useState<"general" | "variants" | "modifiers" | "media" | "tags">("general");

  // Basic Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [allergens, setAllergens] = useState("");
  const [calories, setCalories] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [basePricePkr, setBasePricePkr] = useState<number | string>(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isDisplayOrderManuallyEdited, setIsDisplayOrderManuallyEdited] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Variants
  const [variants, setVariants] = useState<
    Array<{ id?: string; name: string; pricePkr: number; isAvailable: boolean; displayOrder: number }>
  >([]);

  // Modifier Groups
  const [modifierGroups, setModifierGroups] = useState<
    Array<{
      id?: string;
      name: string;
      minSelection: number;
      maxSelection: number;
      isRequired: boolean;
      modifiers: Array<{ id?: string; name: string; pricePkr: number; isAvailable: boolean }>;
    }>
  >([]);

  // Media
  const [imageUrl, setImageUrl] = useState<string>("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string>("");
  const [imageAltText, setImageAltText] = useState<string>("");

  // Upload States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Drag & drop and upload progress state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Stable initialization guards to prevent tab resets and form wipes on parent re-renders/polling
  const wasOpenRef = useRef(false);
  const lastInitializedKeyRef = useRef<string | null>(null);
  const currentKey = product?.id || "__new__";

  // Populate state on open / product prop change ONLY when modal opens or target product switches
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      lastInitializedKeyRef.current = null;
      return;
    }

    // Modal already open for this product? DO NOT reset activeTab or wipe form inputs!
    if (wasOpenRef.current && lastInitializedKeyRef.current === currentKey) {
      return;
    }

    wasOpenRef.current = true;
    lastInitializedKeyRef.current = currentKey;
    setValidationError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setActiveTab("general");

    // Helper to calculate next order in category
    const calculateNextOrder = (catId: string) => {
      if (!allProducts || allProducts.length === 0) return 1;
      const catProducts = allProducts.filter((p) => p.categoryId === catId);
      if (catProducts.length === 0) return 1;
      const maxOrd = catProducts.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);
      return maxOrd + 1;
    };

    if (product) {
      setName(product.name || "");
      setSlug(product.slug || "");
      setIsSlugManuallyEdited(true);
      setCategoryId(product.categoryId || (categories[0]?.id || ""));
      setDescription(product.description || "");
      setIngredients("");
      setAllergens("");
      setCalories("");
      setInternalNotes("");
      setBasePricePkr(product.basePricePkr || 0);
      setIsAvailable(product.isAvailable !== false);
      setIsFeatured(Boolean(product.isFeatured));
      setDisplayOrder(product.displayOrder || 0);
      setIsDisplayOrderManuallyEdited(true);
      setTags(product.tags || []);
      setImageUrl(product.imageUrl || "");
      setCloudinaryPublicId(product.cloudinaryPublicId || "");
      setImageAltText(product.imageAltText || product.name || "");

      // Populate variants
      if (product.variants && product.variants.length > 0) {
        setVariants(
          product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            pricePkr: v.pricePkr,
            isAvailable: Boolean(v.isAvailable),
            displayOrder: v.displayOrder,
          }))
        );
      } else {
        setVariants([]);
      }

      // Populate modifier groups
      if (product.modifierGroups && product.modifierGroups.length > 0) {
        setModifierGroups(
          product.modifierGroups.map((mg) => ({
            id: mg.id,
            name: mg.name,
            minSelection: mg.minSelection,
            maxSelection: mg.maxSelection,
            isRequired: Boolean(mg.isRequired),
            modifiers: mg.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              pricePkr: m.pricePkr,
              isAvailable: Boolean(m.isAvailable),
            })),
          }))
        );
      } else {
        setModifierGroups([]);
      }
    } else {
      // Reset for new product
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      const initialCatId = categories[0]?.id || "";
      setCategoryId(initialCatId);
      setDescription("");
      setIngredients("");
      setAllergens("");
      setCalories("");
      setInternalNotes("");
      setBasePricePkr("");
      setIsAvailable(true);
      setIsFeatured(false);
      setDisplayOrder(calculateNextOrder(initialCatId));
      setIsDisplayOrderManuallyEdited(false);
      setTags([]);
      setImageUrl("");
      setCloudinaryPublicId("");
      setImageAltText("");
      setVariants([]);
      setModifierGroups([]);
    }
  }, [isOpen, currentKey]);

  // If categoryId is empty and categories load late, select the first category without resetting tab
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // When category changes, auto-assign next available display order for new items if not manually edited
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    if (!isEditMode && !isDisplayOrderManuallyEdited) {
      if (allProducts && allProducts.length > 0) {
        const catProducts = allProducts.filter((p) => p.categoryId === newCatId);
        const maxOrd = catProducts.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);
        setDisplayOrder(maxOrd + 1);
      } else {
        setDisplayOrder(1);
      }
    }
  };

  // Auto-generate slug when name changes (unless manually edited)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  // Explicit auto-regenerate slug button
  const handleRegenerateSlug = () => {
    const generated = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
    setIsSlugManuallyEdited(false);
  };

  // Toggle tag
  const handleToggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Variants handlers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        name: "",
        pricePkr: Number(basePricePkr) || 0,
        isAvailable: true,
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, field: string, val: any) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Modifier Groups handlers
  const handleAddModifierGroup = () => {
    setModifierGroups((prev) => [
      ...prev,
      {
        name: "Customization Group",
        minSelection: 0,
        maxSelection: 1,
        isRequired: false,
        modifiers: [{ name: "Option 1", pricePkr: 0, isAvailable: true }],
      },
    ]);
  };

  const handleRemoveModifierGroup = (gIndex: number) => {
    setModifierGroups((prev) => prev.filter((_, i) => i !== gIndex));
  };

  const handleAddModifierOption = (gIndex: number) => {
    setModifierGroups((prev) => {
      const updated = [...prev];
      updated[gIndex].modifiers.push({
        name: "",
        pricePkr: 0,
        isAvailable: true,
      });
      return updated;
    });
  };

  const handleRemoveModifierOption = (gIndex: number, mIndex: number) => {
    setModifierGroups((prev) => {
      const updated = [...prev];
      updated[gIndex].modifiers = updated[gIndex].modifiers.filter((_, i) => i !== mIndex);
      return updated;
    });
  };

  // Cloudinary Direct Signed Upload
  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Unsupported format. Please upload JPG, PNG, or WebP.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Image is too large. Maximum file size is 12MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // 1. Get signed credentials from server
      const signRes = await fetch("/api/v1/admin/media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "cnm/menu",
          customSlug: slug || name || "product",
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) {
        throw new Error(signData.error?.message || "Failed to generate upload signature.");
      }

      setUploadProgress(45);
      const { cloudName, apiKey, timestamp, signature, folder, publicId } = signData.data;

      // 2. Direct Multipart Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("public_id", publicId);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        throw new Error(cloudData.error?.message || "Cloudinary direct upload failed.");
      }

      setUploadProgress(80);

      // 3. Save into media library table
      await fetch("/api/v1/admin/media/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: cloudData.public_id,
          secureUrl: cloudData.secure_url,
          folder,
          format: cloudData.format,
          width: cloudData.width,
          height: cloudData.height,
          bytes: cloudData.bytes,
          altText: imageAltText || name,
        }),
      });

      setUploadProgress(100);

      // 4. Update product form state
      setImageUrl(cloudData.secure_url);
      setCloudinaryPublicId(cloudData.public_id);
      if (!imageAltText) setImageAltText(name);
      setUploadSuccess("Food image uploaded and synchronized with Cloudinary CDN!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1200);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation: Only Name, Category, and Base Price are required
    if (!name.trim()) {
      setValidationError("Product Name is required.");
      return;
    }
    if (!categoryId) {
      setValidationError("Please select a Category.");
      return;
    }
    const priceNum = parseInt(String(basePricePkr), 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError("Base Price must be a valid non-negative integer in PKR (e.g. 850).");
      return;
    }

    setIsSaving(true);

    try {
      // Build combined description if optional ingredients/allergens/notes entered
      let finalDescription = description.trim();
      const extraParts: string[] = [];
      if (ingredients.trim()) extraParts.push(`Ingredients: ${ingredients.trim()}`);
      if (allergens.trim()) extraParts.push(`Allergens: ${allergens.trim()}`);
      if (calories.trim()) extraParts.push(`Calories: ${calories.trim()}`);
      if (internalNotes.trim()) extraParts.push(`Notes: ${internalNotes.trim()}`);
      if (extraParts.length > 0) {
        finalDescription = finalDescription
          ? `${finalDescription}\n\n${extraParts.join(" | ")}`
          : extraParts.join(" | ");
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        categoryId,
        description: finalDescription || null,
        basePricePkr: priceNum,
        isAvailable,
        isFeatured,
        displayOrder: Number(displayOrder) || 0,
        tags,
        imageUrl: imageUrl || null,
        cloudinaryPublicId: cloudinaryPublicId || null,
        imageAltText: imageAltText || name.trim(),
        variants: variants.filter((v) => v.name && v.name.trim()),
        modifierGroups: modifierGroups.filter((g) => g.name && g.name.trim()),
      };

      const url = isEditMode
        ? `/api/v1/admin/products/${product!.id}`
        : "/api/v1/admin/products";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || "Failed to save product.");
      }

      // Safe normalized return object ensuring no undefined access in caller
      const returnedProduct = resData.data || {
        id: product?.id || "temp",
        name: name.trim(),
        slug: slug.trim(),
        categoryId,
        description: finalDescription || null,
        basePricePkr: priceNum,
        isAvailable,
        isFeatured,
        displayOrder: Number(displayOrder) || 0,
        tags,
        imageUrl: imageUrl || null,
        cloudinaryPublicId: cloudinaryPublicId || null,
      };

      onSuccess(returnedProduct);
      onClose();
    } catch (err: any) {
      console.error("Save product error:", err);
      setValidationError(err?.message || "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">
              {isEditMode ? `Edit: ${product?.name}` : "Create New Menu Item"}
            </h2>
            <span className="admin-modal-subtitle">
              {isEditMode ? `ID: ${product?.id}` : "Configure product details, variants, modifiers & image"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="admin-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="admin-modal-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            1. General Info
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "media" ? "active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            2. Food Imagery (Optional) {cloudinaryPublicId && "✓"}
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "variants" ? "active" : ""}`}
            onClick={() => setActiveTab("variants")}
          >
            3. Sizes &amp; Variants (Optional) {variants.length > 0 && `(${variants.length})`}
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "modifiers" ? "active" : ""}`}
            onClick={() => setActiveTab("modifiers")}
          >
            4. Modifiers &amp; Dips (Optional) {modifierGroups.length > 0 && `(${modifierGroups.length})`}
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "tags" ? "active" : ""}`}
            onClick={() => setActiveTab("tags")}
          >
            5. Tags &amp; Badges (Optional) {tags.length > 0 && `(${tags.length})`}
          </button>
        </div>

        {/* Error Alert */}
        {validationError && (
          <div className="admin-modal-alert error">
            <AlertCircle size={15} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="admin-modal-body">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === "general" && (
            <div className="admin-form-section">
              <div className="admin-form-row">
                <div className="admin-field-group flex-2">
                  <label className="admin-label">Dish Name * <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 400 }}>(Required)</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Flaming Tikka Pizza"
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group flex-1">
                  <label className="admin-label">Category * <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 400 }}>(Required)</span></label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="admin-select"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field-group flex-1">
                  <label className="admin-label">Base Price (PKR) * <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 400 }}>(Required)</span></label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={basePricePkr}
                    onChange={(e) => setBasePricePkr(e.target.value)}
                    placeholder="e.g. 990"
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group flex-1">
                  <label className="admin-label" title="Automatically assigned to next order number in category">
                    Display Order <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>(Auto-assigned)</span>
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => {
                      setDisplayOrder(parseInt(e.target.value, 10) || 0);
                      setIsDisplayOrderManuallyEdited(true);
                    }}
                    placeholder="0"
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group flex-1">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="admin-label">
                      Slug <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>(Auto-generated)</span>
                    </label>
                    {isSlugManuallyEdited && (
                      <button
                        type="button"
                        onClick={handleRegenerateSlug}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ea580c",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title="Re-sync slug from Dish Name"
                      >
                        ↺ Auto-sync
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setIsSlugManuallyEdited(true);
                    }}
                    placeholder="flaming-tikka-pizza"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-label">
                  Customer Description <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh hand-stretched crust topped with fiery tikka chicken chunks, bell peppers, mozzarella, and house signature sauce."
                  className="admin-textarea"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-field-group flex-1">
                  <label className="admin-label">
                    Ingredients &amp; Allergens <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="e.g. Dairy, Gluten, Chicken breast, Peppers"
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group flex-1">
                  <label className="admin-label">
                    Calories / Nutrition <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="e.g. 520 kcal"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-checkbox-row">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  <span><strong>Available for Ordering</strong> (Active by default, uncheck to mark Sold Out)</span>
                </label>

                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span><strong>Featured in Popular Picks</strong> (Manual Admin setting)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA & CLOUDINARY UPLOAD */}
          {activeTab === "media" && (
            <div className="admin-form-section">
              <div className="admin-media-manager-card">
                {/* Current Image Preview */}
                <div className="admin-media-preview-box">
                  {cloudinaryPublicId ? (
                    <img
                      src={buildCloudinaryUrl(cloudinaryPublicId, 600)}
                      alt={imageAltText || name}
                      className="admin-media-img"
                    />
                  ) : imageUrl ? (
                    <img src={imageUrl} alt={imageAltText || name} className="admin-media-img" />
                  ) : (
                    <div className="admin-media-placeholder">
                      <ImageIcon size={36} color="var(--admin-text-muted)" />
                      <span>No image assigned yet</span>
                    </div>
                  )}
                </div>

                {/* Cloudinary Metadata & Controls */}
                <div className="admin-media-controls">
                  <div className="admin-media-info">
                    <strong>Cloudinary Status:</strong>
                    {cloudinaryPublicId ? (
                      <span className="badge-ok">
                        <CheckCircle2 size={13} /> CDN Synced
                      </span>
                    ) : (
                      <span className="badge-pending">Pending Upload</span>
                    )}
                  </div>

                  {cloudinaryPublicId && (
                    <div className="admin-public-id-box">
                      <code>{cloudinaryPublicId}</code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(buildCloudinaryUrl(cloudinaryPublicId, 1200));
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="btn-copy-url"
                        title="Copy CDN URL"
                      >
                        {copiedUrl ? <Check size={12} /> : <CopyIcon size={12} />}
                      </button>
                    </div>
                  )}

                  {/* Drag-and-Drop / File Upload Trigger */}
                  <div
                    className={`admin-dropzone ${isDragging ? "active-drag" : ""} ${isUploading ? "uploading" : ""}`}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleFileSelected(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: isDragging ? "2px dashed #ff6b35" : "2px dashed #cbd5e1",
                      backgroundColor: isDragging ? "#fff7ed" : isUploading ? "#f8fafc" : "#ffffff",
                      cursor: isUploading ? "wait" : "pointer",
                      padding: "24px 16px",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelected(e.target.files[0]);
                        }
                      }}
                    />
                    <UploadIcon size={24} color={isDragging ? "#ff6b35" : "#64748b"} />
                    <strong style={{ color: isDragging ? "#ea580c" : "#0f172a", fontSize: "14px" }}>
                      {isUploading
                        ? `Uploading to Cloudinary... ${uploadProgress ? `(${uploadProgress}%)` : ""}`
                        : isDragging
                        ? "Drop food photo here to upload!"
                        : "Click or Drag Food Image Here"}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Supports JPG, PNG, WebP (Max 12MB, Auto-optimized via Cloudinary CDN)
                    </span>

                    {/* Progress Bar */}
                    {isUploading && uploadProgress !== null && (
                      <div
                        style={{
                          width: "80%",
                          height: "6px",
                          backgroundColor: "#e2e8f0",
                          borderRadius: "999px",
                          marginTop: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${uploadProgress}%`,
                            height: "100%",
                            backgroundColor: "#ff6b35",
                            borderRadius: "999px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {uploadError && <div className="admin-inline-alert error">{uploadError}</div>}
                  {uploadSuccess && <div className="admin-inline-alert success">{uploadSuccess}</div>}

                  {/* Alt Text Input */}
                  <div className="admin-field-group">
                    <label className="admin-label">Image Alt Text (SEO &amp; Accessibility)</label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
                      placeholder="e.g. Freshly baked Flaming Tikka Pizza with molten cheese"
                      className="admin-input"
                    />
                  </div>

                  {/* Remove mapping button */}
                  {(cloudinaryPublicId || imageUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        setCloudinaryPublicId("");
                      }}
                      className="admin-btn-remove-image"
                    >
                      <Trash2 size={13} /> Remove Image Mapping from Dish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VARIANTS */}
          {activeTab === "variants" && (
            <div className="admin-form-section">
              <div className="admin-section-subhead">
                <div>
                  <h3 className="admin-subhead-title">Size Variants &amp; Portions</h3>
                  <span className="admin-subhead-desc">
                    Add sizes (e.g. Small 7&quot;, Medium 10&quot;, Large 13&quot;) or portions (Single, Double).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="admin-btn-secondary"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {variants.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No variants configured. This dish will sell at the Base Price.</p>
                  <button type="button" onClick={handleAddVariant} className="admin-btn-primary">
                    <Plus size={14} /> Add Size Variant
                  </button>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Variant Name</th>
                        <th style={{ width: "130px" }}>Price (PKR)</th>
                        <th style={{ width: "100px" }}>Available</th>
                        <th style={{ width: "60px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="text"
                              required
                              value={v.name}
                              onChange={(e) => handleUpdateVariant(i, "name", e.target.value)}
                              placeholder="e.g. Medium (10 inch)"
                              className="admin-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              required
                              min={0}
                              value={v.pricePkr}
                              onChange={(e) =>
                                handleUpdateVariant(i, "pricePkr", parseInt(e.target.value, 10) || 0)
                              }
                              className="admin-input"
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={v.isAvailable}
                              onChange={(e) => handleUpdateVariant(i, "isAvailable", e.target.checked)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(i)}
                              className="btn-icon-danger"
                              title="Delete variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MODIFIERS & CUSTOMIZATIONS */}
          {activeTab === "modifiers" && (
            <div className="admin-form-section">
              <div className="admin-section-subhead">
                <div>
                  <h3 className="admin-subhead-title">Customizations &amp; Add-ons</h3>
                  <span className="admin-subhead-desc">
                    Attach groups like Stuffed Crust, Signature Dipping Sauces, or Patty Upgrades.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddModifierGroup}
                  className="admin-btn-secondary"
                >
                  <Plus size={14} /> Add Customization Group
                </button>
              </div>

              {modifierGroups.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No add-on groups attached to this item.</p>
                  <button type="button" onClick={handleAddModifierGroup} className="admin-btn-primary">
                    <Plus size={14} /> Add Customization Group
                  </button>
                </div>
              ) : (
                modifierGroups.map((g, gIdx) => (
                  <div key={gIdx} className="admin-group-card">
                    <div className="admin-group-header">
                      <div className="group-title-row">
                        <input
                          type="text"
                          required
                          value={g.name}
                          onChange={(e) => {
                            const updated = [...modifierGroups];
                            updated[gIdx].name = e.target.value;
                            setModifierGroups(updated);
                          }}
                          placeholder="Group Name (e.g. Cheese Stuffed Crust)"
                          className="admin-input bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveModifierGroup(gIdx)}
                          className="btn-icon-danger"
                          title="Delete modifier group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="group-rules-row">
                        <label className="rule-item">
                          <span>Max Pick:</span>
                          <input
                            type="number"
                            min={1}
                            value={g.maxSelection}
                            onChange={(e) => {
                              const updated = [...modifierGroups];
                              updated[gIdx].maxSelection = parseInt(e.target.value, 10) || 1;
                              setModifierGroups(updated);
                            }}
                            className="admin-input-small"
                          />
                        </label>

                        <label className="rule-checkbox">
                          <input
                            type="checkbox"
                            checked={g.isRequired}
                            onChange={(e) => {
                              const updated = [...modifierGroups];
                              updated[gIdx].isRequired = e.target.checked;
                              setModifierGroups(updated);
                            }}
                          />
                          <span>Required by customer</span>
                        </label>
                      </div>
                    </div>

                    {/* Modifier Options */}
                    <div className="admin-options-list">
                      {g.modifiers.map((m, mIdx) => (
                        <div key={mIdx} className="admin-option-row">
                          <input
                            type="text"
                            required
                            value={m.name}
                            onChange={(e) => {
                              const updated = [...modifierGroups];
                              updated[gIdx].modifiers[mIdx].name = e.target.value;
                              setModifierGroups(updated);
                            }}
                            placeholder="Option name (e.g. Cheese Stuffed Crust)"
                            className="admin-input flex-2"
                          />
                          <div className="price-addon-box flex-1">
                            <span className="price-prefix">+</span>
                            <input
                              type="number"
                              min={0}
                              value={m.pricePkr}
                              onChange={(e) => {
                                const updated = [...modifierGroups];
                                updated[gIdx].modifiers[mIdx].pricePkr =
                                  parseInt(e.target.value, 10) || 0;
                                setModifierGroups(updated);
                              }}
                              placeholder="0"
                              className="admin-input"
                            />
                            <span className="price-suffix">PKR</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveModifierOption(gIdx, mIdx)}
                            className="btn-icon-danger"
                            title="Remove option"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddModifierOption(gIdx)}
                        className="admin-btn-add-option"
                      >
                        <Plus size={12} /> Add Option
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: TAGS & MARKETING */}
          {activeTab === "tags" && (
            <div className="admin-form-section">
              <h3 className="admin-subhead-title">Badges &amp; Marketing Tags</h3>
              <p className="admin-subhead-desc">
                Select tags to render eye-catching badges on storefront product cards.
              </p>

              <div className="admin-tags-selector">
                {PRESET_TAGS.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`admin-tag-chip ${isSelected ? "selected" : ""}`}
                    >
                      {isSelected ? <Check size={12} /> : <Plus size={12} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Sticky Footer CTA */}
          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="admin-btn-primary"
            >
              {isSaving ? "Saving to Database..." : isEditMode ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
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

        .admin-modal-content {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          width: 100%;
          max-width: 780px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .admin-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--admin-border);
        }

        .admin-modal-title {
          font-family: var(--font-display, inherit);
          font-size: 17px;
          font-weight: 800;
          color: var(--admin-text-main);
          margin: 0 0 2px;
        }

        .admin-modal-subtitle {
          font-size: 11.5px;
          color: var(--admin-text-muted);
        }

        .admin-modal-close {
          background: transparent;
          border: none;
          color: var(--admin-text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .admin-modal-close:hover {
          color: var(--admin-text-main);
        }

        .admin-modal-tabs {
          display: flex;
          overflow-x: auto;
          background: var(--admin-bg);
          border-bottom: 1px solid var(--admin-border);
          padding: 0 12px;
        }

        .admin-tab-btn {
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          color: var(--admin-text-muted);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .admin-tab-btn:hover {
          color: var(--admin-text-main);
        }
        .admin-tab-btn.active {
          color: #ff6b35;
          border-bottom-color: #ff6b35;
        }

        .admin-modal-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 650;
        }
        .admin-modal-alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }

        .admin-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-form-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .admin-form-row {
          display: flex;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .admin-form-row {
            flex-direction: column;
          }
        }

        .admin-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .flex-1 {
          flex: 1;
        }
        .flex-2 {
          flex: 2;
        }

        .admin-label {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--admin-text-main);
        }

        .admin-input,
        .admin-select,
        .admin-textarea {
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          padding: 8px 11px;
          border-radius: 6px;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .admin-input:focus,
        .admin-select:focus,
        .admin-textarea:focus {
          border-color: #ff6b35;
        }
        .admin-input.bold {
          font-weight: 750;
        }
        .admin-input-small {
          width: 50px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 12px;
          text-align: center;
        }

        .admin-checkbox-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          padding-top: 6px;
        }

        .admin-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: var(--admin-text-main);
          cursor: pointer;
        }

        /* Media Tab */
        .admin-media-manager-card {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .admin-media-manager-card {
            grid-template-columns: 1fr;
          }
        }

        .admin-media-preview-box {
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          overflow: hidden;
          background: #121214;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-media-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-media-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--admin-text-muted);
        }

        .admin-media-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admin-media-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .badge-ok {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #10b981;
          font-weight: 750;
          font-size: 11px;
        }
        .badge-pending {
          color: #f59e0b;
          font-weight: 750;
          font-size: 11px;
        }

        .admin-public-id-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          padding: 6px 10px;
        }
        .admin-public-id-box code {
          font-size: 11px;
          color: #ff6b35;
        }
        .btn-copy-url {
          background: transparent;
          border: none;
          color: var(--admin-text-muted);
          cursor: pointer;
        }

        .admin-dropzone {
          border: 2px dashed rgba(255, 107, 53, 0.4);
          background: rgba(255, 107, 53, 0.04);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-dropzone:hover {
          border-color: #ff6b35;
          background: rgba(255, 107, 53, 0.08);
        }
        .admin-dropzone strong {
          font-size: 12px;
          color: var(--admin-text-main);
        }
        .admin-dropzone span {
          font-size: 10.5px;
          color: var(--admin-text-muted);
        }

        .admin-inline-alert {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 650;
        }
        .admin-inline-alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .admin-inline-alert.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .admin-btn-remove-image {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          width: fit-content;
        }

        /* Variants and Modifiers Table */
        .admin-section-subhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .admin-subhead-title {
          font-size: 13.5px;
          font-weight: 750;
          color: var(--admin-text-main);
          margin: 0;
        }
        .admin-subhead-desc {
          font-size: 11.5px;
          color: var(--admin-text-muted);
        }

        .admin-empty-state {
          border: 1px dashed var(--admin-border);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          font-size: 12.5px;
          color: var(--admin-text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .admin-table-wrapper {
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          overflow: hidden;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .admin-table th {
          background: var(--admin-bg);
          padding: 8px 12px;
          text-align: left;
          font-weight: 750;
          color: var(--admin-text-muted);
          border-bottom: 1px solid var(--admin-border);
        }
        .admin-table td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--admin-border);
        }

        .btn-icon-danger {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
        }

        /* Modifier Groups */
        .admin-group-card {
          border: 1px solid var(--admin-border);
          background: var(--admin-bg);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .admin-group-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-bottom: 1px solid var(--admin-border);
          padding-bottom: 10px;
        }
        .group-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .group-rules-row {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 11.5px;
        }
        .rule-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rule-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .admin-options-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .admin-option-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .price-addon-box {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          padding: 0 8px;
        }
        .price-addon-box input {
          border: none;
          background: transparent;
          width: 70px;
          padding: 6px 0;
          font-size: 12px;
          outline: none;
          color: var(--admin-text-main);
        }
        .price-prefix,
        .price-suffix {
          font-size: 11px;
          font-weight: 750;
          color: #ff6b35;
        }

        .admin-btn-add-option {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px dashed #ff6b35;
          color: #ff6b35;
          font-size: 11px;
          font-weight: 750;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
          width: fit-content;
          margin-top: 4px;
        }

        /* Tags */
        .admin-tags-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 6px;
        }
        .admin-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-tag-chip.selected {
          background: #ff6b35;
          border-color: #ff6b35;
          color: #ffffff;
        }

        /* Sticky Footer */
        .admin-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--admin-border);
          background: var(--admin-card-bg);
        }
      `}</style>
    </div>
  );
}
