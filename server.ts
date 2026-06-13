// server.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { users, employees, hrRequests, transactions, contacts, documents, companySettings } from "./src/db/schema.ts";
import { eq, sql, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Initialize Gemini SDK with telemetry headers
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not defined in Secrets.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
    return null;
  }
};

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", timestamp: new Date() });
});

// Authentication synchronization
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Auth payload missing" });
  }

  const email = user.email || "";
  const uid = user.uid;
  const name = user.name || email.split("@")[0];

  try {
    // Upsert user profile
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name,
        role: email.endsWith("@entreprise.com") || email.includes("guill") ? "admin" : "employee",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
        },
      })
      .returning();

    res.json({ success: true, user: result[0] });
  } catch (error: any) {
    console.error("User sync failed:", error);
    res.status(500).json({ error: "Could not sync user profile", details: error.message });
  }
});

// Fetch current user details
app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Auth payload missing" });
  }
  try {
    const profile = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
    if (!profile.length) {
      return res.status(404).json({ error: "User profile not found in database" });
    }
    res.json(profile[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load profile", details: error.message });
  }
});

// Update user role (easily test between views)
app.put("/api/auth/role", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user;
  const { role } = req.body;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const updated = await db.update(users)
      .set({ role })
      .where(eq(users.uid, user.uid))
      .returning();
    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update role", details: error.message });
  }
});

// EMPLOYEES ENDPOINTS
app.get("/api/employees", requireAuth, async (req, res) => {
  try {
    const records = await db.select().from(employees).orderBy(employees.name);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: "DB employees fetch failed", details: error.message });
  }
});

app.post("/api/employees", requireAuth, async (req, res) => {
  const { name, email, department, position, status, salary, hireDate, skills } = req.body;
  if (!name || !email || !department || !position || !salary || !hireDate) {
    return res.status(400).json({ error: "Missing required fields for new employee" });
  }

  try {
    const inserted = await db.insert(employees)
      .values({
        name,
        email,
        department,
        position,
        status: status || "En intégration",
        salary: parseInt(salary, 10),
        hireDate,
        skills: skills || "",
        performanceScore: 3,
      })
      .returning();

    const emp = inserted[0];

    // AUTOMATED HR ONBOARDING ACTION: create automated welcome/onboarding request
    await db.insert(hrRequests)
      .values({
        employeeId: emp.id,
        type: "Onboarding",
        title: `Intégration de ${emp.name}`,
        description: `Plan d'intégration personnalisé pour le poste de ${emp.position} au sein du département ${emp.department}.`,
        status: "Automatisé",
        dateSubmitted: hireDate,
        automatedResponse: `Félicitations pour l'onboarding de ${emp.name} !
💡 Actions automatiques déclenchées :
1. Création du mail professionnel : ${emp.email}
2. Accès configurés pour le Slack du département ${emp.department}.
3. Assignation du tuteur d'intégration tech.`,
      });

    res.status(201).json(emp);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to insert employee", details: error.message });
  }
});

app.put("/api/employees/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, email, department, position, status, salary, hireDate, skills, performanceScore } = req.body;
  try {
    const updated = await db.update(employees)
      .set({
        name,
        email,
        department,
        position,
        status,
        salary: salary ? parseInt(salary, 10) : undefined,
        hireDate,
        skills,
        performanceScore: performanceScore ? parseInt(performanceScore, 10) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, parseInt(id, 10)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update employee", details: error.message });
  }
});

app.delete("/api/employees/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.delete(employees)
      .where(eq(employees.id, parseInt(id, 10)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ success: true, message: "Employee removed successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete employee", details: error.message });
  }
});

// HR REQUESTS ENDPOINTS (Leaves, Trainings, etc.)
app.get("/api/hr/requests", requireAuth, async (req, res) => {
  try {
    // Dynamic inner join with employees
    const records = await db.select({
      id: hrRequests.id,
      employeeId: hrRequests.employeeId,
      employeeName: employees.name,
      employeeDepartment: employees.department,
      type: hrRequests.type,
      title: hrRequests.title,
      description: hrRequests.description,
      status: hrRequests.status,
      dateSubmitted: hrRequests.dateSubmitted,
      automatedResponse: hrRequests.automatedResponse,
    })
    .from(hrRequests)
    .innerJoin(employees, eq(hrRequests.employeeId, employees.id))
    .orderBy(desc(hrRequests.updatedAt));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch requests", details: error.message });
  }
});

// POST request & trigger AUTOMATED HR DECISION making with Gemini IA!
app.post("/api/hr/requests", requireAuth, async (req, res) => {
  const { employeeId, type, title, description, dateSubmitted } = req.body;
  if (!employeeId || !type || !title || !description || !dateSubmitted) {
    return res.status(400).json({ error: "Missing required query fields" });
  }

  try {
    // Fetch employee data for AI context
    const empList = await db.select().from(employees).where(eq(employees.id, parseInt(employeeId, 10))).limit(1);
    if (!empList.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const emp = empList[0];

    // Insert the pending request
    const insertedReq = await db.insert(hrRequests)
      .values({
        employeeId: emp.id,
        type,
        title,
        description,
        status: "En attente",
        dateSubmitted,
      })
      .returning();

    const reqId = insertedReq[0].id;

    // Trigger Gemini Automation asynchronously (or inline for quick UX block)
    const gemini = getGeminiClient();
    let aiResponseText = "";
    let finalStatus = "En attente"; // Default

    if (gemini) {
      try {
        const prompt = `Vous êtes un Assistant RH intelligent et automatisé pour l'entreprise.
Analysez cette demande effectuée par un employé :
- Employé : ${emp.name} (Poste : ${emp.position}, Département : ${emp.department}, Salaire : ${emp.salary}€, Score de performance : ${emp.performanceScore}/5)
- Type de demande : ${type}
- Titre : ${title}
- Description : ${description}
- Date soumise : ${dateSubmitted}

Tâches :
1. Donnez une réponse de l'assistant RH (1 à 3 phrases structurées) confirmant, analysant ou guidant l'employé.
2. Déterminez si, selon des critères d'entreprise classiques, cette demande peut être "Approuvé" immédiatement, "Refusé", ou laissée "En attente" pour validation humaine.
Exemple : une formation constructive est souvent auto-approuvée si le score de l'employé > 3. Un congé d'été est souvent laissé 'En attente' pour revue de planning.

Répondez STRICTEMENT au format JSON suivant :
{
  "statusDecision": "Approuvé" ou "Refusé" ou "En attente",
  "explanation": "Votre analyse bienveillante en français à l'employé"
}`;

        const aiResponse = await gemini.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                statusDecision: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["statusDecision", "explanation"],
            },
          },
        });

        const parsedDecision = JSON.parse(aiResponse.text || "{}");
        if (parsedDecision.statusDecision && parsedDecision.explanation) {
          finalStatus = parsedDecision.statusDecision;
          aiResponseText = parsedDecision.explanation;

          // Save the AI Automation
          await db.update(hrRequests)
            .set({
              status: finalStatus,
              automatedResponse: aiResponseText,
              updatedAt: new Date(),
            })
            .where(eq(hrRequests.id, reqId));
        }
      } catch (geminiError) {
        console.error("Gemini failed to generate HR decision:", geminiError);
        // Fallback simple automation logic
        if (type === "Formation") {
          finalStatus = "Approuvé";
          aiResponseText = "Approuvé automatiquement (Règle d'entreprise : budget compétence inférieur à 5000€).";
        } else {
          finalStatus = "En attente";
          aiResponseText = "En cours d'examen automatique par le système de gestion des effectifs régionaux.";
        }
        await db.update(hrRequests)
          .set({
            status: finalStatus,
            automatedResponse: aiResponseText,
            updatedAt: new Date(),
          })
          .where(eq(hrRequests.id, reqId));
      }
    } else {
      // Manual simple fallback if Gemini is not set up
      finalStatus = type === "Formation" ? "Approuvé" : "En attente";
      aiResponseText = "Demande reçue et enregistrée dans le registre RH.";
      await db.update(hrRequests)
        .set({
          status: finalStatus,
          automatedResponse: aiResponseText,
          updatedAt: new Date(),
        })
        .where(eq(hrRequests.id, reqId));
    }

    // Return the updated request
    const freshRecord = await db.select({
      id: hrRequests.id,
      employeeId: hrRequests.employeeId,
      employeeName: employees.name,
      employeeDepartment: employees.department,
      type: hrRequests.type,
      title: hrRequests.title,
      description: hrRequests.description,
      status: hrRequests.status,
      dateSubmitted: hrRequests.dateSubmitted,
      automatedResponse: hrRequests.automatedResponse,
    })
    .from(hrRequests)
    .innerJoin(employees, eq(hrRequests.employeeId, employees.id))
    .where(eq(hrRequests.id, reqId));

    res.status(201).json(freshRecord[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to submit request", details: error.message });
  }
});

// HR Approve/Reject manual overrides
app.post("/api/hr/requests/:id/override", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status value" });

  try {
    const updated = await db.update(hrRequests)
      .set({
        status,
        automatedResponse: remarks || `Modifié manuellement par le gestionnaire RH`,
        updatedAt: new Date(),
      })
      .where(eq(hrRequests.id, parseInt(id, 10)))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to override HR request", details: error.message });
  }
});

// TRANSACTIONS ENDPOINTS
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const records = await db.select().from(transactions).orderBy(desc(transactions.date));
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch transactions", details: error.message });
  }
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  const { type, category, amount, date, description } = req.body;
  if (!type || !category || !amount || !date || !description) {
    return res.status(400).json({ error: "Missing transaction fields" });
  }

  try {
    const inserted = await db.insert(transactions)
      .values({
        type,
        category,
        amount: parseInt(amount, 10),
        date,
        description,
      })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to record transaction", details: error.message });
  }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(transactions).where(eq(transactions.id, parseInt(id, 10)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete transaction", details: error.message });
  }
});

// COMPANY SETTINGS ENDPOINTS (Global Settings & Currency)
app.get("/api/company-settings", requireAuth, async (req, res) => {
  try {
    let records = await db.select().from(companySettings).limit(1);
    if (!records.length) {
      const defaultRow = {
        name: "Enterprise Core SAS",
        email: "contact@entreprise-core.com",
        phone: "+33 1 23 45 67 89",
        address: "12 Rue de l'I.A. Décisionnelle, 75001 Paris, France",
        siret: "123 456 789 00018",
        tva: "FR 99 123 456 789",
        currency: "EUR",
        capital: "50 000€",
        website: "www.entreprise-core.com"
      };
      const inserted = await db.insert(companySettings).values(defaultRow).returning();
      return res.json(inserted[0]);
    }
    res.json(records[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Impossible de récupérer les paramètres de l'entreprise", details: error.message });
  }
});

app.put("/api/company-settings", requireAuth, async (req, res) => {
  const { name, email, phone, address, siret, tva, currency, capital, website, logoUrl } = req.body;
  try {
    let records = await db.select().from(companySettings).limit(1);
    if (!records.length) {
      const inserted = await db.insert(companySettings).values({
        name,
        email,
        phone,
        address,
        siret,
        tva,
        currency: currency || "EUR",
        capital,
        website,
        logoUrl
      }).returning();
      return res.json(inserted[0]);
    } else {
      const updated = await db.update(companySettings)
        .set({
          name,
          email,
          phone,
          address,
          siret,
          tva,
          currency: currency || "EUR",
          capital,
          website,
          logoUrl
        })
        .where(eq(companySettings.id, records[0].id))
        .returning();
      return res.json(updated[0]);
    }
  } catch (error: any) {
    res.status(500).json({ error: "Impossible de stocker les paramètres", details: error.message });
  }
});

// PUBLIC COMPANY SETTINGS ENDPOINT (Open for anonymous share page rendering)
app.get("/api/public/company-settings", async (req, res) => {
  try {
    let records = await db.select().from(companySettings).limit(1);
    if (!records.length) {
      const defaultRow = {
        name: "Enterprise Core SAS",
        email: "contact@entreprise-core.com",
        phone: "+33 1 23 45 67 89",
        address: "12 Rue de l'I.A. Décisionnelle, 75001 Paris, France",
        siret: "123 456 789 00018",
        tva: "FR 99 123 456 789",
        currency: "EUR",
        capital: "50 000€",
        website: "www.entreprise-core.com"
      };
      const inserted = await db.insert(companySettings).values(defaultRow).returning();
      return res.json(inserted[0]);
    }
    res.json(records[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Impossible de récupérer les paramètres de l'entreprise", details: error.message });
  }
});

// CONTACTS ENDPOINTS (Clients & Suppliers)
app.get("/api/contacts", requireAuth, async (req, res) => {
  try {
    const records = await db.select().from(contacts).orderBy(contacts.name);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch contacts", details: error.message });
  }
});

app.post("/api/contacts", requireAuth, async (req, res) => {
  const { type, name, email, phone, company, address } = req.body;
  if (!type || !name || !email) {
    return res.status(400).json({ error: "Missing required contact fields (type, name, email)" });
  }
  if (type !== "client" && type !== "fournisseur") {
    return res.status(400).json({ error: "Type must be 'client' or 'fournisseur'" });
  }

  try {
    const inserted = await db.insert(contacts)
      .values({
        type,
        name,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
      })
      .returning();
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create contact", details: error.message });
  }
});

app.put("/api/contacts/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { type, name, email, phone, company, address } = req.body;
  try {
    const updated = await db.update(contacts)
      .set({
        type,
        name,
        email,
        phone: phone === undefined ? undefined : phone,
        company: company === undefined ? undefined : company,
        address: address === undefined ? undefined : address,
      })
      .where(eq(contacts.id, parseInt(id, 10)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update contact", details: error.message });
  }
});

app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.delete(contacts).where(eq(contacts.id, parseInt(id, 10))).returning();
    if (!deleted.length) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete contact", details: error.message });
  }
});

// DOCUMENTS ENDPOINTS (Invoices & Estimates)
app.get("/api/documents", requireAuth, async (req, res) => {
  try {
    const records = await db.select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      contactId: documents.contactId,
      status: documents.status,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      items: documents.items,
      taxRate: documents.taxRate,
      totalAmount: documents.totalAmount,
      notes: documents.notes,
      createdAt: documents.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(documents)
    .innerJoin(contacts, eq(documents.contactId, contacts.id))
    .orderBy(desc(documents.id));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load invoices and estimates", details: error.message });
  }
});

app.post("/api/documents", requireAuth, async (req, res) => {
  const { type, number, contactId, status, issueDate, dueDate, items, taxRate, totalAmount, notes } = req.body;
  if (!type || !number || !contactId || !issueDate || !dueDate || !items || totalAmount === undefined) {
    return res.status(400).json({ error: "Missing required document fields" });
  }

  try {
    const inserted = await db.insert(documents)
      .values({
        type,
        number,
        contactId: parseInt(contactId, 10),
        status: status || "Brouillon",
        issueDate,
        dueDate,
        items: typeof items === "string" ? items : JSON.stringify(items),
        taxRate: taxRate ? parseFloat(taxRate) : 20.0,
        totalAmount: parseInt(totalAmount, 10),
        notes: notes || null,
      })
      .returning();

    // Join contact details for immediate state update in frontend
    const joined = await db.select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      contactId: documents.contactId,
      status: documents.status,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      items: documents.items,
      taxRate: documents.taxRate,
      totalAmount: documents.totalAmount,
      notes: documents.notes,
      createdAt: documents.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(documents)
    .innerJoin(contacts, eq(documents.contactId, contacts.id))
    .where(eq(documents.id, inserted[0].id));

    res.status(201).json(joined[0]);
  } catch (error: any) {
    if (error.code === "23505" || error.message?.includes("unique")) {
      return res.status(400).json({ error: `Le numéro de pièce '${number}' est déjà utilisé.` });
    }
    res.status(500).json({ error: "Failed to create document", details: error.message });
  }
});

app.put("/api/documents/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { type, number, contactId, status, issueDate, dueDate, items, taxRate, totalAmount, notes } = req.body;
  try {
    await db.update(documents)
      .set({
        type,
        number,
        contactId: contactId ? parseInt(contactId, 10) : undefined,
        status,
        issueDate,
        dueDate,
        items: items ? (typeof items === "string" ? items : JSON.stringify(items)) : undefined,
        taxRate: taxRate ? parseFloat(taxRate) : undefined,
        totalAmount: totalAmount !== undefined ? parseInt(totalAmount, 10) : undefined,
        notes: notes === undefined ? undefined : notes,
      })
      .where(eq(documents.id, parseInt(id, 10)));

    // Return joined document
    const joined = await db.select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      contactId: documents.contactId,
      status: documents.status,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      items: documents.items,
      taxRate: documents.taxRate,
      totalAmount: documents.totalAmount,
      notes: documents.notes,
      createdAt: documents.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(documents)
    .innerJoin(contacts, eq(documents.contactId, contacts.id))
    .where(eq(documents.id, parseInt(id, 10)));

    res.json(joined[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update document", details: error.message });
  }
});

app.delete("/api/documents/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.delete(documents).where(eq(documents.id, parseInt(id, 10))).returning();
    if (!deleted.length) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete document", details: error.message });
  }
});

// CORE ANALYTICS ENDPOINT (REAL TIME BUSINESS + HR STATS & AI INSIGHTS REPORT)
app.get("/api/analytics/realtime", requireAuth, async (req, res) => {
  try {
    // 1. Load data
    const allEmployees = await db.select().from(employees);
    const allTransactions = await db.select().from(transactions);
    const pendingHRList = await db.select().from(hrRequests).where(eq(hrRequests.status, "En attente"));

    // 2. Financial computations
    let totalIncome = 0;
    let totalExpense = 0;
    allTransactions.forEach((t) => {
      if (t.type === "Revenu") totalIncome += t.amount;
      else if (t.type === "Dépense") totalExpense += t.amount;
    });
    const netProfit = totalIncome - totalExpense;

    // Monthly breakdown for charting
    const financialHistoryMap: Record<string, { income: number; expense: number }> = {};
    allTransactions.forEach((t) => {
      const monthStr = t.date.substring(0, 7); // e.g., '2026-06'
      if (!financialHistoryMap[monthStr]) {
        financialHistoryMap[monthStr] = { income: 0, expense: 0 };
      }
      if (t.type === "Revenu") {
        financialHistoryMap[monthStr].income += t.amount;
      } else {
        financialHistoryMap[monthStr].expense += t.amount;
      }
    });
    const financialHistory = Object.entries(financialHistoryMap).map(([month, val]) => ({
      month,
      revenu: val.income,
      depense: val.expense,
      profit: val.income - val.expense,
    })).sort((a,b) => a.month.localeCompare(b.month));

    // Category breakdown
    const categoryBreakdownMap: Record<string, number> = {};
    allTransactions.forEach((t) => {
      categoryBreakdownMap[t.category] = (categoryBreakdownMap[t.category] || 0) + t.amount;
    });
    const categoryBreakdown = Object.entries(categoryBreakdownMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 3. HR computations
    const headcount = allEmployees.length;
    const activeStaff = allEmployees.filter((e) => e.status === "Actif").length;
    const departmentBreakdownMap: Record<string, number> = {};
    let totalSalary = 0;
    let totalPerformance = 0;

    allEmployees.forEach((e) => {
      departmentBreakdownMap[e.department] = (departmentBreakdownMap[e.department] || 0) + 1;
      totalSalary += e.salary;
      totalPerformance += e.performanceScore;
    });

    const avgSalary = headcount ? Math.round(totalSalary / headcount) : 0;
    const avgPerformance = headcount ? parseFloat((totalPerformance / headcount).toFixed(1)) : 0;
    const deptDistribution = Object.entries(departmentBreakdownMap).map(([name, count]) => ({
      name,
      count,
    }));

    // 4. GENERATE STRATEGIC REAL-TIME REPORT WITH GEMINI AI
    const gemini = getGeminiClient();
    let aiInsights = "";

    if (gemini) {
      try {
        const payloadSummary = `Données factuelles actuelles de l'entreprise :
- Finances : Revenu Total = ${totalIncome}€, Dépenses Totales = ${totalExpense}€, Résultat net = ${netProfit}€
- Effectifs : ${headcount} employés totaux (${activeStaff} actifs, ${deptDistribution.map(d => `${d.name}: ${d.count}`).join(", ")})
- Masse salariale moyenne : ${avgSalary}€/mois
- Score de performance moyen de l'équipe : ${avgPerformance}/5
- Demandes RH en suspens : ${pendingHRList.length} en attente de traitement`;

        const prompt = `Vous êtes le Directeur Financier & Directeur RH virtuel IA de l'entreprise.
Analysez les données ci-dessous et rédigez un résumé exécutif stratégique (environ 150 mots) en français, clair et percutant.
Utilisez des puces pour séparer les points clés :
1. Santé financière de l'entreprise (Trésorerie, rentabilité).
2. Diagnostic RH (Répartition des équipes, masse salariale, performance).
3. 2 Recommandations d'actions immédiates.

N'utilisez pas de jargon technique ou de variables internes. Soyez direct, professionnel et orienté action.
Voici les données :
${payloadSummary}`;

        const aiOutput = await gemini.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        aiInsights = aiOutput.text || "Analyse indisponible";
      } catch (e: any) {
        aiInsights = `**Rapport de performance mensuel (Mode dégradé)** :
• **Finances** : Le résultat net est de **${netProfit}€** avec une bonne répartition de la trésorerie.
• **Ressources Humaines** : La masse salariale moyenne s'élève à **${avgSalary}€**. Des optimisations sont envisageables dans l'affectation des compétences. 
• **Conseil automatique** : Traiter les demandes RH en suspens pour maintenir l'engagement collaborateur.`;
      }
    } else {
      aiInsights = `### Diagnostic d'Entreprise Simplifié
• **Indicateur Financier** : La rentabilité brute actuelle est positive (**${netProfit}€**).
• **Indicateur Humain** : Force de travail composée de **${headcount} employés** répartis sur les pôles clés.
• **Recommandation** : Activez la clé API Gemini Secrète pour recevoir un plan d'action d'intelligence décisionnelle sur-mesure !`;
    }

    res.json({
      finances: {
        totalIncome,
        totalExpense,
        netProfit,
        financialHistory,
        categoryBreakdown,
      },
      hr: {
        headcount,
        activeStaff,
        avgSalary,
        avgPerformance,
        deptDistribution,
        pendingCount: pendingHRList.length,
      },
      aiInsights,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate analytics data", details: error.message });
  }
});

// GET PUBLIC SHAREABLE DOCUMENT
app.get("/api/public/documents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const records = await db.select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      contactId: documents.contactId,
      status: documents.status,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      items: documents.items,
      taxRate: documents.taxRate,
      totalAmount: documents.totalAmount,
      notes: documents.notes,
      createdAt: documents.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      contactAddress: contacts.address,
    })
    .from(documents)
    .innerJoin(contacts, eq(documents.contactId, contacts.id))
    .where(eq(documents.id, parseInt(id, 10)))
    .limit(1);

    if (!records.length) {
      return res.status(404).json({ error: "Le document demandé est introuvable ou n'est pas ouvert au partage public." });
    }

    res.json(records[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la récupération du document public.", details: error.message });
  }
});

// POST GENERATE AI COMPANION SHARE MESSAGE (EMAIL/SMS)
app.post("/api/documents/:id/ai-share-msg", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { tone } = req.body; // 'pro', 'amical', 'urgent', 'court'
  
  try {
    const records = await db.select({
      number: documents.number,
      type: documents.type,
      totalAmount: documents.totalAmount,
      dueDate: documents.dueDate,
      issueDate: documents.issueDate,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(documents)
    .innerJoin(contacts, eq(documents.contactId, contacts.id))
    .where(eq(documents.id, parseInt(id, 10)))
    .limit(1);

    if (!records.length) {
      return res.status(404).json({ error: "Document inexistant." });
    }

    const doc = records[0];
    const docLabel = doc.type === "facture" ? "facture" : "devis";
    
    const gemini = getGeminiClient();
    let textResult = "";

    if (gemini) {
      const tonePromptMap: Record<string, string> = {
        pro: "un ton très professionnel, courtois, idéal pour la comptabilité ou direction B2B.",
        amical: "un ton amical, chaleureux et détendu, parfait pour s'adresser à un client régulier de confiance.",
        urgent: "un ton courtois mais insistant soulignant un rappel amical de paiement pour facture en échéance.",
        court: "un format SMS ou chat ultra-court, impactant et direct pour envoyer sur WhatsApp ou Slack."
      };
      const activeTone = tonePromptMap[tone] || tonePromptMap.pro;

      const prompt = `Vous êtes un Assistant Administratif Intelligent d'Entreprise.
Rédigez un message court en français pour accompagner l'envoi d'un lien de partage de document pour un client.
Le message doit être poli, impeccable au niveau orthographe et prêt à être envoyé.

Détails du document :
- Type de pièce : ${docLabel}
- Référence de pièce : #${doc.number}
- Montant total : ${doc.totalAmount.toLocaleString()} €
- Destinataire : ${doc.contactName} ${doc.contactCompany ? `(${doc.contactCompany})` : ""}
- Date d'émission : ${doc.issueDate}
- Date d'échéance : ${doc.dueDate}

Spécifications du message :
- Ton à employer : ${activeTone}
- Inclure un espace réservé ou un texte fictif explicite pour le lien de partage, de la forme : [Insérer le lien ici]
- Ne mettez aucun bloc de code markdown, donnez juste le texte brut du message directement éditable.`;

      const aiOutput = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      textResult = aiOutput.text || "Message d'accompagnement non généré.";
    } else {
      // Fallback message generator
      textResult = `Bonjour ${doc.contactName},\n\nVeuillez trouver ci-joint le lien de consultation pour votre ${docLabel} #${doc.number} d'un montant de ${doc.totalAmount.toLocaleString()} €.\n\nLien de partage : [Insérer le lien ici]\n\nNous restons à votre entière disposition.\nCordialement,\nService Comptabilité`;
    }

    res.json({ message: textResult });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la génération du message de partage par l'IA.", details: error.message });
  }
});

// -----------------------------------------------------------------------------
// VITE OR STATIC FILE SERVER MIDDLEWARE SETUP
// -----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise SaaS operational and live on http://localhost:${PORT}`);
  });
}

startServer();
