"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, Clock } from "lucide-react";
import { AuditLog } from "@/types";

export function AdminAuditSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/audit?limit=50");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith("CREATE")) return { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981" };
    if (action.startsWith("UPDATE")) return { bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" };
    if (action.startsWith("DELETE") || action.startsWith("ARCHIVE"))
      return { bg: "rgba(239, 68, 68, 0.12)", color: "#ef4444" };
    return { bg: "rgba(255, 107, 53, 0.12)", color: "#ff6b35" };
  };

  return (
    <div className="admin-audit-container">
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Administrative Audit Logs</h1>
          <p className="admin-page-subtitle">
            Immutable audit trail of all product modifications, media uploads, and category updates.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={fetchLogs}
            className="admin-btn-secondary"
            title="Refresh audit logs"
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
              <th style={{ width: "160px" }}>Timestamp</th>
              <th>Action</th>
              <th>Admin User</th>
              <th>Entity</th>
              <th>Details Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const badge = getActionBadgeColor(log.action);
              const dateStr = new Date(log.createdAt).toLocaleString("en-PK", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <tr key={log.id}>
                  <td>
                    <span className="log-time">{dateStr}</span>
                  </td>
                  <td>
                    <span
                      className="log-action-badge"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <strong>{log.userEmail || "System Admin"}</strong>
                  </td>
                  <td>
                    <code className="entity-tag">
                      {log.entityType} ({log.entityId || "N/A"})
                    </code>
                  </td>
                  <td>
                    <span className="log-details" title={JSON.stringify(log.details, null, 2)}>
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && !isLoading && (
        <div className="admin-empty-logs">
          <ShieldCheck size={32} color="#10b981" />
          <p>No audit activity recorded yet.</p>
        </div>
      )}

      <style jsx>{`
        .admin-audit-container {
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

        .log-time {
          font-size: 11.5px;
          color: var(--admin-text-muted);
        }

        .log-action-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.03em;
        }

        .entity-tag {
          font-size: 11px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .log-details {
          font-size: 11px;
          color: var(--admin-text-muted);
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 380px;
        }

        .admin-empty-logs {
          background: var(--admin-card-bg);
          border: 1px dashed var(--admin-border);
          border-radius: 10px;
          padding: 36px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}
