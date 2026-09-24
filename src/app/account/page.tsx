"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { MapPin, Phone, Clock, ShoppingBag, ArrowRight } from "lucide-react";

export default function AccountPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomerName(localStorage.getItem("cnm_cust_name") || "");
      setCustomerPhone(localStorage.getItem("cnm_cust_phone") || "");
      setCustomerAddress(localStorage.getItem("cnm_cust_address") || "");
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("cnm_cust_name", customerName.trim());
      localStorage.setItem("cnm_cust_phone", customerPhone.trim());
      localStorage.setItem("cnm_cust_address", customerAddress.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader />

      <main style={{ flex: 1, padding: "40px 0 60px" }}>
        <div className="container" style={{ maxWidth: "700px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
            MY ACCOUNT
          </span>
          <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "8px" }}>
            Saved Profile & Addresses
          </h1>
          <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)", marginBottom: "32px" }}>
            Your saved information automatically pre-fills during checkout for faster ordering.
          </p>

          <div className="card" style={{ padding: "28px" }}>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Hamza Tariq"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="e.g. 0302-1234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Default Delivery Street Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. House 14, Street 2, Kharian"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>

              {savedSuccess && (
                <div
                  style={{
                    backgroundColor: "var(--status-ready-bg)",
                    color: "var(--status-ready)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  ✓ Profile preferences saved successfully!
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "10px" }}>
                SAVE PREFERENCES
              </button>
            </form>
          </div>

          {/* Quick Track Order Link */}
          <div
            className="card"
            style={{
              padding: "20px 24px",
              marginTop: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", color: "var(--cnm-text-primary)", marginBottom: "4px" }}>
                Looking for your order?
              </h3>
              <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>
                Track live preparation and delivery status using your tracking number.
              </p>
            </div>
            <Link href="/order/track" className="btn btn-secondary">
              <span>TRACK ORDER</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
