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
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<{ fullName: string; phone: string | null; email: string | null; role: string } | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");

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

      <main style={{ flex: 1, padding: "40px 0 60px" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <span className="badge badge-orange" style={{ marginBottom: "8px" }}>
            CUSTOMER PORTAL
          </span>
          <h1 style={{ fontSize: "32px", color: "var(--cnm-text-primary)", marginBottom: "8px" }}>
            My Account
          </h1>
          <p style={{ fontSize: "14px", color: "var(--cnm-text-muted)", marginBottom: "32px" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* User Profile Card */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255, 130, 67, 0.15)",
                        color: "var(--cnm-orange)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>👤</span>
                    </div>
                    <div>
                      <h2 style={{ fontSize: "20px", color: "var(--cnm-text-primary)", margin: 0 }}>
                        {profile?.fullName || "CNM Customer"}
                      </h2>
                      <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="btn btn-secondary"
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ArrowRight size={14} />
                    <span>SIGN OUT</span>
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                    style={{ alignSelf: "flex-start", padding: "10px 18px", fontSize: "13px" }}
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
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)", margin: 0 }}>
                      Saved Delivery Addresses
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                      Pre-fills your delivery address during checkout.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddressModal(!showAddressModal)}
                    className="btn btn-secondary"
                    style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={14} />
                    <span>ADD ADDRESS</span>
                  </button>
                </div>

                {showAddressModal && (
                  <form
                    onSubmit={handleAddAddress}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      padding: "16px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--cnm-border)",
                      marginBottom: "20px",
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
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <button
                        type="submit"
                        disabled={isAddressSaving}
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                      >
                        {isAddressSaving ? "SAVING..." : "SAVE ADDRESS"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="btn btn-secondary"
                        style={{ padding: "8px 14px", fontSize: "13px" }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>
                    You have no saved addresses yet. Click "Add Address" above to save one.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid var(--cnm-border)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <MapPin size={18} style={{ color: "var(--cnm-orange)", marginTop: "2px", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--cnm-text-primary)", fontSize: "14px" }}>
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
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "18px", color: "var(--cnm-text-primary)", margin: 0 }}>
                      Order History
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)", margin: "2px 0 0" }}>
                      Orders placed with your account or claimed from this device.
                    </p>
                  </div>
                  <Link
                    href="/order/track"
                    className="btn btn-secondary"
                    style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span>TRACK VIA TOKEN</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--cnm-text-muted)" }}>
                    No orders found on your account yet. Explore the{" "}
                    <Link href="/" style={{ color: "var(--cnm-orange)" }}>
                      menu
                    </Link>{" "}
                    to place your first order!
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {orders.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          padding: "16px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid var(--cnm-border)",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 700, color: "var(--cnm-text-primary)", fontSize: "14px" }}>
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
                                fontSize: "11px",
                              }}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--cnm-text-muted)", marginTop: "4px" }}>
                            {new Date(ord.createdAt).toLocaleDateString()} • {ord.orderType} • {ord.items?.length || 0} items
                          </div>
                          <div style={{ fontWeight: 700, color: "var(--cnm-text-primary)", marginTop: "4px" }}>
                            Total: Rs. {ord.totalPkr}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <Link
                            href={`/order/track/${ord.trackingToken || ord.id}?token=${ord.trackingToken}`}
                            className="btn btn-secondary"
                            style={{ padding: "8px 12px", fontSize: "12px" }}
                          >
                            TRACK ORDER
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
