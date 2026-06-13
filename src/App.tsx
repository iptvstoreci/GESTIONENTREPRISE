import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  DollarSign,
  Briefcase,
  LogOut,
  LineChart,
  LayoutDashboard,
  ShieldCheck,
  User,
  Receipt,
  Sliders,
} from "lucide-react";
import { UserProfile, Employee, HRRequest, Transaction, DashboardStats, Contact, Document, CompanySettings } from "./types.ts";
import AuthScreen from "./components/AuthScreen.tsx";
import Dashboard from "./components/Dashboard.tsx";
import HRManager from "./components/HRManager.tsx";
import TransactionsManager from "./components/TransactionsManager.tsx";
import BillingManager from "./components/BillingManager.tsx";
import SharedDocumentView from "./components/SharedDocumentView.tsx";
import SettingsManager from "./components/SettingsManager.tsx";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "hr" | "transactions" | "billing" | "settings">("dashboard");

  // Core Data States
  const [companyConfig, setCompanyConfig] = useState<CompanySettings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticate & trigger load
  const handleLoginSuccess = (userToken: string, profile: UserProfile) => {
    setToken(userToken);
    setUserProfile(profile);
  };

  // Sign out
  const handleLogout = () => {
    setToken(null);
    setUserProfile(null);
    setStats(null);
    setEmployees([]);
    setRequests([]);
    setTransactions([]);
    setContacts([]);
    setDocuments([]);
  };

  // Fetch all live SQL data from Express backend in parallel
  const loadAppData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [statsRes, empRes, reqRes, txRes, contactsRes, docsRes, configRes] = await Promise.all([
        fetch("/api/analytics/realtime", { headers }),
        fetch("/api/employees", { headers }),
        fetch("/api/hr/requests", { headers }),
        fetch("/api/transactions", { headers }),
        fetch("/api/contacts", { headers }),
        fetch("/api/documents", { headers }),
        fetch("/api/company-settings", { headers }),
      ]);

      if (!statsRes.ok || !empRes.ok || !reqRes.ok || !txRes.ok || !contactsRes.ok || !docsRes.ok || !configRes.ok) {
        throw new Error("Impossible de charger les données de la base Cloud SQL.");
      }

      const [statsData, empData, reqData, txData, contactsData, docsData, configData] = await Promise.all([
        statsRes.json(),
        empRes.json(),
        reqRes.json(),
        txRes.json(),
        contactsRes.json(),
        docsRes.json(),
        configRes.json(),
      ]);

      setStats(statsData);
      setEmployees(empData);
      setRequests(reqData);
      setTransactions(txData);
      setContacts(contactsData);
      setDocuments(docsData);
      setCompanyConfig(configData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur s'est produite lors de la connexion SQL.");
    } finally {
      setLoading(false);
    }
  };

  // Switch role to test administrator and HR features
  const toggleUserRole = async () => {
    if (!token || !userProfile) return;
    const targetRole = userProfile.role === "admin" ? "employee" : "admin";
    try {
      const res = await fetch("/api/auth/role", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: targetRole }),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        setUserProfile(updatedProfile);
        loadAppData();
      }
    } catch (err) {
      console.error("Failed to swap test roles", err);
    }
  };

  // Load data when token shifts
  useEffect(() => {
    if (token) {
      loadAppData();
    }
  }, [token]);

  // If sharing a document publicly, show the shared receipt viewer without authentication
  const hasShareQuery = new URLSearchParams(window.location.search).has("share");
  if (hasShareQuery) {
    return <SharedDocumentView />;
  }

  // If user is not authenticated, show Auth View
  if (!token || !userProfile) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="saas-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden">
      
      {/* LEFT SIDEBAR (Iconic & Text Menu on Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800/60 flex-col py-6 px-4 justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo Identity */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-md shadow-indigo-600/20">
              E
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white font-sans uppercase">Enterprise Core</h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold">SAAS SYSTEMS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold tracking-tight text-left transition flex items-center gap-3 border ${
                activeTab === "dashboard"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Statistiques</span>
            </button>
            <button
              onClick={() => setActiveTab("hr")}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold tracking-tight text-left transition flex items-center gap-3 border ${
                activeTab === "hr"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Ressources Humaines</span>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold tracking-tight text-left transition flex items-center gap-3 border ${
                activeTab === "transactions"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Trésorerie</span>
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold tracking-tight text-left transition flex items-center gap-3 border ${
                activeTab === "billing"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Facturation & Devis</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold tracking-tight text-left transition flex items-center gap-3 border ${
                activeTab === "settings"
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Paramètres</span>
            </button>
          </nav>
        </div>

        {/* User profile details & utility toggles */}
        <div className="space-y-4 pt-4 border-t border-slate-800/60">
          <button
            onClick={toggleUserRole}
            title="Permuter le rôle d'accès utilisateur pour tester différents écrans"
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-xl text-[10px] font-mono font-bold text-slate-300 transition"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Rôle :</span>
            <span className="text-emerald-400 font-bold">{userProfile.role.toUpperCase()} ⇋</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-900">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 uppercase font-mono">
              {userProfile.name?.substring(0, 2) || "U"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-semibold text-slate-100 truncate">{userProfile.name}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">{userProfile.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-md text-white shadow-md">
            E
          </div>
          <div>
            <h1 className="text-xs font-bold leading-none text-slate-100">Enterprise Core</h1>
            <p className="text-[8px] text-indigo-400 font-semibold font-mono tracking-wider mt-0.5 uppercase">BENTO ADMIN</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleUserRole}
            className="p-1 px-2 border border-slate-850 hover:bg-slate-800 rounded-lg text-[9px] font-mono text-emerald-400 font-bold"
          >
            {userProfile.role.toUpperCase()} ⇋
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* COMPACT BOTTOM TABS FOR MOBILE */}
      <nav className="md:hidden bg-slate-900 border-b border-slate-800/80 p-2 flex justify-around shrink-0 sticky top-[57px] z-20 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
            activeTab === "dashboard" ? "text-indigo-400 bg-indigo-600/10 px-3" : "text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-1" />
          Analytique
        </button>
        <button
          onClick={() => setActiveTab("hr")}
          className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
            activeTab === "hr" ? "text-indigo-400 bg-indigo-600/10 px-3" : "text-slate-400"
          }`}
        >
          <Users className="w-4 h-4 mb-1" />
          Ressources RH
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
            activeTab === "transactions" ? "text-indigo-400 bg-indigo-600/10 px-3" : "text-slate-400"
          }`}
        >
          <DollarSign className="w-4 h-4 mb-1" />
          Trésorerie
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
            activeTab === "billing" ? "text-indigo-400 bg-indigo-600/10 px-3" : "text-slate-400"
          }`}
        >
          <Receipt className="w-4 h-4 mb-1" />
          Factures & Tiers
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
            activeTab === "settings" ? "text-indigo-400 bg-indigo-600/10 px-3" : "text-slate-400"
          }`}
        >
          <Sliders className="w-4 h-4 mb-1" />
          Paramètres
        </button>
      </nav>

      {/* MAIN VIEW CONTROLLER (Scrollable Content Layout) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 overflow-y-auto">
        
        {/* Dynamic Bento Style OS Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Nexus OS <span className="text-indigo-400 font-mono text-sm font-semibold">v2.6</span>
            </h1>
            <p className="text-slate-400 text-xs">
              {activeTab === "dashboard" && "Gestion d'entreprise et Tableau de Bord Analytique Automatisé"}
              {activeTab === "hr" && "Gestion Automatisée du Personnel & Requêtes assistées par I.A."}
              {activeTab === "transactions" && "Registre en temps réel de Flux de Trésorerie & Marges d'entreprise"}
              {activeTab === "billing" && "Éditeur de Factures, Devis, Devis-Factures et Fiches de tiers Clients/Fournisseurs"}
              {activeTab === "settings" && "Configuration de la raison sociale, coordonnées légales et choix monétaire pour cet OS"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800/80 flex items-center gap-3 shadow-inner">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-mono text-slate-300 tracking-tight">CLOUD_SQL_POSTGRES: CONNECTED</span>
            </div>
            <div className="bg-indigo-650/20 text-indigo-400 px-4 py-2 rounded-2xl text-[11px] font-mono font-bold border border-indigo-500/30 shadow-sm">
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Global Error Banner if any */}
        {error && (
          <div className="p-4 bg-rose-500/15 text-rose-400 text-xs rounded-2xl border border-rose-500/25 flex items-center gap-2 font-mono shadow-md">
            <span className="font-semibold">[SYSTEM_ERROR_WARNING] :</span> {error}
          </div>
        )}

        {/* Content Tabs view matching Bento format */}
        <div className="flex-1">
          {activeTab === "dashboard" && stats && (
            <Dashboard stats={stats} loading={loading} onRefresh={loadAppData} currency={companyConfig?.currency || "EUR"} />
          )}

          {activeTab === "dashboard" && !stats && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono border border-dashed border-slate-850 rounded-3xl h-64">
              [EMPTY_METRICS] : Aucune statistique disponible.
            </div>
          )}

          {activeTab === "hr" && (
            <HRManager
              employees={employees}
              requests={requests}
              token={token}
              onRefresh={loadAppData}
              currency={companyConfig?.currency || "EUR"}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsManager
              transactions={transactions}
              token={token}
              onRefresh={loadAppData}
              currency={companyConfig?.currency || "EUR"}
            />
          )}

          {activeTab === "billing" && (
            <BillingManager
              contacts={contacts}
              documents={documents}
              token={token}
              onRefresh={loadAppData}
              currency={companyConfig?.currency || "EUR"}
              companyConfig={companyConfig}
            />
          )}

          {activeTab === "settings" && companyConfig && (
            <SettingsManager
              settings={companyConfig}
              token={token}
              onRefresh={loadAppData}
            />
          )}
        </div>

        {/* SIMPLE COMPRESSED FOOTER */}
        <footer className="border-t border-slate-900 pt-4 text-center shrink-0">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            SOCIÉTÉ ENTERPRISE CORE • PROPULSÉ PAR GOOGLE CLOUD SQL (POSTGRESQL) & GEMINI I.A. • 2026
          </p>
        </footer>

      </div>
    </div>
  );
}
