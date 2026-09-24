"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";

export function NotificationOptInPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const dismissed = localStorage.getItem("cnm_notification_prompt_dismissed");
    if (Notification.permission === "default" && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setStatusMessage("Order notifications enabled! You will receive live status updates.");
        setTimeout(() => setShowPrompt(false), 3000);
      } else {
        setStatusMessage("Notifications disabled. You can still track your order live on this page.");
        setTimeout(() => setShowPrompt(false), 3000);
      }
    } catch {
      setShowPrompt(false);
    }
    localStorage.setItem("cnm_notification_prompt_dismissed", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("cnm_notification_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div
      className="card"
      style={{
        backgroundColor: "var(--cnm-surface-elevated)",
        border: "1px solid var(--cnm-orange)",
        borderRadius: "var(--radius-md)",
        padding: "16px 18px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "var(--cnm-orange-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Bell size={18} color="var(--cnm-orange)" />
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--cnm-text-primary)", marginBottom: "4px" }}>
          Enable Live Order Notifications?
        </h4>
        <p style={{ fontSize: "12px", color: "var(--cnm-text-muted)", lineHeight: 1.4, marginBottom: "12px" }}>
          Get immediate alerts on your device when the kitchen starts preparing your food and when your rider is nearby.
        </p>

        {statusMessage ? (
          <div style={{ fontSize: "12px", color: "var(--cnm-orange)", fontWeight: 700 }}>
            {statusMessage}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleRequestPermission}
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              ENABLE ALERTS
            </button>
            <button
              onClick={handleDismiss}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--cnm-text-muted)",
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification prompt"
        style={{ color: "var(--cnm-text-subtle)", padding: "4px", cursor: "pointer" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
