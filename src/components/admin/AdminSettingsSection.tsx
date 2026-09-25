"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { ShieldAlertIcon } from "./AdminIcons";

export function AdminSettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [overrideStatus, setOverrideStatus] = useState<string>("AUTO");
  const [bannerText, setBannerText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings");
      const data = await res.json();
      if (data.success && data.data?.settings) {
        setSettings(data.data.settings);
        setOverrideStatus(data.data.settings["manual_override_status"] || "AUTO");
        setBannerText(data.data.settings["announcement_banner"] || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            manual_override_status: overrideStatus,
            announcement_banner: bannerText,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Restaurant configuration saved successfully!");
      } else {
        alert(data.error?.message || "Failed to save settings");
      }
    } catch {
      alert("Network error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "var(--cnm-text-primary)",
            color: "var(--cnm-surface)",
            padding: "10px 18px",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 800,
            zIndex: 9999,
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
            Restaurant Hours & System Overrides
          </h2>
          <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: "2px 0 0 0" }}>
            Control store open/close state overrides, operating schedules, and sitewide announcement banners.
          </p>
        </div>

        <button
          onClick={loadSettings}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "7px 12px" }}
        >
          <RefreshCw size={13} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: "16px" }}>
        {/* Main Controls Card */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              marginBottom: "16px",
              color: "var(--cnm-orange)",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldAlertIcon size={18} />
            <span>Store Status Override</span>
          </h3>

          <form onSubmit={handleSaveSettings}>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 800 }}>
                Operating Mode
              </label>
              <select
                className="form-select"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}
              >
                <option value="AUTO">AUTO — Follow standard operating hours (12:01 PM – 02:00 AM PKT)</option>
                <option value="FORCE_OPEN">FORCE OPEN — Bypass schedule, accept orders immediately</option>
                <option value="FORCE_CLOSED">FORCE CLOSED — Emergency halt all incoming orders</option>
              </select>
              <p style={{ fontSize: "11.5px", color: "var(--cnm-text-muted)", marginTop: "4px" }}>
                {overrideStatus === "AUTO" && "Standard automatic schedule is currently active."}
                {overrideStatus === "FORCE_OPEN" && "⚠️ The store is forced OPEN regardless of current local time."}
                {overrideStatus === "FORCE_CLOSED" && "🛑 Customers cannot place orders right now."}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 800 }}>
                Sitewide Announcement Banner (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Free delivery tonight on orders above 1,500 PKR!"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                style={{ width: "100%" }}
              />
              <p style={{ fontSize: "11.5px", color: "var(--cnm-text-muted)", marginTop: "4px" }}>
                Displayed prominently at the very top of customer storefront. Leave blank to hide.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <CheckCircle2 size={16} />
              <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </form>
        </div>

        {/* Operating Hours Reference Card */}
        <div
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              marginBottom: "16px",
              color: "var(--cnm-text-primary)",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Clock size={18} style={{ color: "var(--cnm-orange)" }} />
            <span>Standard Operating Timings</span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            {[
              { day: "Monday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Tuesday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Wednesday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Thursday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Friday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Saturday", hours: "12:01 PM – 02:00 AM PKT", active: true },
              { day: "Sunday", hours: "12:01 PM – 02:00 AM PKT", active: true },
            ].map((schedule, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--cnm-surface-elevated)",
                  border: "1px solid var(--cnm-border)",
                }}
              >
                <span style={{ fontWeight: 700 }}>{schedule.day}</span>
                <span style={{ color: "var(--cnm-text-muted)" }}>{schedule.hours}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
