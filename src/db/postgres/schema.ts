import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * PostgreSQL Enums matching Cluck N Moo business logic
 */
export const userRoleEnum = pgEnum("user_role_enum", [
  "CUSTOMER",
  "KITCHEN_STAFF",
  "RIDER",
  "ADMIN",
]);

export const orderTypeEnum = pgEnum("order_type_enum", [
  "DELIVERY",
  "PICKUP",
  "DINE_IN",
]);

export const orderStatusEnum = pgEnum("order_status_enum", [
  "New",
  "Confirmed",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Completed",
  "Cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method_enum", ["CASH"]);

export const paymentStatusEnum = pgEnum("payment_status_enum", [
  "PENDING",
  "PAID",
  "REFUNDED",
]);

export const imageStatusEnum = pgEnum("image_status_enum", [
  "PENDING",
  "SYNCED",
  "FAILED",
]);

/**
 * 1. Delivery Areas
 */
export const deliveryAreas = pgTable(
  "delivery_areas",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    deliveryFeePkr: integer("delivery_fee_pkr").notNull().default(100),
    estimatedDeliveryMins: integer("estimated_delivery_mins").notNull().default(40),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_delivery_areas_active").on(table.isActive),
    index("idx_delivery_areas_display").on(table.displayOrder),
  ]
);

/**
 * 2. Menu Categories
 */
export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_categories_display").on(table.displayOrder),
    index("idx_categories_active").on(table.isActive),
  ]
);

/**
 * 3. Products
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    cloudinaryPublicId: text("cloudinary_public_id"),
    imageAltText: text("image_alt_text"),
    imageStatus: imageStatusEnum("image_status").notNull().default("PENDING"),
    basePricePkr: integer("base_price_pkr").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_category_display").on(table.categoryId, table.displayOrder),
    index("idx_products_available").on(table.isAvailable),
    uniqueIndex("idx_products_slug").on(table.slug),
  ]
);

/**
 * 4. Product Variants
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pricePkr: integer("price_pkr").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    index("idx_variants_product").on(table.productId, table.displayOrder),
  ]
);

/**
 * 5. Product Modifier Groups
 */
export const productModifierGroups = pgTable(
  "product_modifier_groups",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minSelection: integer("min_selection").notNull().default(0),
    maxSelection: integer("max_selection").notNull().default(1),
    isRequired: boolean("is_required").notNull().default(false),
  },
  (table) => [
    index("idx_modifier_groups_product").on(table.productId),
  ]
);

/**
 * 6. Product Modifiers
 */
export const productModifiers = pgTable(
  "product_modifiers",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => productModifierGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pricePkr: integer("price_pkr").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (table) => [
    index("idx_modifiers_group").on(table.groupId),
  ]
);

/**
 * 7. Profiles (Integrated with Supabase auth.users)
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    phone: text("phone").unique(),
    email: text("email").unique(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_profiles_role").on(table.role),
  ]
);

/**
 * 8. Customer Addresses
 */
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    deliveryAreaId: text("delivery_area_id").references(() => deliveryAreas.id, {
      onDelete: "set null",
    }),
    addressLine: text("address_line").notNull(),
    landmark: text("landmark"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_addresses_user").on(table.userId),
  ]
);

/**
 * 9. Orders
 */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    trackingToken: text("tracking_token").notNull().unique(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    orderType: orderTypeEnum("order_type").notNull(),
    status: orderStatusEnum("status").notNull().default("New"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
    paymentLocation: text("payment_location"),
    customerNameSnapshot: text("customer_name_snapshot").notNull(),
    customerPhoneSnapshot: text("customer_phone_snapshot").notNull(),
    customerEmailSnapshot: text("customer_email_snapshot"),
    deliveryAreaNameSnapshot: text("delivery_area_name_snapshot"),
    deliveryAddressSnapshot: text("delivery_address_snapshot"),
    deliveryLandmarkSnapshot: text("delivery_landmark_snapshot"),
    dineInPreferredTime: text("dine_in_preferred_time"),
    specialInstructions: text("special_instructions"),
    subtotalPkr: integer("subtotal_pkr").notNull(),
    deliveryFeePkr: integer("delivery_fee_pkr").notNull().default(0),
    discountPkr: integer("discount_pkr").notNull().default(0),
    discountRate: numeric("discount_rate", { precision: 5, scale: 4 })
      .notNull()
      .default("0.0000"),
    discountType: text("discount_type"),
    customDealSubtotalPkr: integer("custom_deal_subtotal_pkr").notNull().default(0),
    totalPkr: integer("total_pkr").notNull(),
    assignedRiderId: uuid("assigned_rider_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    confirmedByStaffId: uuid("confirmed_by_staff_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_user_id").on(table.userId),
    uniqueIndex("idx_orders_tracking_token").on(table.trackingToken),
    uniqueIndex("idx_orders_order_number").on(table.orderNumber),
    index("idx_orders_status_created").on(table.status, table.createdAt),
    index("idx_orders_created_at").on(table.createdAt),
  ]
);

/**
 * 10. Order Items
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    variantNameSnapshot: text("variant_name_snapshot"),
    unitPriceSnapshotPkr: integer("unit_price_snapshot_pkr").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalPkr: integer("line_total_pkr").notNull(),
    customDealId: text("custom_deal_id"),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
  ]
);

/**
 * 11. Order Item Modifiers
 */
export const orderItemModifiers = pgTable(
  "order_item_modifiers",
  {
    id: text("id").primaryKey(),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    modifierId: text("modifier_id").references(() => productModifiers.id, {
      onDelete: "set null",
    }),
    modifierNameSnapshot: text("modifier_name_snapshot").notNull(),
    priceSnapshotPkr: integer("price_snapshot_pkr").notNull().default(0),
  },
  (table) => [
    index("idx_order_modifiers_item_id").on(table.orderItemId),
  ]
);

/**
 * 12. Order Status History
 */
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_history_order_id").on(table.orderId),
  ]
);

/**
 * 13. Restaurant Settings
 */
export const restaurantSettings = pgTable("restaurant_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 14. Restaurant Schedules
 */
export const restaurantSchedules = pgTable(
  "restaurant_schedules",
  {
    id: text("id").primaryKey(),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: text("open_time").notNull().default("12:01"),
    closeTime: text("close_time").notNull().default("02:00"),
    isClosed: boolean("is_closed").notNull().default(false),
  },
  (table) => [
    index("idx_schedules_day").on(table.dayOfWeek),
  ]
);

/**
 * Drizzle Relations Declarations
 */
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  modifierGroups: many(productModifierGroups),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productModifierGroupsRelations = relations(
  productModifierGroups,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productModifierGroups.productId],
      references: [products.id],
    }),
    modifiers: many(productModifiers),
  })
);

export const productModifiersRelations = relations(productModifiers, ({ one }) => ({
  group: one(productModifierGroups, {
    fields: [productModifiers.groupId],
    references: [productModifierGroups.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  addresses: many(customerAddresses),
  orders: many(orders),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  profile: one(profiles, {
    fields: [customerAddresses.userId],
    references: [profiles.id],
  }),
  deliveryArea: one(deliveryAreas, {
    fields: [customerAddresses.deliveryAreaId],
    references: [deliveryAreas.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(profiles, {
    fields: [orders.userId],
    references: [profiles.id],
  }),
  assignedRider: one(profiles, {
    fields: [orders.assignedRiderId],
    references: [profiles.id],
  }),
  confirmedByStaff: one(profiles, {
    fields: [orders.confirmedByStaffId],
    references: [profiles.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  modifiers: many(orderItemModifiers),
}));

export const orderItemModifiersRelations = relations(orderItemModifiers, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemModifiers.orderItemId],
    references: [orderItems.id],
  }),
  modifier: one(productModifiers, {
    fields: [orderItemModifiers.modifierId],
    references: [productModifiers.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedByUser: one(profiles, {
    fields: [orderStatusHistory.changedByUserId],
    references: [profiles.id],
  }),
}));
