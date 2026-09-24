"use client";

import React from "react";
import { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import {
  ShoppingBag,
  PhoneCall,
  Flame,
  ChefHat,
  Bike,
  CheckCircle2,
  Check,
} from "lucide-react";

interface OrderTrackTimelineProps {
  order: Order;
}

interface StationDef {
  key: OrderStatus;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  deliveryOnly?: boolean;
}

const STATIONS: StationDef[] = [
  {
    key: ORDER_STATUSES.NEW,
    title: "Order Placed",
    description: "Order received and logged in system.",
    icon: ShoppingBag,
  },
  {
    key: ORDER_STATUSES.CONFIRMED,
    title: "Phone Verified & Confirmed",
    description: "Phone details verified with branch.",
    icon: PhoneCall,
  },
  {
    key: ORDER_STATUSES.PREPARING,
    title: "Sizzling in Kitchen",
    description: "Grill master is preparing fresh patties and chicken.",
    icon: Flame,
  },
  {
    key: ORDER_STATUSES.READY,
    title: "Food Packed & Ready",
    description: "Sealed in thermal packaging.",
    icon: ChefHat,
  },
  {
    key: ORDER_STATUSES.OUT_FOR_DELIVERY,
    title: "Rider on the Road",
    description: "Delivery rider is heading to your address.",
    icon: Bike,
    deliveryOnly: true,
  },
  {
    key: ORDER_STATUSES.COMPLETED,
    title: "Delivered & Completed",
    description: "Order completed. Enjoy your feast!",
    icon: CheckCircle2,
  },
];

export function OrderTrackTimeline({ order }: OrderTrackTimelineProps) {
  const isDelivery = order.orderType === "DELIVERY";
  const stations = STATIONS.filter((s) => !s.deliveryOnly || isDelivery);

  const currentIndex = stations.findIndex((s) => s.key === order.status);
  const activeIndex = currentIndex !== -1 ? currentIndex : 0;

  // Extract timestamp for each station
  const getStationTime = (stationKey: string): string => {
    if (stationKey === ORDER_STATUSES.NEW) {
      if (!order.createdAt) return "";
      return new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const transition = (order as any).history?.find((h: any) => h.toStatus === stationKey);
    if (transition?.createdAt) {
      return new Date(transition.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const stationIdx = stations.findIndex((s) => s.key === stationKey);
    if (activeIndex >= stationIdx && (order as any).updatedAt) {
      return new Date((order as any).updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  };

  return (
    <div className="cnm-vertical-track-card">
      <style jsx>{`
        .cnm-vertical-track-card {
          width: 100%;
          background: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-lg);
          padding: 18px 16px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-sm);
        }

        .cnm-track-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--cnm-border);
        }

        .cnm-track-title {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--cnm-text-primary);
          margin: 0;
        }

        .cnm-live-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          color: var(--status-ready);
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .cnm-live-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--status-ready);
          box-shadow: 0 0 5px var(--status-ready);
        }

        .cnm-vertical-list {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .cnm-vertical-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          padding-bottom: 20px;
        }

        .cnm-vertical-item:last-child {
          padding-bottom: 0;
        }

        /* Left rail container */
        .cnm-rail-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 38px;
          flex-shrink: 0;
        }

        /* Connecting vertical rail line */
        .cnm-rail-line {
          position: absolute;
          top: 36px;
          bottom: -4px;
          width: 3px;
          border-radius: 2px;
          z-index: 1;
        }

        .cnm-rail-line.filled {
          background: var(--cnm-orange);
        }

        .cnm-rail-line.unfilled {
          background: var(--cnm-border);
          background-image: linear-gradient(to bottom, var(--cnm-border) 60%, rgba(255, 255, 255, 0) 0%);
          background-size: 3px 8px;
          background-repeat: repeat-y;
        }

        /* Node Circle */
        .cnm-rail-node {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          transition: all 0.25s ease;
          background: var(--cnm-surface);
        }

        /* Completed Station: Solid filled check */
        .cnm-rail-node.completed {
          background: var(--cnm-orange);
          color: #ffffff;
          border: 2px solid var(--cnm-orange);
          box-shadow: 0 2px 6px rgba(255, 130, 67, 0.25);
        }

        /* Active Station: Enlarged, pulsing glow halo ring */
        .cnm-rail-node.active {
          width: 38px;
          height: 38px;
          margin-top: -2px;
          margin-bottom: -2px;
          background: linear-gradient(135deg, #ff8243, #ff5722);
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 4px rgba(255, 130, 67, 0.3), 0 3px 14px rgba(255, 130, 67, 0.45);
          animation: cnmPulseNode 2s infinite ease-in-out;
        }

        /* Unreached Station: Unfilled dashed outline */
        .cnm-rail-node.unfilled {
          background: var(--cnm-surface-elevated);
          border: 2px dashed var(--cnm-border);
          color: var(--cnm-text-muted);
          opacity: 0.65;
        }

        /* Right content */
        .cnm-rail-info {
          flex: 1;
          padding-top: 5px;
        }

        .cnm-info-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .cnm-node-title {
          font-family: var(--font-display);
          font-size: 13.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin: 0;
          line-height: 1.2;
        }

        .cnm-node-title.completed {
          color: var(--cnm-text-primary);
        }

        .cnm-node-title.active {
          color: var(--cnm-orange);
          font-size: 14.5px;
          font-weight: 900;
        }

        .cnm-node-title.unfilled {
          color: var(--cnm-text-muted);
        }

        .cnm-node-time {
          font-size: 11px;
          font-weight: 700;
          color: var(--cnm-text-muted);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .cnm-node-time.active {
          color: var(--cnm-orange);
          font-weight: 800;
        }

        .cnm-node-desc {
          font-size: 12px;
          color: var(--cnm-text-secondary);
          margin-top: 3px;
          line-height: 1.35;
        }

        .cnm-now-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 900;
          color: #ffffff;
          background: var(--cnm-orange);
          padding: 1px 6px;
          border-radius: 4px;
          margin-left: 6px;
          letter-spacing: 0.04em;
          vertical-align: middle;
        }

        @keyframes cnmPulseNode {
          0% {
            box-shadow: 0 0 0 3px rgba(255, 130, 67, 0.35), 0 3px 10px rgba(255, 130, 67, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(255, 130, 67, 0.15), 0 5px 18px rgba(255, 130, 67, 0.6);
          }
          100% {
            box-shadow: 0 0 0 3px rgba(255, 130, 67, 0.35), 0 3px 10px rgba(255, 130, 67, 0.4);
          }
        }
      `}</style>

      {/* Header */}
      <div className="cnm-track-header">
        <h3 className="cnm-track-title">Order Fulfillment Progress</h3>
        <div className="cnm-live-tag">
          <span className="cnm-live-dot" />
          <span>Live Tracking</span>
        </div>
      </div>

      {/* Vertical Rail Stepper */}
      <div className="cnm-vertical-list">
        {stations.map((st, idx) => {
          const isCompleted = activeIndex > idx;
          const isActive = activeIndex === idx;
          const isUnfilled = activeIndex < idx;
          const isLast = idx === stations.length - 1;
          const nextIsReached = activeIndex > idx;

          const IconComponent = st.icon;
          const time = getStationTime(st.key);

          return (
            <div key={st.key} className="cnm-vertical-item">
              {/* Rail Column: Node Circle + Connecting Line */}
              <div className="cnm-rail-col">
                <div
                  className={`cnm-rail-node ${
                    isCompleted ? "completed" : isActive ? "active" : "unfilled"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3.5} />
                  ) : (
                    <IconComponent size={isActive ? 18 : 15} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </div>

                {!isLast && (
                  <div
                    className={`cnm-rail-line ${nextIsReached ? "filled" : "unfilled"}`}
                  />
                )}
              </div>

              {/* Station Info: Title, Time, Description */}
              <div className="cnm-rail-info">
                <div className="cnm-info-header">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <h4
                      className={`cnm-node-title ${
                        isCompleted ? "completed" : isActive ? "active" : "unfilled"
                      }`}
                    >
                      {st.title}
                    </h4>
                    {isActive && <span className="cnm-now-pill">NOW</span>}
                  </div>

                  {time && (
                    <span className={`cnm-node-time ${isActive ? "active" : ""}`}>
                      {time}
                    </span>
                  )}
                </div>

                <div className="cnm-node-desc">
                  {st.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
