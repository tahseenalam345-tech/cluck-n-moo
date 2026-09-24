"use client";

import React from "react";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader />

      <main style={{ flex: 1, padding: "40px 0 60px" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
            TERMS OF SERVICE
          </span>
          <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "16px" }}>
            Terms & Cancellation Policy
          </h1>

          <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px", fontSize: "14.5px", lineHeight: 1.6, color: "var(--cnm-text-secondary)" }}>
            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>1. Phone Confirmation Workflow</h3>
            <p>
              To ensure freshness and prevent food waste, all newly placed online orders enter a <strong>New</strong> status until a member of the Cluck N Moo staff calls your phone number to confirm item quantities and delivery location before cooking begins.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>2. Cash Payment Policy</h3>
            <p>
              All orders are payable exclusively in cash (PKR) upon delivery by our restaurant rider, at the branch counter, or at your table for dine-in orders. Customers are requested to have exact change ready where possible.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>3. Order Cancellation & Modification</h3>
            <p>
              Orders may be cancelled or modified without charge during the telephone confirmation call with our staff. Once an order status transitions to <strong>Preparing</strong> in our kitchen, food is actively cooked and cancellations can no longer be accepted.
            </p>

            <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)" }}>4. Delivery Timelines</h3>
            <p>
              Estimated delivery times (~40 minutes) are approximate and may vary depending on kitchen rush, traffic conditions along GT Road, or weather across outer Kharian villages.
            </p>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
