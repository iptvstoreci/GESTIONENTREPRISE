export interface UserProfile {
  uid: string;
  email: string;
  name: string | null;
  role: string; // 'admin' | 'employee'
  createdAt: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  status: string; // 'Actif' | 'En congé' | 'En intégration'
  salary: number;
  hireDate: string;
  skills: string;
  performanceScore: number;
  updatedAt?: string;
}

export interface HRRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeDepartment: string;
  type: string; // 'Congé' | 'Formation' | 'Onboarding' | 'Evaluation'
  title: string;
  description: string;
  status: string; // 'En attente' | 'Approuvé' | 'Refusé' | 'Automatisé'
  dateSubmitted: string;
  automatedResponse: string | null;
}

export interface Transaction {
  id: number;
  type: string; // 'Revenu' | 'Dépense'
  category: string; // 'Abonnements' | 'Salaires' | 'Prestation' | 'Marketing' | 'Frais Généraux'
  amount: number;
  date: string;
  description: string;
}

export interface Contact {
  id: number;
  type: "client" | "fournisseur";
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  createdAt?: string | null;
}

export interface DocumentItem {
  id: string; // key for UI rendering
  description: string;
  quantity: number;
  price: number; // Unit price in EUR
  total: number; // Subtotal for this item line
}

export interface Document {
  id: number;
  type: "facture" | "devis";
  number: string;
  contactId: number;
  status: "Brouillon" | "Envoyé" | "Payé" | "Refusé" | "Expiré";
  issueDate: string; // Format: YYYY-MM-DD
  dueDate: string; // Format: YYYY-MM-DD
  items: string; // JSON string parsed as DocumentItem[]
  taxRate: number; // e.g., 20.0
  totalAmount: number; // Total with VAT included
  notes?: string | null;
  createdAt?: string | null;
  contactName?: string; // Joined field
  contactCompany?: string; // Joined field
}


export interface DashboardStats {
  finances: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    financialHistory: Array<{
      month: string;
      revenu: number;
      depense: number;
      profit: number;
    }>;
    categoryBreakdown: Array<{
      name: string;
      value: number;
    }>;
  };
  hr: {
    headcount: number;
    activeStaff: number;
    avgSalary: number;
    avgPerformance: number;
    deptDistribution: Array<{
      name: string;
      count: number;
    }>;
    pendingCount: number;
  };
  aiInsights: string;
}

export interface CompanySettings {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  siret: string | null;
  tva: string | null;
  currency: string;
  capital: string | null;
  website: string | null;
  logoUrl: string | null;
}

