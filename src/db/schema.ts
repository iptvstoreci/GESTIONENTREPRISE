import { pgTable, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

// Users table keyed by Firebase User ID string
export const users = pgTable("users", {
  uid: text("uid").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("employee").notNull(), // 'admin', 'hr', 'employee'
  createdAt: timestamp("created_at").defaultNow(),
});

// Employees roster for automated HR actions
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(), // 'Engineering', 'Commerce', 'RH', 'Finance', 'Marketing'
  position: text("position").notNull(),
  status: text("status").notNull(), // 'Actif', 'En congé', 'En intégration'
  salary: integer("salary").notNull(), // Monthly salary in EUR
  hireDate: text("hire_date").notNull(), // Format: YYYY-MM-DD
  skills: text("skills").notNull(), // Comma-separated list
  performanceScore: integer("performance_score").default(3).notNull(), // 1 to 5
  updatedAt: timestamp("updated_at").defaultNow(),
});

// HR Tasks & Auto-processed requests (leaves, onboarding, trainings)
export const hrRequests = pgTable("hr_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'Congé', 'Formation', 'Onboarding', 'Evaluation'
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("En attente").notNull(), // 'En attente', 'Approuvé', 'Refusé', 'Automatisé'
  dateSubmitted: text("date_submitted").notNull(), // Format: YYYY-MM-DD
  automatedResponse: text("automated_response"), // AI-based response / explanation
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial transactions for business analytics
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'Revenu', 'Dépense'
  category: text("category").notNull(), // 'Abonnements', 'Salaires', 'Prestation', 'Marketing', 'Frais Généraux'
  amount: integer("amount").notNull(), // Amount in EUR
  date: text("date").notNull(), // Format: YYYY-MM-DD
  description: text("description").notNull(),
});

// Clients & Suppliers (Contacts) table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'client', 'fournisseur'
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices & Estimates (Documents) table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'facture', 'devis'
  number: text("number").notNull().unique(), // e.g., FAC-2026-0001 or DEV-2026-0001
  contactId: integer("contact_id")
    .references(() => contacts.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").default("Brouillon").notNull(), // 'Brouillon', 'Envoyé', 'Payé', 'Refusé', 'Expiré'
  issueDate: text("issue_date").notNull(), // Format: YYYY-MM-DD
  dueDate: text("due_date").notNull(), // Format: YYYY-MM-DD
  items: text("items").notNull(), // JSON string containing: [{ description: string, quantity: number, price: number, total: number }]
  taxRate: doublePrecision("tax_rate").default(20.0).notNull(), // percentage VAT (e.g., 20.0, 5.5)
  totalAmount: integer("total_amount").notNull(), // Total including tax in cents/units (let's use EUR)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Full company settings and global currency configuration
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  name: text("name").default("Enterprise Core SAS").notNull(),
  email: text("email").default("contact@entreprise-core.com").notNull(),
  phone: text("phone").default("+33 1 23 45 67 89"),
  address: text("address").default("12 Rue de l'I.A. Décisionnelle, 75001 Paris, France"),
  siret: text("siret").default("123 456 789 00018"),
  tva: text("tva").default("FR 99 123 456 789"),
  currency: text("currency").default("EUR").notNull(), // 'EUR', 'USD', 'GBP', 'CHF', etc.
  capital: text("capital").default("50 000€"),
  website: text("website").default("www.entreprise-core.com"),
  logoUrl: text("logo_url"),
});


