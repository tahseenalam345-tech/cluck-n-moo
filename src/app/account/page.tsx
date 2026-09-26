"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerHeader } from "@/components/CustomerHeader";
import { CustomerFooter } from "@/components/CustomerFooter";
import { createClient } from "@/lib/supabase/client";
import { getLocalOrders } from "@/lib/orderHistory";
import {
  Phone,
  MapPin,
  Clock,
  ShoppingBag,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<{ fullName: string; phone: string | null; email: string | null; role: string } | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Auth Form State
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address Form State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressLine, setNewAddressLine] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [isAddressSaving, setIsAddressSaving] = useState(false);

  // Edit Profile State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Load user session and account data
  const loadAccountData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);

        // Fetch profile and saved addresses
        const profileRes = await fetch("/api/v1/account/profile");
        const profileData = await profileRes.json();
        if (profileData.success && profileData.data) {
          setProfile(profileData.data.profile);
          setAddresses(profileData.data.addresses || []);
          setEditName(profileData.data.profile.fullName || "");
          setEditPhone(profileData.data.profile.phone || "");
        }

        // Fetch customer orders
        const ordersRes = await fetch("/api/v1/account/orders");
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setOrders(ordersData.data || []);
        }

        // Securely claim any local guest orders placed on this device
        const localOrders = getLocalOrders();
        const trackingTokens = localOrders.map((o) => o.trackingToken).filter(Boolean);
        if (trackingTokens.length > 0) {
          await fetch("/api/v1/account/claim-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackingTokens }),
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to load account data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) {
        setAuthError(error.message);
        setIsSubmitting(false);
        return;
      }

      await loadAccountData();
    } catch (err: any) {
      setAuthError(err.message || "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            full_name: authFullName.trim() || "CNM Customer",
            phone: authPhone.trim() || null,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        await loadAccountData();
      } else {
        setAuthSuccess("Account created successfully! Please check your email for a confirmation link.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (err: any) {
      setAuthError(err.message || "Google sign in failed.");
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setAddresses([]);
      setOrders([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/v1/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editName, phone: editPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMessage("Profile updated successfully!");
        setTimeout(() => setProfileMessage(null), 3000);
      }
    } catch {
      setProfileMessage("Failed to update profile.");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine.trim()) return;

    setIsAddressSaving(true);
    try {
      const res = await fetch("/api/v1/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressLine: newAddressLine.trim(),
          landmark: newLandmark.trim() || null,
          isDefault: addresses.length === 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewAddressLine("");
        setNewLandmark("");
        setShowAddressModal(false);
        loadAccountData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/account/addresses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAccountData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerHeader />

      <main className="account-main-wrap" style={{ flex: 1 }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "6px" }}>
            CUSTOMER PORTAL
          </span>
          <h1 className="account-page-title" style={{ color: "var(--cnm-text-primary)", margin: "0 0 6px" }}>
            My Account
          </h1>
          <p className="account-page-desc" style={{ color: "var(--cnm-text-muted)", margin: "0 0 24px" }}>
            Manage your profile, saved delivery addresses, and track active and past orders.
          </p>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <RefreshCw className="spin" size={32} style={{ color: "var(--cnm-orange)" }} />
              <p style={{ marginTop: "12px", color: "var(--cnm-text-muted)" }}>Loading account details...</p>
            </div>
          ) : !user ? (
            /* ----------------- UNAUTHENTICATED: LOGIN / SIGNUP ----------------- */
            <div className="card" style={{ padding: "16px 20px" }}>
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--cnm-border)",
                  marginBottom: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "none",
                    border: "none",
                    borderBottom: authTab === "signin" ? "2px solid var(--cnm-orange)" : "none",
                    color: authTab === "signin" ? "var(--cnm-orange)" : "var(--cnm-text-muted)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "15px",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "none",
                    border: "none",
                    borderBottom: authTab === "signup" ? "2px solid var(--cnm-orange)" : "none",
                    color: authTab === "signup" ? "var(--cnm-orange)" : "var(--cnm-text-muted)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "15px",
                  }}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="alert alert-success" style={{ marginBottom: "20px" }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{authSuccess}</span>
                </div>
              )}

              {authTab === "signin" ? (
                <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="your.email@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      placeholder="••••••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "14px", marginTop: "8px" }}
                  >
                    {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Hamza Tariq"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 0302-1234567"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="your.email@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Create Password</label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "14px", marginTop: "8px" }}
                  >
                    {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                  </button>
                </form>
              )}

              <div style={{ textAlign: "center", margin: "20px 0 16px" }}>
                <span style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>OR</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <span>Continue with Google</span>
              </button>

              <div style={{ marginTop: "24px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>
                  Prefer not to create an account? You can still place orders via{" "}
                  <strong style={{ color: "var(--cnm-orange)" }}>Guest Checkout</strong> at any time.
                </p>
              </div>
            </div>
          ) : (
            /* ----------------- AUTHENTICATED: PROFILE & DASHBOARD ----------------- */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* User Profile Card */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "18px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 130, 67, 0.15)",
                        color: "var(--cnm-orange)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>👤</span>
                    </div>
                    <div>
                      <h2 style={{ fontSize: "18px", color: "var(--cnm-text-primary)", margin: 0, fontWeight: 700 }}>
                        {profile?.fullName || "CNM Customer"}
                      </h2>
                      <p style={{ fontSize: "12.5px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="btn btn-secondary"
                    style={{
                      padding: "7px 12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginLeft: "auto",
                    }}
                  >
                    <ArrowRight size={13} />
                    <span>SIGN OUT</span>
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="account-profile-grid">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {profileMessage && (
                    <div
                      style={{
                        color: "var(--cnm-orange)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {profileMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="btn btn-primary"
                    style={{ alignSelf: "flex-start", padding: "9px 16px", fontSize: "13px" }}
                  >
                    {isProfileSaving ? "SAVING..." : "UPDATE PROFILE"}
                  </button>
                </form>
              </div>

              {/* Saved Delivery Addresses */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "17px", color: "var(--cnm-text-primary)", margin: 0, fontWeight: 700 }}>
                      Saved Delivery Addresses
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                      Pre-fills your delivery address during checkout.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddressModal(!showAddressModal)}
                    className="btn btn-secondary"
                    style={{ padding: "7px 11px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <Plus size={13} />
                    <span>ADD ADDRESS</span>
                  </button>
                </div>

                {showAddressModal && (
                  <form
                    onSubmit={handleAddAddress}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      padding: "14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--cnm-border)",
                      marginBottom: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Street Address / House No.</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. House 42, St 5, Kharian Cantt"
                        value={newAddressLine}
                        onChange={(e) => setNewAddressLine(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Landmark / Area Note (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Near Total Pump / Raza CNG"
                        value={newLandmark}
                        onChange={(e) => setNewLandmark(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
                      <button
                        type="submit"
                        disabled={isAddressSaving}
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontSize: "12px" }}
                      >
                        {isAddressSaving ? "SAVING..." : "SAVE ADDRESS"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="btn btn-secondary"
                        style={{ padding: "8px 14px", fontSize: "12px" }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: 0 }}>
                    You have no saved addresses yet. Click &quot;Add Address&quot; above to save one.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 14px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid var(--cnm-border)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <MapPin size={17} style={{ color: "var(--cnm-orange)", marginTop: "2px", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--cnm-text-primary)", fontSize: "13.5px" }}>
                              {addr.addressLine}
                              {addr.isDefault && (
                                <span className="badge badge-orange" style={{ marginLeft: "8px", fontSize: "10px" }}>
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            {addr.landmark && (
                              <div style={{ fontSize: "12px", color: "var(--cnm-text-muted)", marginTop: "2px" }}>
                                Landmark: {addr.landmark}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cnm-text-muted)",
                            cursor: "pointer",
                            padding: "6px",
                          }}
                          title="Delete address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History (Collapsible compact rows) */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "17px", color: "var(--cnm-text-primary)", margin: 0, fontWeight: 700 }}>
                      Recent Orders
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                      Tap an order row to view items and track delivery.
                    </p>
                  </div>
                  <Link
                    href="/order/track"
                    className="btn btn-secondary"
                    style={{ padding: "6px 11px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <span>TRACK TOKEN</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: 0 }}>
                    No orders found on your account yet. Explore the{" "}
                    <Link href="/" style={{ color: "var(--cnm-orange)" }}>
                      menu
                    </Link>{" "}
                    to place your first order!
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {orders.map((ord) => {
                      const isExpanded = expandedOrderId === ord.id;
                      return (
                        <div
                          key={ord.id}
                          className="account-order-card"
                        >
                          {/* Compact Clickable Row Header */}
                          <div
                            onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                            className="account-order-row-header"
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 700, color: "var(--cnm-text-primary)", fontSize: "13.5px" }}>
                                {ord.orderNumber}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor:
                                    ord.status === "Completed"
                                      ? "var(--status-ready-bg)"
                                      : "rgba(255, 130, 67, 0.15)",
                                  color:
                                    ord.status === "Completed"
                                      ? "var(--status-ready)"
                                      : "var(--cnm-orange)",
                                  fontSize: "10.5px",
                                  padding: "2px 6px",
                                }}
                              >
                                {ord.status}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontWeight: 800, color: "var(--cnm-text-primary)", fontSize: "13.5px" }}>
                                Rs. {ord.totalPkr}
                              </span>
                              <button
                                type="button"
                                className="account-chevron-btn"
                                aria-label={isExpanded ? "Collapse order" : "Expand order"}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Subtitle with date & items count */}
                          <div
                            onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                            style={{
                              padding: "0 12px 10px",
                              fontSize: "12px",
                              color: "var(--cnm-text-muted)",
                              display: "flex",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                          >
                            <span>{new Date(ord.createdAt).toLocaleDateString()} • {ord.orderType}</span>
                            <span>{ord.items?.length || 0} {ord.items?.length === 1 ? "item" : "items"}</span>
                          </div>

                          {/* Collapsible Expanded Details */}
                          {isExpanded && (
                            <div className="account-order-expanded-panel">
                              {/* Items Breakdown */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                                {ord.items?.map((item: any, iIdx: number) => (
                                  <div
                                    key={iIdx}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      fontSize: "12.5px",
                                      padding: "5px 8px",
                                      backgroundColor: "rgba(255,255,255,0.02)",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    <span>
                                      <strong style={{ color: "var(--cnm-orange)" }}>{item.quantity}x</strong>{" "}
                                      {item.productName || item.productNameSnapshot}
                                    </span>
                                    <span style={{ color: "var(--cnm-text-muted)", fontSize: "12px" }}>
                                      Rs. {item.lineTotalPkr || (item.priceSnapshot * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Order Action Bar */}
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <Link
                                  href={`/order/track/${ord.trackingToken || ord.id}?token=${ord.trackingToken}`}
                                  className="btn btn-primary"
                                  style={{ padding: "7px 14px", fontSize: "12px" }}
                                >
                                  TRACK LIVE STATUS
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <CustomerFooter />

      {/* Styled JSX for Mobile-First Account Layout */}
      <style jsx global>{`
        .account-main-wrap {
          padding: 40px 0 60px;
        }

        .account-page-title {
          font-size: 30px;
          font-weight: 800;
        }

        .account-page-desc {
          font-size: 14px;
        }

        .account-profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .account-order-card {
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          transition: border-color 0.15s ease;
        }

        .account-order-card:hover {
          border-color: rgba(249, 115, 22, 0.4);
        }

        .account-order-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          user-select: none;
        }

        .account-chevron-btn {
          background: none;
          border: none;
          color: var(--cnm-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          cursor: pointer;
        }

        .account-order-expanded-panel {
          padding: 10px 12px 12px;
          border-top: 1px dashed var(--cnm-border);
          background-color: rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 640px) {
          .account-main-wrap {
            padding: 16px 0 40px;
          }
          .account-page-title {
            font-size: 22px;
          }
          .account-page-desc {
            font-size: 12.5px;
            margin-bottom: 16px !important;
          }
          .account-profile-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .account-order-row-header {
            padding: 10px 10px 6px;
        }
      `}</style>
    </div>
  );
}
