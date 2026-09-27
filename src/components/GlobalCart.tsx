"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/context/CartContext";

export function GlobalCart() {
  const pathname = usePathname();
  const { isCartOpen, closeCart, cartItems, removeItem, updateQuantity, clearCart } = useCart();

  // Do not render cart on staff/admin/rider/kitchen portals
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/rider") ||
    pathname?.startsWith("/staff")
  ) {
    return null;
  }

  return (
    <CartDrawer
      isOpen={isCartOpen}
      onClose={closeCart}
      cartItems={cartItems}
      onRemoveItem={removeItem}
      onUpdateQuantity={updateQuantity}
      onClearCart={clearCart}
    />
  );
}
