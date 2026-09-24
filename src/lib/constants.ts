export const BRAND = {
  name: "Cluck N Moo",
  shortName: "CNM",
  tagline: "juiciest in town",
  colors: {
    black: "#0C0C0C",
    orange: "#FF8243",
    white: "#FFFFFF",
    cream: "#FFF5EE",
  },
  branch: {
    name: "Kharian Branch",
    address: "Main GT Road, near Total Petrol Station / Raza CNG, Kharian, Pakistan",
    phone: "0302-1949067",
    coordinates: {
      lat: 32.8049229,
      lng: 73.870393,
    },
    timezone: "Asia/Karachi",
  },
  schedule: {
    // 12:01 PM to 02:00 AM every day (crosses midnight)
    openMinutes: 12 * 60 + 1, // 721 (12:01 PM)
    closeMinutes: 2 * 60,     // 120 (02:00 AM next day)
    openDisplay: "12:01 PM",
    closeDisplay: "02:00 AM",
  },
  defaults: {
    deliveryFeePkr: 100,
    currency: "PKR",
    estimatedDeliveryMins: 40,
  },
} as const;

export const INITIAL_DELIVERY_AREAS = [
  "Bidermarjan",
  "Damian",
  "Dillo Village",
  "GT Road Kharian",
  "Guliana",
  "Jadanwala",
  "Jinnah Mart HS Block Kharian Cantt",
  "Kharian Cantt",
  "Lalamusa",
  "Malikpur",
  "Marala",
] as const;

export const ORDER_TYPES = {
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
  DINE_IN: "DINE_IN",
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export const ORDER_STATUSES = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const USER_ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
  KITCHEN: "KITCHEN_STAFF",
  RIDER: "RIDER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
