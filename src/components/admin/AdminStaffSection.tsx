"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Bike,
  ChefHat,
  ShieldCheck,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Phone,
  Clock,
} from "lucide-react";
import { EditIcon } from "./AdminIcons";

interface StaffProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "KITCHEN_STAFF" | "RIDER" | "CUSTOMER";
  isActive: boolean;
  createdAt: string;
  inviteStatus?: "Active" | "Invite Pending" | "Disabled" | string;
  activeOrdersAssigned: number;
}

export function AdminStaffSection() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "KITCHEN_STAFF" | "RIDER">("KITCHEN_STAFF");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "KITCHEN_STAFF" | "RIDER">("KITCHEN_STAFF");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/staff", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStaff(data.data);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (statusFilter === "active" && (!s.isActive || s.inviteStatus === "Invite Pending")) return false;
      if (statusFilter === "disabled" && s.isActive) return false;
      if (statusFilter === "pending" && s.inviteStatus !== "Invite Pending") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.fullName || "").toLowerCase().includes(q);
        const matchesEmail = (s.email || "").toLowerCase().includes(q);
        const matchesPhone = (s.phone || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [staff, roleFilter, statusFilter, searchQuery]);

  const handleOpenEdit = (s: StaffProfile) => {
    setEditingStaff(s);
    setEditFullName(s.fullName || "");
    setEditPhone(s.phone || "");
    setEditRole(s.role as any);
    setEditIsActive(Boolean(s.isActive));
    setEditError(null);
  };

  // Submit new staff creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setCreateError("Full name, email, and password are required.");
      return;
    }

    if (newPassword.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch("/api/v1/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          phone: newPhone.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create staff member.");
      }

      if (data.data) {
        const newMember: StaffProfile = {
          ...data.data,
          activeOrdersAssigned: 0,
          createdAt: new Date().toISOString(),
          inviteStatus: data.data.inviteStatus || "Active",
        };
        setStaff((prev) => [newMember, ...prev.filter((p) => p.id !== newMember.id)]);
      }

      showToast(`✓ Staff member "${newFullName}" added successfully!`);
      setIsAddModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewPhone("");
      setNewRole("KITCHEN_STAFF");
      await fetchStaff();
    } catch (err: any) {
      setCreateError(err?.message || "Error creating staff user.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit edit
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    setIsSubmittingEdit(true);
    try {
      const res = await fetch("/api/v1/admin/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStaff.id,
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          role: editRole,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update staff member.");
      }

      showToast(`✓ Staff profile updated successfully!`);
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      setEditError(err?.message || "Error updating staff member.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Quick toggle active state with Optimistic UI & Rollback
  const handleToggleActiveQuick = async (s: StaffProfile) => {
    const nextState = !s.isActive;
    const confirmMsg = nextState
      ? `Activate staff account for ${s.fullName || s.email}?`
      : `Disable login and system access for ${s.fullName || s.email}?`;

    if (!window.confirm(confirmMsg)) return;

    // 1. Optimistic Update (Immediate UI response <10ms)
    const prevStaff = [...staff];
    setStaff((prev) =>
      prev.map((item) => (item.id === s.id ? { ...item, isActive: nextState } : item))
    );
    showToast(`✓ Account ${nextState ? "activated" : "disabled"}`);

    // 2. Background server persistence
    try {
      const res = await fetch("/api/v1/admin/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          isActive: nextState,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to toggle status.");
      }
    } catch (err: any) {
      console.error("Staff toggle error:", err);
      // Rollback to previous state on failure
      setStaff(prevStaff);
      showToast("Could not update staff status. Please try again.");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="staff-role-badge role-admin">
            <ShieldCheck size={13} /> ADMIN
          </span>
        );
      case "KITCHEN_STAFF":
        return (
          <span className="staff-role-badge role-kitchen">
            <ChefHat size={13} /> KITCHEN
          </span>
        );
      case "RIDER":
        return (
          <span className="staff-role-badge role-rider">
            <Bike size={13} /> RIDER
          </span>
        );
      default:
        return (
          <span className="staff-role-badge role-user">
            <User size={13} /> {role}
          </span>
        );
    }
  };

  return (
    <div className="admin-staff-container">
      {/* Toast */}
      {toastMessage && <div className="admin-toast">{toastMessage}</div>}

      {/* Top Header */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Staff &amp; Delivery Crew</h1>
          <p className="admin-page-subtitle">
            Manage operational team access, kitchen workstations, and delivery riders.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchStaff}
            className="admin-btn-secondary"
            title="Refresh staff"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="admin-btn-primary"
          >
            <Plus size={15} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrapper">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <div className="admin-filter-pills">
          <span className="filter-label">Role:</span>
          {["all", "ADMIN", "KITCHEN_STAFF", "RIDER"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`pill-btn ${roleFilter === r ? "active" : ""}`}
            >
              {r === "all" ? "All Roles" : r === "KITCHEN_STAFF" ? "Kitchen" : r}
            </button>
          ))}

          <span className="filter-label" style={{ marginLeft: "8px" }}>
            Status:
          </span>
          {[
            { id: "all", label: "ALL" },
            { id: "active", label: "ACTIVE" },
            { id: "pending", label: "PENDING" },
            { id: "disabled", label: "DISABLED" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`pill-btn ${statusFilter === s.id ? "active" : ""}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table / Cards */}
      <div className="admin-table-container">
        <table className="admin-full-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Member Name</th>
              <th>Login Email</th>
              <th>Phone</th>
              <th>Active Workload</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((s) => (
              <tr key={s.id}>
                <td>{getRoleBadge(s.role)}</td>
                <td>
                  <strong>{s.fullName || "CNM Member"}</strong>
                </td>
                <td>
                  <code style={{ fontSize: "12px", color: "#334155" }}>{s.email || "—"}</code>
                </td>
                <td>
                  <span style={{ fontSize: "12.5px", color: "#475569" }}>{s.phone || "—"}</span>
                </td>
                <td>
                  {s.role === "RIDER" ? (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: s.activeOrdersAssigned > 0 ? "#eff6ff" : "#f1f5f9",
                        color: s.activeOrdersAssigned > 0 ? "#1d4ed8" : "#64748b",
                        border: s.activeOrdersAssigned > 0 ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Bike size={13} /> {s.activeOrdersAssigned} Deliveries In-Flight
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td>
                  {s.inviteStatus === "Invite Pending" ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        backgroundColor: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                      }}
                      title="Pending confirmation"
                    >
                      <Clock size={12} />
                      INVITE PENDING
                    </span>
                  ) : (
                    <span
                      className={s.isActive ? "badge-active" : "badge-inactive"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        backgroundColor: s.isActive ? "#ecfdf5" : "#fef2f2",
                        color: s.isActive ? "#047857" : "#b91c1c",
                        border: s.isActive ? "1px solid #a7f3d0" : "1px solid #fecaca",
                      }}
                    >
                      {s.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {s.isActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="btn-edit-staff"
                      title="Edit Profile & Permissions"
                    >
                      <EditIcon size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActiveQuick(s)}
                      className={`btn-toggle-staff ${s.isActive ? "deactivate" : "activate"}`}
                      title={s.isActive ? "Disable Account" : "Enable Account"}
                    >
                      {s.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredStaff.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                  No staff members match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add New Staff Member</h3>
                <span className="modal-subtitle">
                  Creates an authorized user in Supabase Authentication and branch profile.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="modal-body">
              {createError && <div className="modal-alert-error">{createError}</div>}

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. tariq.cnm@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Temporary Password * (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300-1234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="KITCHEN_STAFF">Kitchen Crew (Kitchen KDS Display)</option>
                    <option value="RIDER">Delivery Rider (Rider Mobile App)</option>
                    <option value="ADMIN">Full Branch Administrator</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="btn-submit"
                >
                  {isSubmittingCreate ? "Creating..." : "Create Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="admin-modal-backdrop" onClick={() => setEditingStaff(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Edit Staff Profile</h3>
                <span className="modal-subtitle">User ID: {editingStaff.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="modal-body">
              {editError && <div className="modal-alert-error">{editError}</div>}

              <div className="form-group">
                <label className="form-label">Email (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={editingStaff.email || "No email"}
                  className="form-input disabled"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="KITCHEN_STAFF">Kitchen Crew</option>
                    <option value="RIDER">Delivery Rider</option>
                    <option value="ADMIN">Full Administrator</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "6px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                  <span>Account is Active and authorized to log in</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="btn-submit"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-staff-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-section-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .admin-page-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .admin-page-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .admin-topbar-actions {
          display: flex;
          gap: 8px;
        }

        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: #ea580c;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(234, 88, 12, 0.2);
        }

        .admin-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .admin-search-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 240px;
          padding: 6px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .admin-search-input {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
          outline: none;
        }

        .admin-filter-pills {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        .pill-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pill-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .admin-table-container {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow-x: auto;
        }

        .admin-full-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-full-table th {
          background: #f8fafc;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .admin-full-table td {
          padding: 12px 16px;
          font-size: 13px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }

        .staff-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .role-admin {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #ffedd5;
        }

        .role-kitchen {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .role-rider {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .role-user {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-edit-staff {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          cursor: pointer;
        }

        .btn-edit-staff:hover {
          background: #e2e8f0;
        }

        .btn-toggle-staff {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .btn-toggle-staff.deactivate {
          background: #fff1f2;
          color: #e11d48;
          border-color: #fecdd3;
        }

        .btn-toggle-staff.activate {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }

        /* MODAL */
        .admin-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .admin-modal-card {
          background: #ffffff;
          border-radius: 14px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .modal-subtitle {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
          display: block;
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-alert-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .form-input,
        .form-select {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #ea580c;
          box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.1);
        }

        .form-input.disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }

        .btn-submit {
          padding: 9px 18px;
          border-radius: 8px;
          border: none;
          background: #ea580c;
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          cursor: pointer;
        }

        .admin-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          z-index: 99999;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
