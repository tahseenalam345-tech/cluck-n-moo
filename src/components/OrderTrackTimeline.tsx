"use client";

import React, { useEffect, useRef } from "react";
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
  Clock,
  Sparkles,
} from "lucide-react";

interface OrderTrackTimelineProps {
  order: Order;
}

interface StationDef {
  key: OrderStatus;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  deliveryOnly?: boolean;
}

const STATIONS: StationDef[] = [
  {
    key: ORDER_STATUSES.NEW,
    label: "Placed",
    shortLabel: "Placed",
    icon: ShoppingBag,
  },
  {
    key: ORDER_STATUSES.CONFIRMED,
    label: "Confirmed",
    shortLabel: "Confirmed",
    icon: PhoneCall,
  },
  {
    key: ORDER_STATUSES.PREPARING,
    label: "Cooking",
    shortLabel: "Kitchen",
    icon: Flame,
  },
  {
    key: ORDER_STATUSES.READY,
    label: "Packed",
    shortLabel: "Ready",
    icon: ChefHat,
  },
  {
    key: ORDER_STATUSES.OUT_FOR_DELIVERY,
    label: "On The Way",
    shortLabel: "Rider",
    icon: Bike,
    deliveryOnly: true,
  },
  {
    key: ORDER_STATUSES.COMPLETED,
    label: "Delivered",
    shortLabel: "Done",
    icon: CheckCircle2,
  },
];

export function OrderTrackTimeline({ order }: OrderTrackTimelineProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Filter stations based on order type (e.g. exclude Rider for DINE_IN / TAKEAWAY)
  const isDelivery = order.orderType === "DELIVERY";
  const stations = STATIONS.filter((s) => !s.deliveryOnly || isDelivery);

  // Determine current active station index
  const currentIndex = stations.findIndex((s) => s.key === order.status);
  const activeIndex = currentIndex !== -1 ? currentIndex : 0;

  // Auto-scroll active station into view on mobile
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [order.status]);

  // Helper to extract timestamp for each station
  const getStationTime = (stationKey: string): string => {
    if (stationKey === ORDER_STATUSES.NEW) {
      if (!order.createdAt) return "";
      return new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const transition = (order as any).history?.find((h: any) => h.toStatus === stationKey);
    if (transition?.createdAt) {
      return new Date(transition.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // If order has already passed this stage, fallback to order.updatedAt
    const stationIdx = stations.findIndex((s) => s.key === stationKey);
    if (activeIndex >= stationIdx && (order as any).updatedAt) {
      return new Date((order as any).updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "--:--";
  };

  return (
    <div className="cnm-train-container">
      <style jsx>{`
        .cnm-train-container {
          width: 100%;
          background: var(--cnm-surface);
          border: 1px solid var(--cnm-border);
          border-radius: var(--radius-lg);
          padding: 16px 12px 14px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-sm);
        }

        .cnm-train-track {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
          overflow-x: auto;
          overflow-y: visible;
          padding: 16px 8px 6px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .cnm-train-track::-webkit-scrollbar {
          display: none;
        }

        .cnm-train-station {
          flex: 1;
          min-width: 58px;
          max-width: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          text-align: center;
        }

        /* Connecting rail track between nodes */
        .cnm-train-line {
          position: absolute;
          top: 36px;
          left: 50%;
          width: 100%;
          height: 4px;
          z-index: 1;
          transform: translateY(-50%);
          border-radius: 2px;
        }

        .cnm-train-line.filled {
          background: linear-gradient(90deg, var(--cnm-orange), #ff9f68);
          box-shadow: 0 1px 4px rgba(255, 130, 67, 0.3);
        }

        .cnm-train-line.unfilled {
          background: var(--cnm-border);
          background-image: linear-gradient(to right, var(--cnm-border) 50%, rgba(255, 255, 255, 0) 0%);
          background-position: bottom;
          background-size: 8px 4px;
          background-repeat: repeat-x;
        }

        /* Node Circle Styles */
        .cnm-station-node {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: var(--cnm-surface);
        }

        /* Completed Station: filled with solid check/icon */
        .cnm-station-node.completed {
          background: var(--cnm-orange);
          color: #ffffff;
          border: 2px solid var(--cnm-orange);
          box-shadow: 0 2px 8px rgba(255, 130, 67, 0.3);
        }

        /* Active Station: glowing pulse ring, visually distinct */
        .cnm-station-node.active {
          width: 44px;
          height: 44px;
          margin-top: -4px;
          background: linear-gradient(135deg, #ff8243, #ff5722);
          color: #ffffff;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 4px rgba(255, 130, 67, 0.35), 0 4px 16px rgba(255, 130, 67, 0.5);
          animation: cnmPulseActive 2s infinite ease-in-out;
        }

        /* Unreached Station: unfilled outline */
        .cnm-station-node.unfilled {
          background: var(--cnm-surface-elevated);
          border: 2px dashed var(--cnm-border);
          color: var(--cnm-text-muted);
          opacity: 0.65;
        }

        /* Active stage floating live beacon */
        .cnm-train-beacon {
          position: absolute;
          top: -18px;
          background: var(--cnm-text-primary);
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 3px;
          animation: cnmBounce 1.5s infinite;
        }

        .cnm-beacon-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          box-shadow: 0 0 4px #10b981;
        }

        /* Station Labels & Timestamps */
        .cnm-station-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 8px;
          letter-spacing: 0.02em;
          line-height: 1.1;
          white-space: nowrap;
        }

        .cnm-station-label.completed {
          color: var(--cnm-text-primary);
        }

        .cnm-station-label.active {
          color: var(--cnm-orange);
          font-weight: 900;
          transform: scale(1.05);
        }

        .cnm-station-label.unfilled {
          color: var(--cnm-text-muted);
        }

        .cnm-station-time {
          font-size: 10px;
          color: var(--cnm-text-muted);
          margin-top: 3px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .cnm-station-time.active {
          color: var(--cnm-orange);
          font-weight: 800;
        }

        @keyframes cnmPulseActive {
          0% {
            box-shadow: 0 0 0 3px rgba(255, 130, 67, 0.3), 0 3px 12px rgba(255, 130, 67, 0.4);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(255, 130, 67, 0.15), 0 5px 20px rgba(255, 130, 67, 0.6);
          }
          100% {
            box-shadow: 0 0 0 3px rgba(255, 130, 67, 0.3), 0 3px 12px rgba(255, 130, 67, 0.4);
          }
        }

        @keyframes cnmBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>

      {/* Progress Track */}
      <div className="cnm-train-track">
        {stations.map((st, idx) => {
          const isCompleted = activeIndex > idx;
          const isActive = activeIndex === idx;
          const isUnfilled = activeIndex < idx;
          const isLast = idx === stations.length - 1;
          const nextIsReached = activeIndex > idx;

          const IconComponent = st.icon;
          const time = getStationTime(st.key);

          return (
            <div
              key={st.key}
              ref={isActive ? activeRef : null}
              className="cnm-train-station"
            >
              {/* Connecting Rail Line */}
              {!isLast && (
                <div
                  className={`cnm-train-line ${nextIsReached ? "filled" : "unfilled"}`}
                />
              )}

              {/* Floating Train Beacon on Active Station */}
              {isActive && (
                <div className="cnm-train-beacon">
                  <span className="cnm-beacon-dot" />
                  <span>NOW</span>
                </div>
              )}

              {/* Station Node Icon */}
              <div
                className={`cnm-station-node ${
                  isCompleted ? "completed" : isActive ? "active" : "unfilled"
                }`}
                title={`${st.label} - ${time}`}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3.5} />
                ) : (
                  <IconComponent size={isActive ? 20 : 16} strokeWidth={isActive ? 2.5 : 2} />
                )}
              </div>

              {/* Station Name Label */}
              <span
                className={`cnm-station-label ${
                  isCompleted ? "completed" : isActive ? "active" : "unfilled"
                }`}
              >
                {st.shortLabel}
              </span>

              {/* Timestamp */}
              <span
                className={`cnm-station-time ${isActive ? "active" : ""}`}
              >
                {time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
