import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  contactName: text("contact_name").notNull(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentRequests = sqliteTable("payment_requests", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  kind: text("kind").notNull(),
  packageName: text("package_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  billingDay: integer("billing_day"),
  dueDate: text("due_date").notNull(),
  paymentCode: text("payment_code").notNull(),
  status: text("status").notNull().default("pending"),
  payfastPaymentId: text("payfast_payment_id"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("payment_requests_code_unique").on(table.paymentCode),
  index("payment_requests_client_due_idx").on(table.clientId, table.dueDate),
  index("payment_requests_open_due_idx").on(table.status, table.dueDate),
]);
