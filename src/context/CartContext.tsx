"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { CartItem } from "@/types";
import { calculateCartWithCustomDeals } from "@/lib/customDeal";

const CART_STORAGE_KEY = "cnm_cart_v1";

export interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  customDealDiscountPkr: number;
  customDealDiscountRate: number;
  isCartOpen: boolean;
  isHydrated: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  addItems: (items: CartItem[]) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // 1. Hydrate once safely on client startup without overwriting
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Sanitize and validate items
            const validItems: CartItem[] = parsed.filter(
              (item: any) =>
                item &&
                typeof item === "object" &&
                typeof item.productName === "string" &&
                typeof item.unitPricePkr === "number" &&
                typeof item.quantity === "number" &&
                item.quantity > 0
            );
            if (validItems.length > 0) {
              setCartItems(validItems);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to hydrate CNM cart from storage:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Persist to localStorage only AFTER hydration has occurred
  useEffect(() => {
    if (!isHydrated) return; // Prevent overwriting with initial empty array

    try {
      if (typeof window !== "undefined") {
        if (cartItems.length === 0) {
          localStorage.removeItem(CART_STORAGE_KEY);
        } else {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        }
      }
    } catch (err) {
      console.warn("Failed to persist CNM cart to storage:", err);
    }
  }, [cartItems, isHydrated]);

  // 3. Multi-tab synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) {
        if (!e.newValue) {
          setCartItems([]);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setCartItems(parsed);
            }
          } catch {}
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 4. Calculations
  const cartCalc = useMemo(() => {
    return calculateCartWithCustomDeals(cartItems);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  const cartSubtotal = cartCalc.foodSubtotalPkr;
  const customDealDiscountPkr = cartCalc.customDealDiscountPkr;
  const customDealDiscountRate = cartCalc.customDealDiscountRate;

  // 5. Cart Actions
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addItem = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      // Check if identical item already exists (same product, same variant, same modifiers, same deal/promo, same instructions)
      const existingIndex = prev.findIndex((i) => {
        if (i.cartItemId === item.cartItemId) return true;
        if (item.customDealId || i.customDealId) return false; // Custom deal items preserve distinct deal group identity
        if (item.promotionId || i.promotionId) return false;
        if ((item.specialInstructions || "") !== (i.specialInstructions || "")) return false;

        const sameProduct = i.productId === item.productId;
        const sameVariant = (i.variantId || "") === (item.variantId || "");
        const iMods = (i.modifiers || [])
          .map((m) => m.id)
          .sort()
          .join(",");
        const itemMods = (item.modifiers || [])
          .map((m) => m.id)
          .sort()
          .join(",");

        return sameProduct && sameVariant && iMods === itemMods;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + item.quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          lineTotalPkr: Math.round(existing.unitPricePkr * newQty),
        };
        return updated;
      }

      // Generate stable unique cartItemId if not already present
      const cartItemId =
        item.cartItemId ||
        `item_${item.productId}_${item.variantId || "base"}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      return [...prev, { ...item, cartItemId }];
    });
  }, []);

  const addItems = useCallback((items: CartItem[]) => {
    setCartItems((prev) => {
      const sanitized = items.map((item, idx) => ({
        ...item,
        cartItemId:
          item.cartItemId ||
          `item_${item.productId}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      }));
      return [...prev, ...sanitized];
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    setCartItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter((i) => i.cartItemId !== cartItemId);
      }
      return prev.map((i) => {
        if (i.cartItemId === cartItemId) {
          return {
            ...i,
            quantity: newQuantity,
            lineTotalPkr: Math.round(i.unitPricePkr * newQuantity),
          };
        }
        return i;
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      cartSubtotal,
      customDealDiscountPkr,
      customDealDiscountRate,
      isCartOpen,
      isHydrated,
      setIsCartOpen,
      openCart,
      closeCart,
      addItem,
      addItems,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [
      cartItems,
      cartCount,
      cartSubtotal,
      customDealDiscountPkr,
      customDealDiscountRate,
      isCartOpen,
      isHydrated,
      openCart,
      closeCart,
      addItem,
      addItems,
      removeItem,
      updateQuantity,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
