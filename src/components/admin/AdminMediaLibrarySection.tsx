"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  Search,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  UploadIcon,
  ImageIcon,
  CopyIcon,
  FolderIcon,
} from "./AdminIcons";
import { MediaAsset } from "@/types";
import { buildCloudinaryUrl } from "../ProductImage";

export function AdminMediaLibrarySection() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedFolder !== "all") params.set("folder", selectedFolder);

      const res = await fetch(`/api/v1/admin/media?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssets(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [selectedFolder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUploadFile = async (file: File) => {
    setUploadError(null);
    const valid = ["image/jpeg", "image/png", "image/webp"];
    if (!valid.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    setIsUploading(true);

    try {
      const targetFolder = selectedFolder !== "all" ? selectedFolder : "cnm/menu";

      // 1. Get Signature
      const signRes = await fetch("/api/v1/admin/media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: targetFolder,
          customSlug: file.name.split(".")[0],
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) {
        throw new Error(signData.error?.message || "Failed to generate upload signature.");
      }

      const { cloudName, apiKey, timestamp, signature, folder, publicId } = signData.data;

      // 2. Upload direct to Cloudinary
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

      // 3. Register in Media Assets DB
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
          altText: file.name.split(".")[0],
        }),
      });

      fetchMedia();
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyUrl = (publicId: string, secureUrl: string) => {
    const url = buildCloudinaryUrl(publicId, 1200) || secureUrl;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="admin-media-container">
      {/* Top bar */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Cloudinary Media Library</h1>
          <p className="admin-page-subtitle">
            Upload, preview, and organize official food photography and promotional banners.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchMedia}
            className="admin-btn-secondary"
            title="Refresh library"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="admin-btn-primary"
            disabled={isUploading}
          >
            <UploadIcon size={15} />
            <span>{isUploading ? "Uploading..." : "Upload Images"}</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUploadFile(e.target.files[0]);
          }
        }}
      />

      {/* Drag & Drop Hero Box */}
      <div
        className="admin-upload-hero"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) {
            handleUploadFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="upload-hero-icon">
          <UploadIcon size={24} color="#ff6b35" />
        </div>
        <strong>Drag &amp; Drop Food Photography Here or Click to Browse</strong>
        <span>Automatically uploads directly to Cloudinary with CDN WebP/AVIF delivery</span>
        {uploadError && <span className="upload-error-msg">{uploadError}</span>}
      </div>

      {/* Filter / Search Bar */}
      <div className="admin-media-toolbar">
        <div className="media-search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by public ID or name..."
            className="media-search-input"
          />
        </div>

        <div className="folder-pills">
          <FolderIcon size={14} color="var(--admin-text-muted)" />
          {[
            { id: "all", label: "All Folders" },
            { id: "cnm/menu", label: "cnm/menu" },
            { id: "cnm/deals", label: "cnm/deals" },
            { id: "cnm/promotions", label: "cnm/promotions" },
            { id: "cnm/media", label: "cnm/media" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolder(f.id)}
              className={`folder-pill ${selectedFolder === f.id ? "active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="admin-media-grid">
        {assets.map((asset) => (
          <div key={asset.id} className="media-card">
            <div className="media-img-box">
              <img
                src={buildCloudinaryUrl(asset.publicId, 400) || asset.secureUrl}
                alt={asset.altText || asset.publicId}
                className="media-img"
                loading="lazy"
              />
              <span className="media-folder-tag">{asset.folder}</span>
            </div>

            <div className="media-meta">
              <code className="media-public-id" title={asset.publicId}>
                {asset.publicId}
              </code>

              <div className="media-actions-row">
                <span className="media-dims">
                  {asset.width && asset.height ? `${asset.width}x${asset.height}` : "CDN"}
                  {asset.format ? ` · ${asset.format.toUpperCase()}` : ""}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyUrl(asset.publicId, asset.secureUrl)}
                  className="btn-media-copy"
                  title="Copy Optimized CDN Link"
                >
                  {copiedId === asset.publicId ? (
                    <>
                      <Check size={12} color="#10b981" /> Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon size={12} /> Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && !isLoading && (
        <div className="admin-empty-media">
          <ImageIcon size={32} color="var(--admin-text-muted)" />
          <p>No media assets found in this folder.</p>
        </div>
      )}

      <style jsx>{`
        .admin-media-container {
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

        /* Upload Hero */
        .admin-upload-hero {
          border: 2px dashed rgba(255, 107, 53, 0.4);
          background: rgba(255, 107, 53, 0.04);
          border-radius: 10px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-upload-hero:hover {
          border-color: #ff6b35;
          background: rgba(255, 107, 53, 0.08);
        }
        .upload-hero-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 107, 53, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .admin-upload-hero strong {
          font-size: 14px;
          color: var(--admin-text-main);
        }
        .admin-upload-hero span {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .upload-error-msg {
          color: #ef4444 !important;
          font-weight: 700;
          margin-top: 4px;
        }

        /* Toolbar */
        .admin-media-toolbar {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .media-search-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 6px 10px;
          border-radius: 6px;
          width: 280px;
        }
        .search-icon {
          color: var(--admin-text-muted);
        }
        .media-search-input {
          border: none;
          background: transparent;
          font-size: 12px;
          outline: none;
          color: var(--admin-text-main);
          width: 100%;
        }

        .folder-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .folder-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 650;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-main);
          cursor: pointer;
        }
        .folder-pill.active {
          background: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
        }

        /* Media Grid */
        .admin-media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }

        .media-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.15s ease;
        }
        .media-card:hover {
          border-color: #ff6b35;
          transform: translateY(-2px);
        }

        .media-img-box {
          position: relative;
          width: 100%;
          height: 150px;
          background: #121214;
        }
        .media-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .media-folder-tag {
          position: absolute;
          top: 6px;
          left: 6px;
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          font-size: 9px;
          font-weight: 750;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .media-meta {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .media-public-id {
          font-size: 11px;
          font-weight: 700;
          color: var(--admin-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .media-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
          border-top: 1px solid var(--admin-border);
        }
        .media-dims {
          font-size: 10px;
          color: var(--admin-text-muted);
        }

        .btn-media-copy {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 750;
          padding: 3px 6px;
          color: var(--admin-text-main);
          cursor: pointer;
        }

        .admin-empty-media {
          background: var(--admin-card-bg);
          border: 1px dashed var(--admin-border);
          border-radius: 10px;
          padding: 36px;
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
