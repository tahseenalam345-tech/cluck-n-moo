"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  ShieldAlertIcon,
  EditIcon,
  CopyIcon,
  CalendarIcon,
  InfoIcon,
} from "./AdminIcons";

interface WeeklyScheduleItem {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface SpecialScheduleItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosedAllDay: boolean;
  openTime: string;
  closeTime: string;
  note: string | null;
  isActive: boolean;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PRESET_EVENTS = [
  "Eid-ul-Fitr Holidays",
  "Eid-ul-Adha Holidays",
  "14 August Independence Day",
  "Ramadan Operating Hours",
  "Emergency Maintenance",
  "Ashura Closure",
  "New Year Eve Special",
];

export function AdminSettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleItem[]>([]);
  const [specialSchedules, setSpecialSchedules] = useState<SpecialScheduleItem[]>([]);

  // Emergency Overrides
  const [overrideStatus, setOverrideStatus] = useState<"AUTO" | "FORCE_OPEN" | "FORCE_CLOSED">("AUTO");
  const [bannerText, setBannerText] = useState<string>("");

  // Live evaluated status
  const [liveStatus, setLiveStatus] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Special Event Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClosedAllDay, setIsClosedAllDay] = useState(false);
  const [eventOpenTime, setEventOpenTime] = useState("12:01");
  const [eventCloseTime, setEventCloseTime] = useState("02:00");
  const [eventNote, setEventNote] = useState("");
  const [eventError, setEventError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch("/api/v1/admin/settings"),
        fetch("/api/v1/store/status"),
      ]);

      const settingsData = await settingsRes.json();
      const statusData = await statusRes.json();

      if (settingsData.success && settingsData.data) {
        setSettings(settingsData.data.settings || {});
        setWeeklySchedules(settingsData.data.schedules || []);
        setSpecialSchedules(settingsData.data.specialSchedules || []);
        setOverrideStatus(settingsData.data.settings?.manual_override_status || "AUTO");
        setBannerText(settingsData.data.settings?.announcement_banner || "");
      }

      if (statusData.success && statusData.data) {
        setLiveStatus(statusData.data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Copy Monday timing to all days
  const handleCopyMondayToAll = () => {
    const monday = weeklySchedules.find((s) => s.dayOfWeek === 1);
    if (!monday) return;

    setWeeklySchedules((prev) =>
      prev.map((s) => ({
        ...s,
        openTime: monday.openTime,
        closeTime: monday.closeTime,
        isClosed: monday.isClosed,
      }))
    );
    showToast("✓ Monday hours copied to all 7 days!");
  };

  // Update single day schedule
  const handleScheduleChange = (dayOfWeek: number, field: keyof WeeklyScheduleItem, val: any) => {
    setWeeklySchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: val } : s))
    );
  };

  // Save Settings & Weekly Schedules
  const handleSaveSettingsAndWeekly = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            manual_override_status: overrideStatus,
            announcement_banner: bannerText.trim(),
          },
          schedules: weeklySchedules,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save settings");
      }

      showToast("✓ Restaurant weekly schedule and override saved!");
      loadData();
    } catch (err: any) {
      alert(err?.message || "Error saving configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Special Event Modal
  const handleOpenAddEvent = () => {
    setEditingEventId(null);
    setEventName("");
    const todayStr = new Date().toISOString().slice(0, 10);
    setStartDate(todayStr);
    setEndDate(todayStr);
    setIsClosedAllDay(false);
    setEventOpenTime("12:01");
    setEventCloseTime("02:00");
    setEventNote("");
    setEventError(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (ev: SpecialScheduleItem) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setStartDate(ev.startDate);
    setEndDate(ev.endDate);
    setIsClosedAllDay(Boolean(ev.isClosedAllDay));
    setEventOpenTime(ev.openTime || "12:01");
    setEventCloseTime(ev.closeTime || "02:00");
    setEventNote(ev.note || "");
    setEventError(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);

    if (!eventName.trim() || !startDate || !endDate) {
      setEventError("Event name, start date, and end date are required.");
      return;
    }

    if (startDate > endDate) {
      setEventError("Start date cannot be after end date.");
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = Boolean(editingEventId);
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialScheduleAction: isEdit ? "update" : "create",
          specialScheduleId: editingEventId || undefined,
          specialScheduleData: {
            name: eventName.trim(),
            startDate,
            endDate,
            isClosedAllDay,
            openTime: eventOpenTime,
            closeTime: eventCloseTime,
            note: eventNote.trim() || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save special schedule");
      }

      showToast(`✓ Special schedule "${eventName}" saved!`);
      setIsEventModalOpen(false);
      loadData();
    } catch (err: any) {
      setEventError(err?.message || "Error saving special schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: SpecialScheduleItem) => {
    if (!window.confirm(`Delete holiday/special schedule "${ev.name}"?`)) return;

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialScheduleAction: "delete",
          specialScheduleId: ev.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("✓ Special schedule deleted.");
        loadData();
      } else {
        alert(data.error?.message || "Failed to delete");
      }
    } catch {
      alert("Network error deleting schedule");
    }
  };

  return (
    <div className="admin-settings-container">
      {/* Toast */}
      {toastMessage && <div className="admin-toast">{toastMessage}</div>}

      {/* Top Header */}
      <div className="admin-section-topbar">
        <div>
          <h1 className="admin-page-title">Operating Hours &amp; Restaurant Status</h1>
          <p className="admin-page-subtitle">
            Manage weekly branch schedule, midnight-crossing hours, holiday overrides (Eid, 14 August), and emergency controls.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={loadData}
            className="admin-btn-secondary"
            title="Refresh status"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettingsAndWeekly}
            disabled={isSaving}
            className="admin-btn-primary"
          >
            <CheckCircle2 size={15} />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {/* Live Store Status Preview Banner */}
      {liveStatus && (
        <div className={`store-live-preview-box ${liveStatus.isOpen ? "is-open" : "is-closed"}`}>
          <div className="preview-indicator">
            <span className="pulse-indicator-dot" />
            <div>
              <div className="preview-headline">
                STORE STATUS RIGHT NOW: <strong>{liveStatus.isOpen ? "OPEN FOR ORDERS" : "CLOSED"}</strong>
              </div>
              <div className="preview-subtext">
                Current Time: <strong>{liveStatus.currentPktTime}</strong> • {liveStatus.scheduleText}
              </div>
            </div>
          </div>

          <div className="preview-override-badge">
            Mode: <strong>{liveStatus.manualOverrideStatus}</strong>
          </div>
        </div>
      )}

      {/* SECTION 1: EMERGENCY OVERRIDE & BANNER */}
      <div className="admin-card">
        <div className="card-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlertIcon size={18} color="#ea580c" />
            <h3 className="card-title">Emergency Master Override</h3>
          </div>
        </div>

        <div className="override-options-grid">
          <label className={`override-pill ${overrideStatus === "AUTO" ? "selected" : ""}`}>
            <input
              type="radio"
              name="override"
              value="AUTO"
              checked={overrideStatus === "AUTO"}
              onChange={() => setOverrideStatus("AUTO")}
            />
            <div className="pill-content">
              <strong>AUTO (Recommended)</strong>
              <span>Follows weekly hours and active special date events automatically.</span>
            </div>
          </label>

          <label className={`override-pill ${overrideStatus === "FORCE_OPEN" ? "selected force-open" : ""}`}>
            <input
              type="radio"
              name="override"
              value="FORCE_OPEN"
              checked={overrideStatus === "FORCE_OPEN"}
              onChange={() => setOverrideStatus("FORCE_OPEN")}
            />
            <div className="pill-content">
              <strong>FORCE OPEN</strong>
              <span>Keeps store open regardless of regular timings or off days.</span>
            </div>
          </label>

          <label className={`override-pill ${overrideStatus === "FORCE_CLOSED" ? "selected force-closed" : ""}`}>
            <input
              type="radio"
              name="override"
              value="FORCE_CLOSED"
              checked={overrideStatus === "FORCE_CLOSED"}
              onChange={() => setOverrideStatus("FORCE_CLOSED")}
            />
            <div className="pill-content">
              <strong>FORCE CLOSED</strong>
              <span>Emergency shutdown. Blocks all customer checkout immediately.</span>
            </div>
          </label>
        </div>

        <div className="form-group" style={{ marginTop: "14px" }}>
          <label className="form-label">Customer Notice / Announcement Banner (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Due to heavy rain, delivery times may be extended by 20 mins."
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* SECTION 2: WEEKLY OPERATING SCHEDULE */}
      <div className="admin-card">
        <div className="card-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} color="#0f172a" />
            <h3 className="card-title">Weekly Schedule (Monday – Sunday)</h3>
          </div>

          <button
            type="button"
            onClick={handleCopyMondayToAll}
            className="btn-helper-action"
            title="Copy Monday's opening and closing hours to all other days"
          >
            <CopyIcon size={13} /> Copy Monday Timing to All Days
          </button>
        </div>

        <div className="weekly-schedule-table-wrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Day of Week</th>
                <th>Status</th>
                <th>Opening Time (PKT)</th>
                <th>Closing Time (PKT)</th>
                <th>Midnight Crossing Notes</th>
              </tr>
            </thead>
            <tbody>
              {weeklySchedules.map((s) => {
                const dayName = DAY_NAMES[s.dayOfWeek] || `Day ${s.dayOfWeek}`;
                const isCrossMidnight = s.closeTime < s.openTime;

                return (
                  <tr key={s.dayOfWeek} className={s.isClosed ? "day-closed" : ""}>
                    <td>
                      <strong className="day-name">{dayName}</strong>
                    </td>
                    <td>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={!s.isClosed}
                          onChange={(e) => handleScheduleChange(s.dayOfWeek, "isClosed", !e.target.checked)}
                        />
                        <span className={`status-pill ${s.isClosed ? "closed" : "open"}`}>
                          {s.isClosed ? "CLOSED (OFF DAY)" : "OPEN"}
                        </span>
                      </label>
                    </td>
                    <td>
                      <input
                        type="time"
                        disabled={s.isClosed}
                        value={s.openTime}
                        onChange={(e) => handleScheduleChange(s.dayOfWeek, "openTime", e.target.value)}
                        className="time-input"
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        disabled={s.isClosed}
                        value={s.closeTime}
                        onChange={(e) => handleScheduleChange(s.dayOfWeek, "closeTime", e.target.value)}
                        className="time-input"
                      />
                    </td>
                    <td>
                      {!s.isClosed && isCrossMidnight && (
                        <span className="midnight-pill">
                          <Sparkles size={11} /> Next Morning (+1 Day)
                        </span>
                      )}
                      {!s.isClosed && !isCrossMidnight && (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Same Day Window</span>
                      )}
                      {s.isClosed && <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: TEMPORARY SPECIAL SCHEDULES & HOLIDAYS */}
      <div className="admin-card">
        <div className="card-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarIcon size={18} color="#ea580c" />
            <h3 className="card-title">Temporary Special Schedules &amp; Holidays</h3>
          </div>

          <button
            type="button"
            onClick={handleOpenAddEvent}
            className="admin-btn-primary"
            style={{ padding: "6px 12px", fontSize: "12.5px" }}
          >
            <Plus size={14} /> Add Holiday / Event
          </button>
        </div>

        <p className="card-desc">
          Special events take priority over the normal weekly schedule for the specified date range. Expired events automatically revert to the regular weekly hours.
        </p>

        <div className="events-grid">
          {specialSchedules.map((ev) => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const isCurrentlyActive = ev.isActive && todayStr >= ev.startDate && todayStr <= ev.endDate;
            const isExpired = todayStr > ev.endDate;

            return (
              <div key={ev.id} className={`special-event-card ${isCurrentlyActive ? "active-now" : isExpired ? "expired" : ""}`}>
                <div className="event-card-header">
                  <div>
                    <h4 className="event-title">{ev.name}</h4>
                    <span className="event-dates">
                      {ev.startDate} to {ev.endDate}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditEvent(ev)}
                      className="btn-icon-sm"
                      title="Edit Event"
                    >
                      <EditIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev)}
                      className="btn-icon-sm del"
                      title="Delete Event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="event-timing-row">
                  {ev.isClosedAllDay ? (
                    <span className="event-pill closed">Closed All Day</span>
                  ) : (
                    <span className="event-pill hours">
                      {ev.openTime} – {ev.closeTime} PKT
                    </span>
                  )}

                  {isCurrentlyActive && (
                    <span className="event-badge live">● In Effect Today</span>
                  )}
                  {isExpired && (
                    <span className="event-badge expired">Expired</span>
                  )}
                </div>

                {ev.note && <p className="event-note">{ev.note}</p>}
              </div>
            );
          })}

          {specialSchedules.length === 0 && (
            <div className="empty-events-box">
              <CalendarIcon size={28} color="#94a3b8" />
              <p>No special holiday or event schedules configured.</p>
            </div>
          )}
        </div>
      </div>

      {/* EVENT ADD / EDIT MODAL */}
      {isEventModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsEventModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingEventId ? `Edit: ${eventName}` : "Add Special Holiday / Event"}
                </h3>
                <span className="modal-subtitle">Configure priority date-range overrides.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="modal-body">
              {eventError && <div className="modal-alert-error">{eventError}</div>}

              {/* Event Name Presets */}
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid-ul-Fitr, 14 August Special, Emergency Closure"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="form-input"
                />

                <div className="presets-row">
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Quick Presets:</span>
                  {PRESET_EVENTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEventName(preset)}
                      className="preset-btn"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Closed All Day Toggle */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isClosedAllDay}
                    onChange={(e) => setIsClosedAllDay(e.target.checked)}
                  />
                  <span><strong>Store is Closed All Day during this event</strong></span>
                </label>
              </div>

              {/* Special Hours (if not closed all day) */}
              {!isClosedAllDay && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Special Opening Time (PKT)</label>
                    <input
                      type="time"
                      value={eventOpenTime}
                      onChange={(e) => setEventOpenTime(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Special Closing Time (PKT)</label>
                    <input
                      type="time"
                      value={eventCloseTime}
                      onChange={(e) => setEventCloseTime(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Optional Note */}
              <div className="form-group">
                <label className="form-label">Customer Notice Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Eid Mubarak! We will reopen on the 3rd day of Eid."
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-submit"
                >
                  {isSaving ? "Saving..." : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-settings-container {
          display: flex;
          flex-direction: column;
          gap: 18px;
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
        }

        .store-live-preview-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid transparent;
        }

        .store-live-preview-box.is-open {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }

        .store-live-preview-box.is-closed {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .preview-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pulse-indicator-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        .preview-headline {
          font-size: 14px;
          font-weight: 700;
        }

        .preview-subtext {
          font-size: 12.5px;
          opacity: 0.9;
          margin-top: 2px;
        }

        .preview-override-badge {
          font-size: 12px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 6px;
          font-weight: 700;
        }

        .admin-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .card-desc {
          font-size: 13px;
          color: #64748b;
          margin: -6px 0 14px;
        }

        .btn-helper-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
        }

        .override-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .override-pill {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          cursor: pointer;
          background: #f8fafc;
          transition: all 0.15s ease;
        }

        .override-pill.selected {
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .override-pill.force-open.selected {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .override-pill.force-closed.selected {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .pill-content strong {
          display: block;
          font-size: 13px;
          color: #0f172a;
        }

        .pill-content span {
          display: block;
          font-size: 11.5px;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.3;
        }

        .weekly-schedule-table-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow-x: auto;
        }

        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .schedule-table th {
          background: #f8fafc;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }

        .schedule-table td {
          padding: 10px 14px;
          font-size: 13px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }

        .schedule-table tr.day-closed td {
          background: #fafafa;
          opacity: 0.7;
        }

        .day-name {
          font-size: 13.5px;
        }

        .toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .status-pill {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
        }

        .status-pill.open {
          background: #ecfdf5;
          color: #059669;
        }

        .status-pill.closed {
          background: #fef2f2;
          color: #dc2626;
        }

        .time-input {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #0f172a;
          background: #ffffff;
        }

        .time-input:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .midnight-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 700;
          color: #7c3aed;
          background: #f5f3ff;
          padding: 3px 7px;
          border-radius: 4px;
          border: 1px solid #ddd6fe;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }

        .special-event-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .special-event-card.active-now {
          border-color: #ea580c;
          background: #fff7ed;
        }

        .special-event-card.expired {
          opacity: 0.6;
          background: #f8fafc;
        }

        .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .event-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .event-dates {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .btn-icon-sm {
          padding: 4px 6px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
        }

        .btn-icon-sm.del:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .event-timing-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-pill {
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .event-pill.closed {
          background: #fee2e2;
          color: #b91c1c;
        }

        .event-pill.hours {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .event-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .event-badge.live {
          background: #ffedd5;
          color: #c2410c;
        }

        .event-badge.expired {
          background: #f1f5f9;
          color: #94a3b8;
        }

        .event-note {
          font-size: 12px;
          color: #475569;
          margin: 0;
          font-style: italic;
        }

        .empty-events-box {
          grid-column: 1 / -1;
          padding: 36px 16px;
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .presets-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .preset-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
        }

        .preset-btn:hover {
          background: #e2e8f0;
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

        .form-input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #334155;
          cursor: pointer;
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
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }

        .btn-submit {
          padding: 8px 18px;
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
