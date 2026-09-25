import { z } from "zod";
import { ORDER_TYPES, ORDER_STATUSES, OrderStatus, OrderType } from "./constants";

export const orderItemInputSchema = z.object({
  productId: z.string().optional().default(""),
  variantId: z.string().optional(),
  modifierIds: z.array(z.string()).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50"),
  specialInstructions: z.string().max(250).optional(),
  customDealId: z.string().max(100).optional(),
  promotionId: z.string().max(100).optional(),
  promotionSelectedOptionIds: z.array(z.string()).optional(),
  unitPricePkr: z.number().int().optional(),
});

export const createOrderInputSchema = z
  .object({
    orderType: z.enum([ORDER_TYPES.DELIVERY, ORDER_TYPES.PICKUP, ORDER_TYPES.DINE_IN] as [
      OrderType,
      ...OrderType[]
    ]),
    customerName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    customerPhone: z
      .string()
      .trim()
      .min(10, "Please provide a valid Pakistani phone number (e.g. 0302-1949067)")
      .max(20),
    customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    deliveryAreaId: z.string().optional(),
    deliveryAddress: z.string().trim().max(300).optional(),
    deliveryLandmark: z.string().trim().max(150).optional(),
    dineInPreferredTime: z.string().trim().max(100).optional(),
    paymentLocation: z.enum(["ON_DELIVERY", "AT_COUNTER", "ON_TABLE"]).optional(),
    specialInstructions: z.string().trim().max(500).optional(),
    items: z.array(orderItemInputSchema).min(1, "Cart cannot be empty"),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === ORDER_TYPES.DELIVERY) {
      if (!data.deliveryAreaId || data.deliveryAreaId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a delivery area.",
          path: ["deliveryAreaId"],
        });
      }
      if (!data.deliveryAddress || data.deliveryAddress.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide a complete street/house delivery address.",
          path: ["deliveryAddress"],
        });
      }
    }

    if (data.orderType === ORDER_TYPES.DINE_IN) {
      if (!data.dineInPreferredTime || data.dineInPreferredTime.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select your preferred arrival time for dine-in.",
          path: ["dineInPreferredTime"],
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  targetStatus: z.enum([
    ORDER_STATUSES.NEW,
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.PREPARING,
    ORDER_STATUSES.READY,
    ORDER_STATUSES.OUT_FOR_DELIVERY,
    ORDER_STATUSES.COMPLETED,
    ORDER_STATUSES.CANCELLED,
  ] as [OrderStatus, ...OrderStatus[]]),
  assignedRiderId: z.string().optional(),
  cancellationReason: z.string().max(300).optional(),
  note: z.string().max(300).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

export const deliveryAreaInputSchema = z.object({
  name: z.string().min(2).max(100),
  deliveryFeePkr: z.number().int().min(0),
  estimatedDeliveryMins: z.number().int().min(5).max(180),
  isActive: z.boolean(),
  displayOrder: z.number().int().default(0),
});

export const restaurantSettingsInputSchema = z.object({
  phone: z.string().min(10).max(25),
  address: z.string().min(5).max(250),
  defaultDeliveryFee: z.number().int().min(0),
  manualOverrideStatus: z.enum(["AUTO", "FORCE_OPEN", "FORCE_CLOSED"]),
  announcementBanner: z.string().max(250).optional(),
});
