"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr || !authData.user) {
        setError(authErr?.message || "Invalid credentials.");
        setIsLoading(false);
        return;
      }

      // Check role via authenticated profile endpoint
      const profileRes = await fetch("/api/v1/account/profile");
      const profileData = await profileRes.json();

      if (!profileData.success || !profileData.data?.profile) {
        setError("Unable to verify staff permissions. Please contact your manager.");
        setIsLoading(false);
        return;
      }

      const role = profileData.data.profile.role;

      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "KITCHEN_STAFF") {
        router.push("/kitchen");
      } else if (role === "RIDER") {
        router.push("/rider");
      } else {
        await supabase.auth.signOut();
        setError("Unauthorized: Customer accounts cannot access staff operations.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cnm-bg)",
        color: "var(--cnm-text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: "420px", width: "100%" }}>
        {/* Centered Brand & Header Lockup */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Logo on top, text underneath */}
          <BrandLogo size="lg" layout="vertical" />

          <h1
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--status-preparing-bg, rgba(234, 88, 12, 0.12))",
              color: "var(--status-preparing-text, #C2410C)",
              border: "1px solid var(--status-preparing-text, rgba(234, 88, 12, 0.3))",
              padding: "5px 14px",
              borderRadius: "100px",
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              margin: "16px 0 0 0",
            }}
          >
            <AlertTriangle size={14} />
            <span>STAFF OPERATIONS PORTAL</span>
          </h1>

          <p
            style={{
              fontSize: "13.5px",
              color: "var(--cnm-text-muted)",
              marginTop: "10px",
              maxWidth: "320px",
              lineHeight: 1.45,
            }}
          >
            Restricted to Cluck N Moo verified staff members only.
          </p>
        </div>

        {/* Login Box */}
        <div
          className="card"
          style={{
            backgroundColor: "var(--cnm-surface)",
            border: "1px solid var(--cnm-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-elevated)",
            padding: "16px 20px",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--status-cancelled)",
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "20px",
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                htmlFor="staff-email"
                style={{
                  color: "var(--cnm-text-secondary)",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                Staff Email Address
              </label>
              <div>
                <input
                  id="staff-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="admin@clucknmoo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: "var(--cnm-surface-elevated)",
                    borderColor: "var(--cnm-border)",
                    color: "var(--cnm-text-primary)",
                    padding: "13px 14px",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                htmlFor="staff-password"
                style={{
                  color: "var(--cnm-text-secondary)",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                Security Password
              </label>
              <div>
                <input
                  id="staff-password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    backgroundColor: "var(--cnm-surface-elevated)",
                    borderColor: "var(--cnm-border)",
                    color: "var(--cnm-text-primary)",
                    padding: "13px 14px",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.02em",
                boxShadow: "var(--shadow-cta)",
              }}
            >
              <span>{isLoading ? "Signing In..." : "Sign In"}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link
            href="/"
            style={{
              fontSize: "13px",
              color: "var(--cnm-text-muted)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
