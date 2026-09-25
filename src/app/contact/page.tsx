"use client";

import React from "react";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { BRAND, INITIAL_DELIVERY_AREAS } from "@/lib/constants";
import { MapPin, Phone, Clock, Bike } from "lucide-react";

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader />

      <main style={{ flex: 1, padding: "40px 0 60px" }}>
        <div className="container">
          <div style={{ marginBottom: "36px" }}>
            <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
              FIND US IN KHARIAN
            </span>
            <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "8px" }}>
              Branch Location & Hotline
            </h1>
            <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)" }}>
              Dine-in, pick up hot at counter, or have your smash burgers delivered across Kharian and Cantt.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              marginBottom: "40px",
            }}
          >
            {/* Branch Card */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <h2 style={{ fontSize: "20px", color: "var(--cnm-text-primary)", marginBottom: "16px" }}>
                {BRAND.branch.name}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <MapPin size={20} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--cnm-text-primary)" }}>Address</strong>
                    <span style={{ color: "var(--cnm-text-muted)" }}>{BRAND.branch.address}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <Phone size={20} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--cnm-text-primary)" }}>Order Hotline (Call / WhatsApp)</strong>
                    <a
                      href={`tel:${BRAND.branch.phone}`}
                      style={{ color: "var(--cnm-orange)", fontWeight: 800, fontSize: "16px" }}
                    >
                      {BRAND.branch.phone}
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <Clock size={20} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--cnm-text-primary)" }}>Operating Hours</strong>
                    <span style={{ color: "var(--cnm-text-muted)" }}>
                      Every day: 12:01 PM to 02:00 AM PKT (Midnight crossing)
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <MapPin size={20} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--cnm-text-primary)" }}>Coordinates</strong>
                    <span style={{ color: "var(--cnm-text-muted)" }}>
                      Lat: {BRAND.branch.coordinates.lat}, Lng: {BRAND.branch.coordinates.lng}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Areas Card */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Bike size={20} color="var(--cnm-orange)" />
                <h2 style={{ fontSize: "20px", color: "var(--cnm-text-primary)" }}>
                  Delivery Villages Covered
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", marginBottom: "16px" }}>
                Flat delivery fee: <strong>100 PKR</strong>. Delivery time estimate ~40 minutes.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {INITIAL_DELIVERY_AREAS.map((area) => (
                  <span
                    key={area}
                    style={{
                      backgroundColor: "var(--cnm-surface-elevated)",
                      border: "1px solid var(--cnm-border)",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--cnm-text-primary)",
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
