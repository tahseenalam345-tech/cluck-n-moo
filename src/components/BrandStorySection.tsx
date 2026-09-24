"use client";

import React from "react";
import { BRAND } from "@/lib/constants";
import { MapPin, Phone, Clock, ShieldCheck, Sparkles, Flame } from "lucide-react";


interface BrandStorySectionProps {
  isHighlighted?: boolean;
}

export function BrandStorySection({ isHighlighted = false }: BrandStorySectionProps) {
  return (
    <section
      id="cnm-historia-section"
      aria-label="Cluck N Moo Brand Story & Location"
      style={{
        padding: "36px 0 48px",
        backgroundColor: "var(--cnm-surface)",
        borderTop: "1px solid var(--cnm-border)",
        borderBottom: "1px solid var(--cnm-border)",
        margin: "24px 0",
        transition: "all 0.3s ease",
        boxShadow: isHighlighted ? "0 0 30px rgba(255, 130, 67, 0.25)" : "none",
      }}
    >
      <div className="container">
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          {/* Header Badge & Title */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--cnm-orange)",
                backgroundColor: "rgba(255, 130, 67, 0.1)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              <Sparkles size={12} /> NUESTRA HISTORIA • BRAND HERITAGE
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--cnm-text-primary)",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                marginBottom: "8px",
              }}
            >
              Cluck N Moo — Juiciest in Town
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--cnm-text-muted)",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: 1.5,
              }}
            >
              Born on Main GT Road Kharian, crafted for serious food lovers who crave pure seasoned beef smash patties, fiery zinger crunch, and stone-baked pizzas.
            </p>
          </div>

          {/* 3-Column Story Cards Grid */}
          <div className="historia-cards-grid">
            {/* Card 1: The Food Philosophy */}
            <div
              className="card"
              style={{
                padding: "22px 20px",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 130, 67, 0.12)",
                  color: "var(--cnm-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={18} />
              </div>
              <h3

                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--cnm-text-primary)",
                }}
              >
                Freshly Smashed & Hand-Breaded
              </h3>
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", lineHeight: 1.5 }}>
                Every single smash patty is 100% pure seasoned beef, pressed sizzling hot on our flat-top to form that signature caramelized crust. Our chicken is double hand-breaded in secret 11-spice batter.
              </p>
            </div>

            {/* Card 2: 100% Halal & Cash Friendly */}
            <div
              className="card"
              style={{
                padding: "22px 20px",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--cnm-text-primary)",
                }}
              >
                100% Halal & Cash on Delivery
              </h3>
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", lineHeight: 1.5 }}>
                Strict adherence to genuine certified Halal poultry and meat. Simple and hassle-free ordering: pay with cash when your rider arrives or when taking away at our counter.
              </p>
            </div>

            {/* Card 3: Kharian Main Branch & Hours */}
            <div
              className="card"
              style={{
                padding: "22px 20px",
                backgroundColor: "var(--cnm-surface-elevated)",
                border: "1px solid var(--cnm-border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 130, 67, 0.12)",
                  color: "var(--cnm-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={18} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--cnm-text-primary)",
                }}
              >
                Main Branch Kharian
              </h3>
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", lineHeight: 1.5 }}>
                <strong>Address:</strong> {BRAND.branch.address}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--cnm-text-muted)" }}>
                <Clock size={13} color="var(--cnm-orange)" />
                <span>12:01 PM – 02:00 AM PKT (Every day)</span>
              </div>
              <a
                href={`tel:${BRAND.branch.phone}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--cnm-orange)",
                  fontSize: "13px",
                  fontWeight: 700,
                  marginTop: "4px",
                }}
              >
                <Phone size={13} />
                <span>Direct Hotline: {BRAND.branch.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .historia-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 860px) {
          .historia-cards-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </section>
  );
}
