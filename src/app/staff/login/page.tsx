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
        backgroundColor: "#080808",
        color: "var(--cnm-white)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "420px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <BrandLogo size="lg" />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(255, 130, 67, 0.15)",
              color: "var(--cnm-orange)",
              padding: "4px 12px",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginTop: "16px",
            }}
          >
            <AlertTriangle size={14} />
            <span>STAFF OPERATIONS PORTAL</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginTop: "12px" }}>
            Sign In to Terminal
          </h1>
          <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)", marginTop: "4px" }}>
            Restricted to Cluck N Moo verified staff members only.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#111111",
            border: "1px solid #242424",
            borderRadius: "var(--radius-md)",
            padding: "28px",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: "#aaa" }}>
                Staff Email Address
              </label>
              <div>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="admin@clucknmoo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "#333",
                    color: "#fff",
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: "#aaa" }}>
                Security Password
              </label>
              <div>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "#333",
                    color: "#fff",
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
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 700,
              }}
            >
              <span>{isLoading ? "AUTHENTICATING..." : "SIGN IN TO STATION"}</span>
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
            }}
          >
            ← Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
