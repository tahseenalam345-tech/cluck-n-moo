"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { OrderType } from "@/lib/constants";

export interface OrderModeState {
  orderType: OrderType;
  areaId?: string;
  areaName?: string;
  deliveryFeePkr: number;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  dineInArrivalTime?: string;
  dineInPaymentLocation?: "AT_COUNTER" | "ON_TABLE";
  customerPhone?: string;
  isConfigured: boolean;
}

interface OrderModeContextType {
  modeState: OrderModeState;
  isModalOpen: boolean;
  openOrderModeModal: () => void;
  closeOrderModeModal: () => void;
  saveOrderMode: (newState: Partial<OrderModeState>) => void;
  setOrderTypeOnly: (type: OrderType) => void;
}

const DEFAULT_STATE: OrderModeState = {
  orderType: "DELIVERY",
  deliveryFeePkr: 100,
  isConfigured: false,
};

const OrderModeContext = createContext<OrderModeContextType>({
  modeState: DEFAULT_STATE,
  isModalOpen: false,
  openOrderModeModal: () => {},
  closeOrderModeModal: () => {},
  saveOrderMode: () => {},
  setOrderTypeOnly: () => {},
});

export function OrderModeProvider({ children }: { children: React.ReactNode }) {
  const [modeState, setModeState] = useState<OrderModeState>(DEFAULT_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cnm_order_mode");
      if (stored) {
        const parsed = JSON.parse(stored);
        setModeState({ ...parsed, isConfigured: true });
      } else {
        // First visit: automatically open the order mode selector modal
        setIsModalOpen(true);
      }
    } catch {
      setIsModalOpen(true);
    }
    setHasInitialized(true);
  }, []);

  const saveOrderMode = (updates: Partial<OrderModeState>) => {
    setModeState((prev) => {
      const updated: OrderModeState = {
        ...prev,
        ...updates,
        isConfigured: true,
      };
      try {
        localStorage.setItem("cnm_order_mode", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setIsModalOpen(false);
  };

  const setOrderTypeOnly = (type: OrderType) => {
    saveOrderMode({
      orderType: type,
      deliveryFeePkr: type === "DELIVERY" ? (modeState.deliveryFeePkr || 100) : 0,
    });
  };

  return (
    <OrderModeContext.Provider
      value={{
        modeState,
        isModalOpen,
        openOrderModeModal: () => setIsModalOpen(true),
        closeOrderModeModal: () => setIsModalOpen(false),
        saveOrderMode,
        setOrderTypeOnly,
      }}
    >
      {children}
    </OrderModeContext.Provider>
  );
}

export function useOrderMode() {
  return useContext(OrderModeContext);
}
