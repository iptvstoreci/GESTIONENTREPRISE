import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  FileText,
  Sparkles,
  Clock,
  Printer,
  X,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Receipt,
  Download,
  Percent,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { Contact, Document, DocumentItem, CompanySettings } from "../types.ts";
import { formatCurrency } from "../utils/currency.ts";

interface BillingManagerProps {
  contacts: Contact[];
  documents: Document[];
  token: string | null;
  onRefresh: () => void;
  currency?: string;
  companyConfig?: CompanySettings | null;
}

export default function BillingManager({
  contacts,
  documents,
  token,
  onRefresh,
  currency = "EUR",
  companyConfig = null,
}: BillingManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"documents" | "contacts">("documents");
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "facture" | "devis">("all");
  const [docStatusFilter, setDocStatusFilter] = useState<"all" | "Brouillon" | "Envoyé" | "Payé" | "Refusé" | "Expiré">("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<"all" | "client" | "fournisseur">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals and Forms
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    type: "client" as "client" | "fournisseur",
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });

  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  // Share & AI Companion states
  const [showShareSection, setShowShareSection] = useState(false);
  const [aiShareTone, setAiShareTone] = useState<"pro" | "amical" | "urgent" | "court">("pro");
  const [aiShareMsg, setAiShareMsg] = useState("");
  const [loadingAiShare, setLoadingAiShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAiMsg, setCopiedAiMsg] = useState(false);

  const generateAiShareMsg = async (docId: number, targetTone?: "pro" | "amical" | "urgent" | "court") => {
    setLoadingAiShare(true);
    const selectedTone = targetTone || aiShareTone;
    try {
      const response = await fetch(`/api/documents/${docId}/ai-share-msg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tone: selectedTone }),
      });
      if (!response.ok) {
        throw new Error("Impossible de générer le message d'accompagnement.");
      }
      const data = await response.json();
      const shareUrl = window.location.origin + "/?share=" + docId;
      let finalMsg = data.message;
      if (finalMsg.includes("[Insérer le lien ici]")) {
        finalMsg = finalMsg.replaceAll("[Insérer le lien ici]", shareUrl);
      } else if (finalMsg.includes("[Lien]")) {
        finalMsg = finalMsg.replaceAll("[Lien]", shareUrl);
      } else {
        finalMsg += `\n\n👉 Consulter en ligne : ${shareUrl}`;
      }
      setAiShareMsg(finalMsg);
    } catch (err: any) {
      console.error(err);
      const shareUrl = window.location.origin + "/?share=" + docId;
      setAiShareMsg(`Bonjour,\n\nVeuillez trouver ci-joint notre document au lien suivant :\n👉 ${shareUrl}\n\nCordialement.`);
    } finally {
      setLoadingAiShare(false);
    }
  };

  // Document Editor Form State
  const [docForm, setDocForm] = useState({
    type: "facture" as "facture" | "devis",
    number: "",
    contactId: "",
    status: "Brouillon" as "Brouillon" | "Envoyé" | "Payé" | "Refusé" | "Expiré",
    issueDate: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    items: [] as DocumentItem[],
    taxRate: 20,
    notes: "",
  });

  // Filters
  const filteredContacts = contacts.filter((c) => {
    const matchesType = contactTypeFilter === "all" || c.type === contactTypeFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredDocs = documents.filter((d) => {
    const matchesType = docTypeFilter === "all" || d.type === docTypeFilter;
    const matchesStatus = docStatusFilter === "all" || d.status === docStatusFilter;
    const clientName = d.contactName || "";
    const clientCompany = d.contactCompany || "";
    const matchesSearch =
      d.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientCompany.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Total invoice & subtotal calculations
  const calculateDocTotals = (items: DocumentItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  // Contacts handlers
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      type: "client",
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
    });
    setShowContactModal(true);
  };

  const handleOpenEditContact = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(c);
    setContactForm({
      type: c.type,
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      company: c.company || "",
      address: c.address || "",
    });
    setShowContactModal(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    const url = editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts";
    const method = editingContact ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Une erreur s'est produite avec le contact.");
      }

      onRefresh();
      setShowContactModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ? Tous ses devis et factures associés seront également supprimés.")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Impossible de supprimer le contact.");
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Document Editor line item handlers
  const handleAddLineItem = () => {
    const newItem: DocumentItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: "",
      quantity: 1,
      price: 0,
      total: 0,
    };
    setDocForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveLineItem = (id: string) => {
    setDocForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleLineItemChange = (id: string, field: "description" | "quantity" | "price", val: any) => {
    setDocForm((prev) => {
      const updatedLines = prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          // Auto-compute line total
          if (field === "quantity" || field === "price") {
            const qty = field === "quantity" ? Number(val) : item.quantity;
            const price = field === "price" ? Number(val) : item.price;
            updated.total = Math.round(qty * price * 100) / 100;
          }
          return updated;
        }
        return item;
      });
      return { ...prev, items: updatedLines };
    });
  };

  // Document Handlers
  const generateSuggestedNumber = (type: "facture" | "devis") => {
    const prefix = type === "facture" ? "FAC" : "DEV";
    const year = new Date().getFullYear();
    const recordsOfType = documents.filter((d) => d.type === type);
    const count = recordsOfType.length + 1;
    const numStr = String(count).padStart(4, "0");
    return `${prefix}-${year}-${numStr}`;
  };

  const handleOpenAddDoc = (type: "facture" | "devis") => {
    setEditingDoc(null);
    const suggestedNo = generateSuggestedNumber(type);
    setDocForm({
      type,
      number: suggestedNo,
      contactId: contacts.length > 0 ? String(contacts[0].id) : "",
      status: "Brouillon",
      issueDate: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      items: [
        {
          id: "1",
          description: type === "facture" ? "Prestation de service de développement" : "Proposition de projet applicatif",
          quantity: 1,
          price: 500,
          total: 500,
        },
      ],
      taxRate: 20,
      notes: type === "facture" ? "Règlement par virement bancaire sous 30 jours." : "Devis valable 3 mois.",
    });
    setShowDocModal(true);
  };

  const handleOpenEditDoc = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDoc(doc);
    let itemsParsed: DocumentItem[] = [];
    try {
      itemsParsed = JSON.parse(doc.items);
    } catch (err) {
      itemsParsed = [];
    }

    setDocForm({
      type: doc.type,
      number: doc.number,
      contactId: String(doc.contactId),
      status: doc.status,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      items: itemsParsed,
      taxRate: doc.taxRate,
      notes: doc.notes || "",
    });
    setShowDocModal(true);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!docForm.contactId) {
      alert("Veuillez sélectionner un client ou fournisseur.");
      return;
    }
    if (docForm.items.length === 0) {
      alert("Veuillez ajouter au moins une ligne de prestation.");
      return;
    }

    setLoading(true);
    setError(null);

    const { total } = calculateDocTotals(docForm.items, docForm.taxRate);
    const payload = {
      ...docForm,
      totalAmount: total,
    };

    const url = editingDoc ? `/api/documents/${editingDoc.id}` : "/api/documents";
    const method = editingDoc ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Une erreur s'est produite lors de l'enregistrement.");
      }

      onRefresh();
      setShowDocModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Voulez-vous vraiment supprimer cette pièce comptable (facture ou devis) ? Cette action est irréversible.")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Impossible de supprimer la facture/devis.");
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDoc = () => {
    window.print();
  };

  return (
    <div id="billing-tab" className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-sans">
            Facturation & Relations Tiers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Éditez vos factures et devis commerciaux, configurez les fiches clients ou fournisseurs.
          </p>
        </div>

        {/* NAVIGATION SUB-TABS */}
        <div className="bg-slate-900 border border-slate-800/80 p-1 rounded-2xl flex self-start">
          <button
            onClick={() => {
              setActiveSubTab("documents");
              setSearchTerm("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeSubTab === "documents"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Factures & Devis
            </div>
          </button>
          <button
            onClick={() => {
              setActiveSubTab("contacts");
              setSearchTerm("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeSubTab === "contacts"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Clients & Fournisseurs
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>[WARNING] : {error}</span>
        </div>
      )}

      {/* RENDER DOCUMENTS TAB */}
      {activeSubTab === "documents" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une pièce..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-slate-700 w-48 sm:w-64"
                />
              </div>

              {/* Type Filter */}
              <select
                value={docTypeFilter}
                onChange={(e: any) => setDocTypeFilter(e.target.value)}
                className="p-1 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-hidden focus:border-slate-750"
              >
                <option value="all">Tout type</option>
                <option value="facture">Facture</option>
                <option value="devis">Devis</option>
              </select>

              {/* Status Filter */}
              <select
                value={docStatusFilter}
                onChange={(e: any) => setDocStatusFilter(e.target.value)}
                className="p-1 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-hidden focus:border-slate-750"
              >
                <option value="all">Tout statut</option>
                <option value="Brouillon">Brouillon</option>
                <option value="Envoyé">Envoyé</option>
                <option value="Payé">Payé</option>
                <option value="Refusé">Refusé</option>
                <option value="Expiré">Expiré</option>
              </select>
            </div>

            {/* Creation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenAddDoc("devis")}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau Devis
              </button>
              <button
                onClick={() => handleOpenAddDoc("facture")}
                className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-650/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-200" />
                Nouvelle Facture
              </button>
            </div>
          </div>

          {/* Documents SQL Table */}
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold tracking-wider font-mono">
                    <th className="p-4">NUMÉRO</th>
                    <th className="p-4">TYPE</th>
                    <th className="p-4">TIERS / ÉMETTEUR</th>
                    <th className="p-4">DATE D'ÉMISSION</th>
                    <th className="p-4">ÉCHÉANCE</th>
                    <th className="p-4 text-right">MONTANT TTC</th>
                    <th className="p-4 text-center">STATUT</th>
                    <th className="p-4 text-center font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setViewingDoc(doc)}
                        className="hover:bg-slate-900/40 transition duration-150 cursor-pointer"
                      >
                        <td className="p-4 font-mono font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {doc.number}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${
                              doc.type === "facture"
                                ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                            }`}
                          >
                            {doc.type === "facture" ? "Facture" : "Devis"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{doc.contactName}</div>
                          {doc.contactCompany && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {doc.contactCompany}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">{doc.issueDate}</td>
                        <td className="p-4 text-slate-400 font-mono">{doc.dueDate}</td>
                        <td className="p-4 text-right font-bold font-mono text-white">
                          {formatCurrency(doc.totalAmount, currency)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              doc.status === "Payé"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : doc.status === "Envoyé"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : doc.status === "Refusé"
                                ? "bg-rose-500/10 text-rose-450 border-rose-500/20"
                                : doc.status === "Expiré"
                                ? "bg-amber-500/10 text-amber-500/20 border-amber-500/20"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setViewingDoc(doc)}
                            className="p-1 px-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[10px] font-semibold tracking-tight cursor-pointer"
                            title="Aperçu avant impression"
                          >
                            Détails
                          </button>
                          <button
                            onClick={(e) => handleOpenEditDoc(doc, e)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDocDelete(doc.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-mono">
                        [EMPTY] : Aucun document commercial comptabilisé pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER CONTACTS TAB */}
      {activeSubTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="flex flex-1 max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher dans l'annuaire (nom, email, société)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-slate-700"
                />
              </div>

              <select
                value={contactTypeFilter}
                onChange={(e: any) => setContactTypeFilter(e.target.value)}
                className="p-1 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-hidden focus:border-slate-750"
              >
                <option value="all">Tout relationnel</option>
                <option value="client">Clients uniquement</option>
                <option value="fournisseur">Fournisseurs uniquement</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddContact}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-650/10 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-200" />
              Créer un Tiers (Fiche)
            </button>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800/80 hover:border-slate-700 transition relative flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-bold text-slate-350 border border-slate-800 shadow-inner">
                          {contact.company ? "🏢" : "👤"}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{contact.name}</h4>
                          {contact.company && (
                            <p className="text-xs text-indigo-400 font-mono tracking-wide mt-0.5">
                              {contact.company}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border tracking-wider ${
                          contact.type === "client"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {contact.type}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 text-[11px] text-slate-450 font-mono">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-3 flex justify-end gap-1.5">
                    <button
                      onClick={(e) => handleOpenEditContact(contact, e)}
                      className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-200 text-xs rounded-xl border border-slate-850 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Edit className="w-3 h-3 text-slate-400" /> Modifier
                    </button>
                    <button
                      onClick={(e) => handleContactDelete(contact.id, e)}
                      className="p-1.5 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900/30 border border-slate-800/80 rounded-3xl font-mono">
                [EMPTY_DIRECTORY] : Aucun tiers trouvé dans l'annuaire correspondant.
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: CREATE OR UPDATE CONTACT */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md p-6 space-y-4 text-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 font-sans text-md">
                <Building2 className="w-5 h-5 text-indigo-400" />
                {editingContact ? "Modifier la Fiche Tiers" : "Nouvelle Fiche Tiers"}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Type de Tiers</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactForm({ ...contactForm, type: "client" })}
                    className={`py-2 rounded-xl border text-center font-bold tracking-tight transition text-[10px] cursor-pointer ${
                      contactForm.type === "client"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900/50"
                    }`}
                  >
                    👤 CLIENT (Entrant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactForm({ ...contactForm, type: "fournisseur" })}
                    className={`py-2 rounded-xl border text-center font-bold tracking-tight transition text-[10px] cursor-pointer ${
                      contactForm.type === "fournisseur"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900/50"
                    }`}
                  >
                    🏢 FOURNISSEUR (Sortant)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nom du contact principal</label>
                <input
                  required
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Jean Dupont"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nom de l'entreprise (Facultatif)</label>
                <input
                  type="text"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  placeholder="E.g. Acme Corporation SAS"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="contact@acme.com"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Adresse postale complète</label>
                <textarea
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  placeholder="12 Avenue des Champs-Élysées, 75008 Paris"
                  rows={2}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CREATE OR UPDATE BILLING DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-55 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl p-6 space-y-4 text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 font-sans text-md">
                <Receipt className="w-5 h-5 text-indigo-400" />
                {editingDoc ? `Modifier ${docForm.type === "facture" ? "Facture" : "Devis"}` : `Éditer un nouveau ${docForm.type === "facture" ? "Facture" : "Devis"}`}
              </h3>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold font-mono"
              >
                ✕
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-550/20 rounded-2xl font-mono text-xs">
                [BLOCKED] : Vous devez d'abord créer au moins une fiche de tiers (client ou fournisseur) dans l'onglet "Clients & Fournisseurs" avant d'émettre des devis ou factures.
              </div>
            ) : (
              <form onSubmit={handleDocSubmit} className="space-y-4 text-xs w-full">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Type de Document</label>
                    <select
                      value={docForm.type}
                      onChange={(e: any) => {
                        const newType = e.target.value;
                        const suggestedNo = generateSuggestedNumber(newType);
                        setDocForm({ ...docForm, type: newType, number: suggestedNo });
                      }}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="facture">Facture</option>
                      <option value="devis">Devis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Numéro de pièce</label>
                    <input
                      required
                      type="text"
                      value={docForm.number}
                      onChange={(e) => setDocForm({ ...docForm, number: e.target.value })}
                      placeholder="FAC-2026-0001"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Statut d'encaissement</label>
                    <select
                      value={docForm.status}
                      onChange={(e: any) => setDocForm({ ...docForm, status: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="Brouillon">Brouillon</option>
                      <option value="Envoyé">Envoyé</option>
                      <option value="Payé">Payé</option>
                      <option value="Refusé">Refusé</option>
                      <option value="Expiré">Expiré</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-slate-400 font-semibold mb-1">Destinataire (Tiers)</label>
                    <select
                      required
                      value={docForm.contactId}
                      onChange={(e) => setDocForm({ ...docForm, contactId: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="">Sélectionner une fiche...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company ? `[${c.type.toUpperCase()}] ${c.company}` : `[${c.type.toUpperCase()}] ${c.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 font-mono">Date d'Émission</label>
                    <input
                      required
                      type="date"
                      value={docForm.issueDate}
                      onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 font-mono">Date d'Échéance</label>
                    <input
                      required
                      type="date"
                      value={docForm.dueDate}
                      onChange={(e) => setDocForm({ ...docForm, dueDate: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* dynamic items creator */}
                <div className="space-y-2 border-t border-slate-850 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Lignes de la Facture</span>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ajouter une ligne
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                    {docForm.items.map((line, idx) => (
                      <div key={line.id} className="flex gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-900">
                        <span className="text-[10px] text-slate-500 font-mono w-4 text-center">{idx + 1}</span>
                        <input
                          required
                          type="text"
                          value={line.description}
                          placeholder="Description de la prestation..."
                          onChange={(e) => handleLineItemChange(line.id, "description", e.target.value)}
                          className="flex-1 p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        />
                        <input
                          required
                          type="number"
                          min="1"
                          style={{ width: "60px" }}
                          value={line.quantity}
                          onChange={(e) => handleLineItemChange(line.id, "quantity", e.target.value)}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-center font-mono"
                        />
                        <input
                          required
                          type="number"
                          min="0"
                          style={{ width: "100px" }}
                          value={line.price}
                          placeholder="Tarif HT"
                          onChange={(e) => handleLineItemChange(line.id, "price", e.target.value)}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-center font-mono"
                        />
                        <span className="w-20 text-right font-bold text-slate-300 font-mono text-[11px] pr-1">
                          {formatCurrency(line.total, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(line.id)}
                          className="p-1.5 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {docForm.items.length === 0 && (
                      <div className="text-center py-6 text-slate-500 font-mono italic">[WARNING] : Aucune ligne de prestation saisie. S'il vous plaît cliquez sur ajouter.</div>
                    )}
                  </div>
                </div>

                {/* Subtotals column */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850 pt-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Taxes de T.V.A (%)</label>
                    <select
                      value={docForm.taxRate}
                      onChange={(e: any) => setDocForm({ ...docForm, taxRate: parseFloat(e.target.value) })}
                      className="w-32 p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono"
                    >
                      <option value="20">20.0% (TVA normale)</option>
                      <option value="10">10.0% (Prestation inter)</option>
                      <option value="5.5">5.5% (TVA réduite)</option>
                      <option value="0">0.0% (Franchise/Exonéré)</option>
                    </select>
                    <textarea
                      value={docForm.notes}
                      onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                      placeholder="Commentaires, coordonnées bancaires de virement, ou conditions de validité du devis..."
                      rows={2}
                      className="w-full mt-2 p-2 bg-slate-950 border border-slate-800 rounded-xl text-white resize-none"
                    />
                  </div>

                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center text-slate-400 font-mono">
                      <span>Sous-Total HT :</span>
                      <span>{formatCurrency(calculateDocTotals(docForm.items, docForm.taxRate).subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-450 font-mono">
                      <span>T.V.A ({docForm.taxRate}%) :</span>
                      <span>{formatCurrency(calculateDocTotals(docForm.items, docForm.taxRate).taxAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-850 pt-2 font-sans font-bold text-white text-sm">
                      <span className="text-sm">TOTAL TTC :</span>
                      <span className="font-mono text-indigo-400 text-md">
                        {formatCurrency(calculateDocTotals(docForm.items, docForm.taxRate).total, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDocModal(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-750 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-12 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ paddingTop: "10px", paddingBottom: "10px" }}
                  >
                    {loading ? "Enregistrement..." : "Enregistrer la pièce"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: INTERACTIVE DETAILED PRINT VIEW */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-55 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl p-6 space-y-6 text-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 no-print">
              <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                [VISUALISATION DOCUMENT]
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const nextVal = !showShareSection;
                    setShowShareSection(nextVal);
                    if (nextVal && !aiShareMsg) {
                      generateAiShareMsg(viewingDoc.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer border ${
                    showShareSection
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 hover:bg-slate-850 text-slate-200 border-slate-800'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" /> Partager
                </button>

                <button
                  onClick={handlePrintDoc}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
                <button
                  onClick={() => {
                    setViewingDoc(null);
                    setShowShareSection(false);
                    setAiShareMsg("");
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PUBLIC SHARE & AI MESSAGE PANEL */}
            {showShareSection && (
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 space-y-4 no-print text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-indigo-400" /> Lien public de consultation
                    </h3>
                    <p className="text-xs text-slate-450 mt-0.5">Permet à vos clients de consulter et enregistrer cette pièce.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-1.5 rounded-xl w-full sm:w-auto">
                    <span className="text-[10px] font-mono text-slate-450 truncate max-w-[200px]" title={`${window.location.origin}/?share=${viewingDoc.id}`}>
                      {window.location.origin}/?share={viewingDoc.id}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?share=${viewingDoc.id}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold cursor-pointer shrink-0 font-mono"
                    >
                      {copiedLink ? "Copié !" : "Copier"}
                    </button>
                  </div>
                </div>

                {/* AI MAIL RE-WRITER */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Message d'accompagnement IA
                    </h4>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Ton :</span>
                      <select
                        value={aiShareTone}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setAiShareTone(val);
                          generateAiShareMsg(viewingDoc.id, val);
                        }}
                        className="p-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-medium"
                      >
                        <option value="pro">💼 Professionnel</option>
                        <option value="amical">🤝 Amical</option>
                        <option value="urgent">⏳ urgent / Relance</option>
                        <option value="court">💬 court / SMS</option>
                      </select>
                    </div>
                  </div>

                  {loadingAiShare ? (
                    <div className="bg-slate-900 p-5 rounded-xl border border-slate-850 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 animate-pulse uppercase">[L'IA RÉSIGE LE TEXTE EN COURS...]</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <textarea
                          value={aiShareMsg}
                          onChange={(e) => setAiShareMsg(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-900 text-xs text-slate-200 p-3.5 rounded-xl border border-slate-800 font-sans focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                          placeholder="Message généré par l'IA..."
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiShareMsg);
                            setCopiedAiMsg(true);
                            setTimeout(() => setCopiedAiMsg(false), 2000);
                          }}
                          className="absolute bottom-3 right-3 p-1.5 px-3 bg-indigo-650/80 hover:bg-indigo-650 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition"
                        >
                          {copiedAiMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedAiMsg ? "Copié !" : "Copier le texte"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium italic">
                        💡 Copiez ce message et collez-le dans vos courriels ou canaux SMS/WhatsApp pour l'envoyer directement à votre client.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* A4 PRINT CONTAINER SHEET (Sized elegantly) */}
            <div id="printable-area" className="bg-white text-slate-900 p-8 rounded-2xl shadow-inner border border-slate-200 text-xs font-sans leading-relaxed space-y-8">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  {companyConfig?.logoUrl && (
                    <div className="mb-2">
                      <img
                        src={companyConfig.logoUrl}
                        alt="Logo de l'entreprise"
                        className="max-h-12 max-w-[200px] object-contain object-left"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 border-b pb-1">
                    {companyConfig?.name || "ENTERPRISE CORE SAS"}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5 leading-normal">
                    {companyConfig?.address ? (
                      companyConfig.address.split("\n").map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))
                    ) : (
                      <>
                        12 Rue de l'I.A. Décisionnelle<br />
                        75001 Paris, France<br />
                      </>
                    )}
                    {companyConfig?.siret && <>SIRET : {companyConfig.siret}<br /></>}
                    {companyConfig?.tva && <>TVA : {companyConfig.tva}<br /></>}
                    Email : {companyConfig?.email || "contact@entreprise-core.com"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                    {viewingDoc.type === "facture" ? "FACTURE" : "DEVIS PROPOSITION"}
                  </span>
                  <div className="mt-2 text-md font-bold text-slate-900 font-mono">
                    #{viewingDoc.number}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 space-y-0.5">
                    <div>Émission : {viewingDoc.issueDate}</div>
                    <div>Échéance : {viewingDoc.dueDate}</div>
                  </div>
                </div>
              </div>

              {/* Recipient details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                    Émetteur
                  </span>
                  <span className="font-bold text-slate-950">{companyConfig?.name || "Enterprise Core Solutions"}</span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {companyConfig?.address ? (
                      companyConfig.address.split("\n").map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))
                    ) : (
                      <>
                        Comptabilité Clientèle<br />
                        Paris Ier Ingress Section
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                    Destinataire / Tiers
                  </span>
                  <span className="font-bold text-slate-950">{viewingDoc.contactName}</span>
                  {viewingDoc.contactCompany && (
                    <div className="text-slate-700 font-semibold">{viewingDoc.contactCompany}</div>
                  )}
                  {(() => {
                    const cRecord = contacts.find((ct) => ct.id === viewingDoc.contactId);
                    if (cRecord) {
                      return (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {cRecord.address && <>{cRecord.address}<br /></>}
                          Email : {cRecord.email}
                          {cRecord.phone && <><br />Tél : {cRecord.phone}</>}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Items Grid rendering */}
              <div className="space-y-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-[10px] text-slate-400 font-bold tracking-wider font-mono">
                      <th className="py-2">SÉLECTION PRESTATION ARTICLE</th>
                      <th className="py-2 text-center" style={{ width: "80px" }}>QUANTITÉ</th>
                      <th className="py-2 text-right" style={{ width: "120px" }}>TARIF UNITAIRE HT</th>
                      <th className="py-2 text-right" style={{ width: "125px" }}>TOTAL COMPLE HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      let itemsArr: DocumentItem[] = [];
                      try {
                        itemsArr = JSON.parse(viewingDoc.items);
                      } catch (e) {
                        itemsArr = [];
                      }

                      return itemsArr.map((line, idx) => (
                        <tr key={idx} className="text-slate-800">
                          <td className="py-2.5">
                            <div className="font-semibold text-slate-950">{line.description}</div>
                          </td>
                          <td className="py-2.5 text-center font-mono">{line.quantity}</td>
                          <td className="py-2.5 text-right font-mono">{formatCurrency(line.price, currency)}</td>
                          <td className="py-2.5 text-right font-strong font-mono font-semibold text-slate-950">
                            {formatCurrency(line.total, currency)}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Financial Summaries block */}
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-sm space-y-2 pt-2 border-t border-slate-200 text-[11px]">
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Total Net Hors Taxes (HT) :</span>
                    <span>
                      {(() => {
                        let itemsArr: DocumentItem[] = [];
                        try {
                          itemsArr = JSON.parse(viewingDoc.items);
                        } catch (e) {}
                        const sub = itemsArr.reduce((s, i) => s + i.total, 0);
                        return formatCurrency(sub, currency);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-mono">
                    <span>Taxe sur la Valeur Ajoutée (TVA {viewingDoc.taxRate}%) :</span>
                    <span>
                      {(() => {
                        let itemsArr: DocumentItem[] = [];
                        try {
                          itemsArr = JSON.parse(viewingDoc.items);
                        } catch (e) {}
                        const sub = itemsArr.reduce((s, i) => s + i.total, 0);
                        const tax = Math.round((sub * viewingDoc.taxRate) / 100);
                        return formatCurrency(tax, currency);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-350 font-bold text-slate-950 text-sm">
                    <span>TOTAL TTC À PAYER :</span>
                    <span className="font-mono">{formatCurrency(viewingDoc.totalAmount, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Extra notes / legal terms */}
              {viewingDoc.notes && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-550 italic font-medium">
                  <span className="font-bold text-slate-700 not-italic block mb-1">Informations Complémentaires</span>
                  {viewingDoc.notes}
                </div>
              )}

              {/* Printable footer */}
              <div className="text-center text-[9px] text-slate-400 font-mono pt-8 border-t border-dashed border-slate-200 no-screen">
                Enterprise Core SAS - Capital social de 50 000€ - RCS Paris B 123 456 789
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
