"use client";

import React, { useState, useEffect } from "react";
import { User, Bike, ChefHat, ShieldCheck, RefreshCw } from "lucide-react";

export function AdminStaffSection() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/staff");
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <ShieldCheck size={16} color="#ff6b35" />;
      case "KITCHEN_STAFF":
        return <ChefHat size={16} color="#10b981" />;
      case "RIDER":
        return <Bike size={16} color="#3b82f6" />;
      default:
        return <User size={16} color="#8b5cf6" />;
    }
  };

  return (
    <div className="admin-staff-container">
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Staff &amp; Delivery Riders</h1>
          <p className="admin-page-subtitle">
            Overview of branch administrative users, kitchen crew, and active delivery riders.
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
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-full-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Active Orders Handled</th>
              <th>Account Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="role-pill">
                    {getRoleIcon(s.role)}
                    <span>{s.role}</span>
                  </div>
                </td>
                <td>
                  <strong>{s.fullName || "CNM Member"}</strong>
                </td>
                <td>
                  <code>{s.email || "No email"}</code>
                </td>
                <td>{s.phone || "—"}</td>
                <td>
                  <span className="order-badge">
                    {s.activeOrdersAssigned || 0} In Progress
                  </span>
                </td>
                <td>
                  <span className={s.isActive ? "badge-active" : "badge-inactive"}>
                    {s.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          font-family: var(--font-display, inherit);
          font-size: 22px;
          font-weight: 800;
          color: var(--admin-text-main);
          margin: 0 0 4px;
        }

        .admin-page-subtitle {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0;
        }

        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--admin-card-bg);
          color: var(--admin-text-main);
          border: 1px solid var(--admin-border);
          padding: 8px 12px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 650;
          cursor: pointer;
        }

        .admin-table-container {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          overflow-x: auto;
        }

        .admin-full-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .admin-full-table th {
          background: var(--admin-bg);
          padding: 10px 14px;
          font-weight: 750;
          color: var(--admin-text-muted);
          border-bottom: 1px solid var(--admin-border);
          text-align: left;
        }
        .admin-full-table td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--admin-border);
        }

        .role-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 750;
          font-size: 11.5px;
          color: var(--admin-text-main);
        }

        .order-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          font-size: 11px;
          font-weight: 750;
          padding: 3px 8px;
          border-radius: 10px;
        }

        .badge-active {
          color: #10b981;
          font-weight: 750;
        }
        .badge-inactive {
          color: #ef4444;
          font-weight: 750;
        }
      `}</style>
    </div>
  );
}
