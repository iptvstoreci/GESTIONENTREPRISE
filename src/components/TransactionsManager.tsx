import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Transaction } from "../types.ts";
import { formatCurrency } from "../utils/currency.ts";

interface TransactionsManagerProps {
  transactions: Transaction[];
  token: string;
  onRefresh: () => void;
  currency?: string;
}

export default function TransactionsManager({
  transactions,
  token,
  onRefresh,
  currency = "EUR",
}: TransactionsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({
    type: "Revenu",
    category: "Prestation",
    amount: "1500",
    date: new Date().toISOString().substring(0, 10),
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTx),
      });

      if (!res.ok) {
        throw new Error("Impossible d'enregistrer le flux.");
      }

      setShowAddForm(false);
      setNewTx({
        type: "Revenu",
        category: "Prestation",
        amount: "1500",
        date: new Date().toISOString().substring(0, 10),
        description: "",
      });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet enregistrement ?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div id="transactions-tab" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-sans">Registre des Flux de Trésorerie</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivez les encaissements, décaissements et charges de l'entreprise en temps réel.
          </p>
        </div>

        <button
          id="add-tx-btn"
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-650/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-200" />
          Enregistrer un Flux
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-505/15 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-450" />
          <span>[WARNING] : {error}</span>
        </div>
      )}

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-850 bg-slate-900/60">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Historique des Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold tracking-wider font-mono">
                <th className="p-4">DATE / HEURE</th>
                <th className="p-4">DESCRIPTION</th>
                <th className="p-4">CATÉGORIE</th>
                <th className="p-4">TYPE</th>
                <th className="p-4 text-right">MONTANT</th>
                <th className="p-4 text-center font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition duration-150">
                    <td className="p-4 text-slate-400 font-mono flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {tx.date}
                    </td>
                    <td className="p-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        {tx.description}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-850 border border-slate-800 text-indigo-300 font-semibold rounded text-[9px] font-mono">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${
                          tx.type === "Revenu"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`p-4 text-right font-bold font-mono text-xs ${
                        tx.type === "Revenu" ? "text-emerald-400" : "text-rose-450"
                      }`}
                    >
                      {tx.type === "Revenu" ? "+" : "-"} {formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={loading}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-505 font-mono">
                    [EMPTY] : Aucun flux comptabilisé dans ce registre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL: ENREGISTRER TRANSACTION */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-sm p-6 space-y-4 text-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 text-md">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                Enregistrer un Flux Financier
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white text-sm font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs w-full">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Type de Flux</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: "Revenu", category: "Prestation" })}
                    className={`py-2 rounded-xl border text-center font-bold tracking-tight transition text-[10px] cursor-pointer ${
                      newTx.type === "Revenu"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900/50"
                    }`}
                  >
                    💡 REVENU (Entrée)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: "Dépense", category: "Salaires" })}
                    className={`py-2 rounded-xl border text-center font-bold tracking-tight transition text-[10px] cursor-pointer ${
                      newTx.type === "Dépense"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900/50"
                    }`}
                  >
                    🩸 DÉPENSE (Sortie)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catégorie Comptable</label>
                <select
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 focus:outline-hidden focus:border-indigo-500"
                >
                  {newTx.type === "Revenu" ? (
                    <>
                      <option>Abonnements</option>
                      <option>Prestation</option>
                      <option>Remboursement</option>
                    </>
                  ) : (
                    <>
                      <option>Salaires</option>
                      <option>Marketing</option>
                      <option>Frais Généraux</option>
                      <option>Impôts & Taxes</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Montant ({currency})</label>
                  <input
                    required
                    type="number"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Libellé / Description</label>
                <input
                  required
                  type="text"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  placeholder="Facture CLIENT DELTA ou Loyer Mai..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  {loading ? "Enregistrement..." : "Comptabiliser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
