import React from "react";
import { formatCurrency } from "../utils/currency.ts";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  Wallet,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { DashboardStats } from "../types.ts";

interface DashboardProps {
  stats: DashboardStats;
  loading: boolean;
  onRefresh: () => void;
  currency?: string;
}

const COLORS = ["#0ea5e9", "#10b981", "#ef4444", "#f59e0b", "#6366f1"];

export default function Dashboard({ stats, loading, onRefresh, currency = "EUR" }: DashboardProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 font-mono">Chargement des données temps réel...</p>
      </div>
    );
  }  const { finances, hr, aiInsights } = stats;

  return (
    <div id="dashboard-tab" className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-sans">Visualisation Analytique</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicateurs financiers consolidés et statistiques collectives.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold font-mono transition shadow-md shadow-indigo-650/10 cursor-pointer"
        >
          Rafraîchir
        </button>
      </div>

      {/* CORE FINANCIAL AND HR STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Revenus cumulés</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(finances.totalIncome, currency)}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
              ★ Flux d'abonnements positifs
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Dépenses totales</span>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(finances.totalExpense, currency)}
            </h3>
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-mono">
              ⚠ Salaires & infrastructure
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Résultat Net</span>
            <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <DollarSign className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatCurrency(finances.netProfit, currency)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Bénéfice opérationnel net
            </p>
          </div>
        </div>

        {/* Headcount - SPOTLIGHT CARD (Indigo Solid Accent) */}
        <div className="bg-indigo-650 p-6 rounded-3xl border border-indigo-500/35 shadow-lg shadow-indigo-650/10 relative overflow-hidden flex flex-col justify-between hover:bg-indigo-600 transition duration-300">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider font-mono">Effectif Global</span>
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
              {hr.headcount} Membres
            </h3>
            <p className="text-[11px] text-indigo-150 mt-1 font-mono">
              Dont {hr.activeStaff} actifs en poste
            </p>
          </div>
        </div>
      </div>

      {/* GEMINI COMPRESSED STRATEGIC EXECUTIVE REPORT */}
      <div className="p-6 bg-slate-900/90 text-slate-100 rounded-3xl border border-slate-800/80 shadow-md relative overflow-hidden hover:border-indigo-500/30 transition duration-300">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-700/5 rounded-full opacity-60 blur-3xl pointer-events-none" />
        <div className="absolute left-10 bottom-0 w-80 h-80 bg-purple-800/5 rounded-full opacity-40 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-full text-[9px] font-bold tracking-wider font-mono flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3 h-3 text-white fill-white" />
              RAPPORT STRATÉGIQUE I.A.
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Analysé en temps réel par Gemini-Flash</span>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <div className="prose prose-invert text-slate-300 max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {aiInsights}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS GRAPHICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Income & Expense History Area Chart */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-sm lg:col-span-2 flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white tracking-tight font-sans">Historique des Flux Financiers</h4>
            <p className="text-xs text-slate-400 mt-1">Comparatif des revenus, charges et résultats mensuels (en {currency}).</p>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finances.financialHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDepense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="month" tickLine={false} style={{ fontSize: 10, fontFamily: "monospace" }} stroke="#475569" />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fontFamily: "monospace" }} stroke="#475569" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#fff" }}
                  labelStyle={{ fontSize: 11, fontWeight: "bold", color: "#38bdf8" }}
                />
                <Area type="monotone" dataKey="revenu" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenu)" name="Revenus" />
                <Area type="monotone" dataKey="depense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDepense)" name="Dépenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HR Statistics & Demographics */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight font-sans">Répartition par Département</h4>
            <p className="text-xs text-slate-400 mt-1">Distribution du personnel à travers les pôles d'activité.</p>
          </div>

          <div className="h-44 flex items-center justify-center relative mt-4">
            {hr.deptDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hr.deptDistribution}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {hr.deptDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500 font-mono">[AUCUN_MEMBRE]</p>
            )}
            <div className="absolute text-center">
              <span className="text-2xl font-bold font-mono text-white">{hr.headcount}</span>
              <p className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider">Membres</p>
            </div>
          </div>

          <div className="space-y-1.5 mt-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40">
            {hr.deptDistribution.map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-300 font-medium">{dept.name}</span>
                </div>
                <span className="font-semibold font-mono text-white">{dept.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADDITIONAL SPECIFIC PERFORMANCE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Average Team Salary */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-sm flex items-center gap-4 hover:border-slate-700 transition duration-300">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Salaire Moyen</span>
            <h5 className="text-lg font-bold text-white font-mono mt-0.5">
              {formatCurrency(hr.avgSalary, currency)} <span className="text-xs font-normal text-slate-400 font-sans">/ dev</span>
            </h5>
          </div>
        </div>

        {/* average Team Performance */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-sm flex items-center gap-4 hover:border-slate-700 transition duration-300">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Performance Collective</span>
            <h5 className="text-lg font-bold text-white font-mono mt-0.5">
              {hr.avgPerformance} / 5
            </h5>
          </div>
        </div>

        {/* Pending HR Tasks */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-sm flex items-center gap-4 hover:border-slate-700 transition duration-300">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Requêtes de congés</span>
            <h5 className="text-lg font-bold text-white font-mono mt-0.5">
              {hr.pendingCount} à valider
            </h5>
          </div>
        </div>
        
      </div>
    </div>
  );
}
