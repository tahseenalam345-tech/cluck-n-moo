import { OrderType, OrderStatus, UserRole } from "../lib/constants";
export type { OrderType, OrderStatus, UserRole };
export type { SignatureSectionConfig, SignatureSectionType } from "../lib/signatureSections";

export interface DeliveryArea {
  id: string;
  name: string;
  slug: string;
  deliveryFeePkr: number;
  estimatedDeliveryMins: number;
  isActive: number;
  displayOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  pricePkr: number;
  isAvailable: number;
  displayOrder: number;
}

export interface ProductModifier {
  id: string;
  groupId: string;
  name: string;
  pricePkr: number;
  isAvailable: number;
}

export interface ProductModifierGroup {
  id: string;
  productId: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  isRequired: number;
  modifiers: ProductModifier[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  cloudinaryPublicId?: string | null;
  imageAltText?: string | null;
  imageStatus?: string | null;
  basePricePkr: number;
  isFeatured: number;
  isAvailable: number;
  displayOrder: number;
  variants: ProductVariant[];
  modifierGroups: ProductModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: number;
  products?: Product[];
}

export interface CartItemModifier {
  id: string;
  name: string;
  pricePkr: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPricePkr: number;
  modifiers: CartItemModifier[];
  quantity: number;
  lineTotalPkr: number;
  specialInstructions?: string;
  customDealId?: string;
}

export interface OrderItemModifierSnapshot {
  id: string;
  modifierId?: string | null;
  modifierNameSnapshot: string;
  priceSnapshotPkr: number;
}

export interface OrderItemSnapshot {
  id: string;
  productId?: string | null;
  productNameSnapshot: string;
  variantNameSnapshot?: string | null;
  unitPriceSnapshotPkr: number;
  quantity: number;
  lineTotalPkr: number;
  modifiers: OrderItemModifierSnapshot[];
  customDealId?: string | null;

  // Convenience aliases
  productName?: string;
  variantName?: string;
  unitPricePkr?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingToken: string;
  userId?: string | null;
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod: "CASH";
  paymentStatus: "PENDING" | "PAID";
  paymentLocation?: "ON_DELIVERY" | "AT_COUNTER" | "ON_TABLE" | null;

  // Snapshots
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot?: string | null;
  deliveryAreaNameSnapshot?: string | null;
  deliveryAddressSnapshot?: string | null;
  deliveryLandmarkSnapshot?: string | null;
  dineInPreferredTime?: string | null;
  specialInstructions?: string | null;

  // Convenience client aliases
  customerName?: string;
  customerPhone?: string;
  deliveryAreaName?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;

  subtotalPkr: number;
  deliveryFeePkr: number;
  discountPkr?: number;
  discountRate?: number;
  discountType?: string | null;
  customDealSubtotalPkr?: number;
  totalPkr: number;

  assignedRiderId?: string | null;
  confirmedByStaffId?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;

  items?: OrderItemSnapshot[];
}

export interface UserSession {
  userId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
}
