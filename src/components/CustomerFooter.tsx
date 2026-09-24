"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { BRAND, INITIAL_DELIVERY_AREAS } from "@/lib/constants";
import { MapPin, Phone, Clock, Bike, ShieldCheck, Flame } from "lucide-react";

export function CustomerFooter() {
  return (
    <footer
      style={{
        backgroundColor: "var(--cnm-surface)",
        borderTop: "1px solid var(--cnm-border)",
        padding: "48px 0 24px",
        marginTop: "64px",
        color: "var(--cnm-text-secondary)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "36px",
            marginBottom: "40px",
          }}
        >
          {/* Brand Col */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <BrandLogo size="md" />
            <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", lineHeight: 1.5 }}>
              Kharian&apos;s ultimate fast-casual burger and crispy fried chicken headquarters. Smashed fresh, fried crisp, delivered hot.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--cnm-orange)", fontWeight: 700 }}>
              <Flame size={14} />
              <span>Proudly serving Kharian & Cantt</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "14px", letterSpacing: "0.05em" }}>
              EXPLORE
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "var(--cnm-text-muted)" }}>
              <li>
                <Link href="/" style={{ transition: "color 0.15s" }}>Home</Link>
              </li>
              <li>
                <Link href="/menu" style={{ transition: "color 0.15s" }}>Full Food Menu</Link>
              </li>
              <li>
                <Link href="/deals" style={{ color: "var(--cnm-orange)", fontWeight: 700 }}>Exclusive Deals</Link>
              </li>
              <li>
                <Link href="/order/track" style={{ transition: "color 0.15s" }}>Track Live Order</Link>
              </li>
              <li>
                <Link href="/account" style={{ transition: "color 0.15s" }}>Saved Addresses</Link>
              </li>
            </ul>
          </div>

          {/* Branch & Contact */}
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "14px", letterSpacing: "0.05em" }}>
              BRANCH LOCATION
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "var(--cnm-text-muted)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <MapPin size={16} color="var(--cnm-orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{BRAND.branch.address}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={16} color="var(--cnm-orange)" />
                <a href={`tel:${BRAND.branch.phone}`} style={{ color: "var(--cnm-text-primary)", fontWeight: 700 }}>
                  {BRAND.branch.phone} (Order Hotline)
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} color="var(--cnm-orange)" />
                <span>Every day: 12:01 PM – 02:00 AM PKT</span>
              </div>
            </div>
          </div>

          {/* Delivery Villages */}
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-orange)", marginBottom: "14px", letterSpacing: "0.05em" }}>
              DELIVERY VILLAGES & AREAS
            </h4>
            <p style={{ fontSize: "12px", color: "var(--cnm-text-muted)", marginBottom: "10px" }}>
              100 PKR Flat Delivery Fee • ~40 mins:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {INITIAL_DELIVERY_AREAS.map((area) => (
                <span
                  key={area}
                  style={{
                    backgroundColor: "var(--cnm-surface-elevated)",
                    border: "1px solid var(--cnm-border)",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 7px",
                    borderRadius: "4px",
                    color: "var(--cnm-text-muted)",
                  }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar with Policy Links (No Staff Links) */}
        <div
          style={{
            borderTop: "1px solid var(--cnm-border)",
            paddingTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12px",
            color: "var(--cnm-text-subtle)",
          }}
        >
          <p>© {new Date().getFullYear()} Cluck N Moo (CNM). All rights reserved. &bull; Cash-on-Delivery Only.</p>

          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/privacy" style={{ transition: "color 0.15s" }}>
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" style={{ transition: "color 0.15s" }}>
              Terms & Cancellation
            </Link>
            <span>•</span>
            <Link href="/contact" style={{ transition: "color 0.15s" }}>
              Contact & Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
