import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Compass, ArrowRight } from "lucide-react";

export default function NotFound() {
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
            backgroundColor: "rgba(255, 130, 67, 0.12)",
            color: "var(--cnm-orange)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <Compass size={32} />
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 900,
            marginBottom: "8px",
            color: "var(--cnm-text-primary)",
          }}
        >
          404 — PAGE NOT FOUND
        </h1>

        <p
          style={{
            color: "var(--cnm-text-secondary)",
            fontSize: "15px",
            lineHeight: 1.5,
            marginBottom: "28px",
          }}
        >
          We couldn&apos;t find the page you were looking for. Perhaps you followed an old link or the item was moved.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary" style={{ padding: "12px 24px" }}>
            <span>Explore Menu</span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/deals" className="btn btn-secondary" style={{ padding: "12px 24px" }}>
            <span>View Deals</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
