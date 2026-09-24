"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        backgroundColor: "var(--cnm-bg)",
        color: "var(--cnm-text-primary)",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          padding: "40px 24px",
          backgroundColor: "var(--cnm-surface)",
          border: "1px solid var(--cnm-border)",
          boxShadow: "var(--shadow-elevated)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
          <BrandLogo size="md" />
        </div>

        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            color: "var(--status-cancelled)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <AlertCircle size={32} />
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 900,
            marginBottom: "8px",
            color: "var(--cnm-text-primary)",
          }}
        >
          SOMETHING WENT WRONG
        </h1>

        <p
          style={{
            color: "var(--cnm-text-secondary)",
            fontSize: "14.5px",
            lineHeight: 1.5,
            marginBottom: "28px",
          }}
        >
          We encountered an unexpected error while loading this page. Please try refreshing or return to the storefront.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ padding: "12px 24px" }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
          <Link href="/" className="btn btn-secondary" style={{ padding: "12px 24px" }}>
            <span>Back to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
