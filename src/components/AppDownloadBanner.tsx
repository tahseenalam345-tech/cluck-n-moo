"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export function AppDownloadBanner() {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("cnm_app_banner_dismissed");
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("cnm_app_banner_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <aside
      aria-label="App Download Notice"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "640px",
        backgroundColor: "var(--cnm-surface)",
        border: "1px solid var(--cnm-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--cnm-text-primary)",
        padding: "10px 16px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
        zIndex: 90,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              backgroundColor: "var(--cnm-orange)",
              color: "#ffffff",
              fontSize: "10px",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              padding: "2px 6px",
              borderRadius: "4px",
              letterSpacing: "0.05em",
            }}
          >
            CNM APP
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>
            Get the CNM app for faster ordering.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
          {/* Google Play Visual Placeholder Button (no fake URL) */}
          <button
            type="button"
            onClick={() => {
              // Non-breaking placeholder notice
              alert("The Cluck N Moo Android App is launching soon on Google Play!");
            }}
            title="Google Play Store app coming soon"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--cnm-surface)",
              border: "1px solid var(--cnm-border)",
              borderRadius: "6px",
              padding: "4px 10px",
              color: "var(--cnm-text-primary)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a2.38 2.38 0 0 1-.61-.715V2.529c.175-.289.387-.534.609-.715zm11.24 11.24l2.585 2.585-11.83 6.83 9.245-9.415zm0-2.108L5.604 1.53l11.83 6.83-2.585 2.586zm1.48 1.054l3.52 2.032c.983.568.983 1.494 0 2.062l-3.52 2.032-2.338-2.338 2.338-2.088z" />
            </svg>
            <span>Google Play</span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            style={{
              color: "var(--cnm-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
