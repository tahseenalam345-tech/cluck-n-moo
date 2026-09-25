"use client";

import React from "react";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader />

      <main style={{ flex: 1, padding: "40px 0 60px" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
            POLICY & TRUST
          </span>
          <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "16px" }}>
            Privacy Policy
          </h1>

          <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px", fontSize: "14.5px", lineHeight: 1.6, color: "var(--cnm-text-secondary)" }}>
            <p>
              At <strong>Cluck N Moo (CNM)</strong>, we respect your privacy and are committed to protecting the personal information you share with us when ordering online for delivery, takeaway, or dine-in.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>1. Information We Collect</h3>
            <p>
              When placing an order, we collect essential fulfillment information including your full name, phone number, delivery address, and landmark. This information is strictly used by our staff to confirm your order by telephone and dispatch our riders.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>2. Location Data</h3>
            <p>
              If you choose to use the &quot;Use my current location&quot; feature, your device coordinates are processed locally to help pinpoint your nearby Kharian delivery village. We do not sell or track your GPS coordinates across third-party networks.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>3. Cash-Only Transactions</h3>
            <p>
              Because Cluck N Moo operates on a cash-settlement model (Cash on Delivery / Cash at Counter / Cash on Table), we do not collect, process, or store any credit card, debit card, or banking credentials.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>4. Contact & Inquiries</h3>
            <p>
              For any questions regarding your personal details, contact our Kharian branch directly at <strong>0302-1949067</strong>.
            </p>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
