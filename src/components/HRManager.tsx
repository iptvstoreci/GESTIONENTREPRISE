import React, { useState } from "react";
import {
  Users,
  Plus,
  UserPlus,
  Sparkles,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Search,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Employee, HRRequest } from "../types.ts";
import { formatCurrency } from "../utils/currency.ts";

interface HRManagerProps {
  employees: Employee[];
  requests: HRRequest[];
  token: string;
  onRefresh: () => void;
  currency?: string;
}

export default function HRManager({ employees, requests, token, onRefresh, currency = "EUR" }: HRManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"employees" | "requests">("employees");

  // Employee Add Modal / form states
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    department: "Engineering",
    position: "",
    salary: "3500",
    hireDate: new Date().toISOString().substring(0, 10),
    skills: "",
  });

  // Request Submit Modal / form states
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReq, setNewReq] = useState({
    employeeId: "",
    type: "Congé",
    title: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEmp),
      });

      if (!res.ok) {
        throw new Error("Impossible d'ajouter le collaborateur.");
      }

      setShowAddEmp(false);
      setNewEmp({
        name: "",
        email: "",
        department: "Engineering",
        position: "",
        salary: "3500",
        hireDate: new Date().toISOString().substring(0, 10),
        skills: "",
      });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit automatic smart HR request
  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hr/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newReq,
          dateSubmitted: new Date().toISOString().substring(0, 10),
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur de traitement de la requête IA.");
      }

      setShowAddReq(false);
      setNewReq({
        employeeId: "",
        type: "Congé",
        title: "",
        description: "",
      });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual HR approval override
  const handleOverrideStatus = async (requestId: number, status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/requests/${requestId}/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          remarks: `Validé manuellement par la Direction RH le ${new Date().toISOString().substring(0, 10)}.`,
        }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const textStr = `${emp.name} ${emp.email} ${emp.position} ${emp.department} ${emp.skills}`.toLowerCase();
    return textStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div id="hr-tab" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-sans">Gestion du Personnel & Requêtes</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gérez les fiches des collaborateurs et évaluez les demandes assistées par l'intelligence artificielle.
          </p>
        </div>
        
        {/* Toggle options */}
        <div className="bg-slate-900 border border-slate-800/80 p-1 rounded-2xl flex self-start">
          <button
            onClick={() => setActiveSubTab("employees")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeSubTab === "employees"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Effectifs ({employees.length})
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab("requests")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeSubTab === "requests"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Requêtes IA ({requests.length})
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-505/15 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-center gap-2 font-mono">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>[WARNING] : {error}</span>
        </div>
      )}

      {/* RENDER EMPLOYEES TAB */}
      {activeSubTab === "employees" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="employee-search"
                type="text"
                placeholder="Rechercher nom, poste, compétences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-slate-700"
              />
            </div>
            
            <button
              id="add-employee-btn"
              onClick={() => setShowAddEmp(true)}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-650/10 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-indigo-200" />
              Recruter un Collaborateur
            </button>
          </div>

          <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold tracking-wider font-mono">
                    <th className="p-4">COLLABORATEUR</th>
                    <th className="p-4">DÉPARTEMENT</th>
                    <th className="p-4">POSTE & REMUNÉRATION</th>
                    <th className="p-4">STATUT / EMBAUCHE</th>
                    <th className="p-4">COMPÉTENCES</th>
                    <th className="p-4 text-center">EVAL.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-900/40 transition duration-150">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center font-bold text-indigo-300 font-mono">
                              {emp.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{emp.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              emp.department === "Engineering"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : emp.department === "RH"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : emp.department === "Commerce"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}
                          >
                            {emp.department}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{emp.position}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                            {formatCurrency(emp.salary, currency)} / mois
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                emp.status === "Actif"
                                  ? "bg-emerald-400"
                                  : emp.status === "En congé"
                                  ? "bg-rose-455"
                                  : "bg-amber-400 animate-pulse"
                              }`}
                            />
                            <span className="font-medium text-slate-200">{emp.status}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Depuis {emp.hireDate}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {emp.skills.split(",").map((skill, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-slate-800 border border-slate-750 text-slate-300 rounded text-[9px] font-mono"
                              >
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-0.5 bg-slate-950/60 px-2 py-1 rounded-lg font-mono font-bold text-slate-300 border border-slate-800">
                            ★ {emp.performanceScore}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        [EMPTY] : Aucun membre trouvé correspondant aux critères.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER HR IA REQUESTS TAB */}
      {activeSubTab === "requests" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <h4 className="text-sm font-semibold text-white tracking-tight">Registre d'Assistance Assistée par I.A.</h4>
            <button
              id="new-request-btn"
              onClick={() => setShowAddReq(true)}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-650/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-300 fill-indigo-300/35" />
              Soumettre une Demande RH (I.A.)
            </button>
          </div>

          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-xs space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-bold text-slate-300 border border-slate-850 shadow-inner">
                      {req.type === "Congé" ? "🌴" : req.type === "Formation" ? "📚" : "⚙"}
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-sm">{req.title}</h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Soumis par <span className="font-semibold font-mono text-slate-300">{req.employeeName}</span> ({req.employeeDepartment}) • {req.dateSubmitted}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {req.status === "Approuvé" && (
                      <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> Approuvé
                      </span>
                    )}
                    {req.status === "Refusé" && (
                      <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                        <XCircle className="w-3 h-3 text-rose-400" /> Refusé
                      </span>
                    )}
                    {req.status === "En attente" && (
                      <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                        <Clock className="w-3 h-3 animate-spin text-amber-400" /> En attente
                      </span>
                    )}
                    {req.status === "Automatisé" && (
                      <span className="p-1 px-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-[10px] font-semibold rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3 text-white fill-white" /> Automatisé
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-950 text-slate-300 rounded-2xl text-xs border border-slate-900/60 shadow-inner">
                  <p className="font-semibold text-slate-400">Détails de la demande :</p>
                  <p className="mt-1 leading-relaxed text-slate-300">{req.description}</p>
                </div>

                {req.automatedResponse && (
                  <div className="p-4 bg-indigo-650/10 rounded-2xl border border-indigo-500/20 text-xs text-indigo-200 space-y-2 relative overflow-hidden">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-bold uppercase tracking-wider text-[9px] font-mono">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      Décision d'assistance Automatique
                    </div>
                    <p className="leading-relaxed text-indigo-100/90 whitespace-pre-wrap font-mono">{req.automatedResponse}</p>
                  </div>
                )}

                {/* manual Overrides for Admins */}
                {req.status === "En attente" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleOverrideStatus(req.id, "Approuvé")}
                      disabled={loading}
                      className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approuver manuellement
                    </button>
                    <button
                      onClick={() => handleOverrideStatus(req.id, "Refusé")}
                      disabled={loading}
                      className="px-3 py-1.5 bg-rose-650 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}

            {requests.length === 0 && (
              <div className="p-12 text-center text-slate-500 bg-slate-900/30 border border-slate-800/80 rounded-2xl shadow-sm font-mono">
                [EMPTY] : Aucune demande au registre pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: ADD EMPLOYEE */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md p-6 space-y-4 text-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 font-sans text-md">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Nouveau Collaborateur
              </h3>
              <button onClick={() => setShowAddEmp(false)} className="text-slate-400 hover:text-white text-sm font-bold font-mono">✕</button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nom Complet</label>
                <input
                  required
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="Guillaume Horaud"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Professionnel</label>
                <input
                  required
                  type="email"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  placeholder="g.horaud@entreprise.com"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Département</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option>Engineering</option>
                    <option>RH</option>
                    <option>Commerce</option>
                    <option>marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Poste d'embauche</label>
                  <input
                    required
                    type="text"
                    value={newEmp.position}
                    onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                    placeholder="Développeur React/Node"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Salaire ({currency}/mensuel)</label>
                  <input
                    required
                    type="number"
                    value={newEmp.salary}
                    onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date d'embauche</label>
                  <input
                    required
                    type="date"
                    value={newEmp.hireDate}
                    onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Mots-clés Compétences (divisés par virgule)</label>
                <input
                  required
                  type="text"
                  value={newEmp.skills}
                  onChange={(e) => setNewEmp({ ...newEmp, skills: e.target.value })}
                  placeholder="React, TypeScript, SQL, Agile"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmp(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-700"
                >
                  {loading ? "Création..." : "Intégrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: SUBMIT REQUEST */}
      {showAddReq && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md p-6 space-y-4 text-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 text-md">
                <Sparkles className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                Soumission Demande IA
              </h3>
              <button onClick={() => setShowAddReq(false)} className="text-slate-400 hover:text-white text-sm font-bold font-mono">✕</button>
            </div>

            <form onSubmit={handleAddRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Collaborateur Émetteur</label>
                <select
                  required
                  value={newReq.employeeId}
                  onChange={(e) => setNewReq({ ...newReq, employeeId: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">Sélectionner l'employé...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Type de demande</label>
                  <select
                    value={newReq.type}
                    onChange={(e) => setNewReq({ ...newReq, type: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option>Congé</option>
                    <option>Formation</option>
                    <option>Evaluation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Objet / Titre</label>
                  <input
                    required
                    type="text"
                    value={newReq.title}
                    onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                    placeholder="e.g., Congé d'été 2 semaines"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Explication détaillée</label>
                <textarea
                  required
                  rows={4}
                  value={newReq.description}
                  onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                  placeholder="Explication claire du besoin. Gemini évaluera l'effet opérationnel et financier..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReq(false)}
                  className="flex-1 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !newReq.employeeId}
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
                >
                  {loading ? "Calcul IA..." : "Évaluer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
