import React, { useState, useRef, useEffect } from "react";
import { CompanySettings } from "../types.ts";
import { Building2, Save, Sparkles, Sliders, DollarSign, ExternalLink, Globe, Hash, Landmark, Mail, Phone, MapPin, Image } from "lucide-react";

interface SettingsManagerProps {
  settings: CompanySettings;
  token: string | null;
  onRefresh: () => void;
}

export default function SettingsManager({ settings, token, onRefresh }: SettingsManagerProps) {
  const [form, setForm] = useState<CompanySettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Veuillez sélectionner un fichier image valide (PNG, JPG, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("L'image est trop volumineuse (maximum 2 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm((prev) => ({
          ...prev,
          logoUrl: event.target!.result as string,
        }));
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const availableCurrencies = [
    { code: "EUR", name: "Euro (€)", locale: "fr-FR" },
    { code: "USD", name: "Dollar US ($)", locale: "en-US" },
    { code: "GBP", name: "Livre Sterling (£)", locale: "en-GB" },
    { code: "CAD", name: "Dollar Canadien (C$)", locale: "fr-CA" },
    { code: "AUD", name: "Dollar Australien (A$)", locale: "en-AU" },
    { code: "CHF", name: "Franc Suisse (CHF)", locale: "fr-CH" },
    { code: "JPY", name: "Yen Japonais (¥)", locale: "ja-JP" },
    { code: "CNY", name: "Yuan Chinois (¥)", locale: "zh-CN" },
    { code: "XOF", name: "Franc CFA (FCFA)", locale: "fr-WAF" }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/company-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Échec de la sauvegarde des paramètres de l'entreprise.");
      }

      const updated = await response.json();
      setForm(updated);
      setSuccessMsg("Paramètres de l'entreprise et préférence monétaire mis à jour avec succès.");
      onRefresh();
      
      // Auto fadeout success message
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur réseau innatendue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Introduction Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full"></div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Paramétrage Officiel de l’Entreprise</h2>
              <p className="text-slate-400 text-xs mt-1">
                Configurez l'identité légale de votre structure, vos identifiants fiscaux et la devise de référence de votre comptabilité Nexus OS.
              </p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 bg-indigo-950/40 border border-indigo-800/40 text-[10px] font-mono text-indigo-300 rounded-xl leading-none uppercase">
            STRUCTURE_ID: #{form?.id || 1}
          </div>
        </div>
      </div>

      {form && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main profile settings */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Logo de l'entreprise */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Image className="w-4 h-4 text-indigo-400" /> Logo de l'entreprise
              </h3>
              <p className="text-slate-400 text-xs leading-normal font-sans">
                Importez le logo officiel de votre structure (formats PNG, JPG ou SVG, max 2 Mo) ou spécifiez son adresse URL directe. Il s'affichera automatiquement sur l'intégralité de vos documents, factures et devis partagés.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Logo Preview block */}
                <div className="flex flex-col items-center justify-center bg-slate-950 border border-slate-800/60 p-4 rounded-2xl h-36 relative overflow-hidden group">
                  {form.logoUrl ? (
                    <>
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        className="max-h-24 max-w-full object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logoUrl: null })}
                        className="absolute inset-0 bg-slate-950/90 text-rose-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                      >
                        Retirer le logo
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-1.5">
                      <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                      <span className="text-[10px] text-slate-500 font-mono block">Aucun logo défini</span>
                    </div>
                  )}
                </div>

                {/* Upload Zone & URL */}
                <div className="md:col-span-2 space-y-3">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`border border-dashed p-4 rounded-2xl text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center gap-1.5 ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-500/5 text-indigo-300"
                        : "border-slate-800 hover:border-slate-700 hover:bg-slate-950/60 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-xs text-white font-medium font-sans">Déposer une image ou cliquer ici</span>
                    <span className="text-[10px] text-slate-500 font-mono">PNG, Jpeg, SVG - max 2 Mo</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">Ou URL de l'image</span>
                    <input
                      type="text"
                      value={form.logoUrl || ""}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value || null })}
                      placeholder="https://exemple.com/logo.png"
                      className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800/80 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Identity & Legal info block */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-6 shadow-md">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Informations Légales & Coordonnées
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label htmlFor="company-name" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Raison Sociale / Nom d'usage *
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="Ex: Enterprise Core SAS"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="company-email" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Adresse Email Administrative *
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="compta@entreprise.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="company-phone" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Ligne Téléphonique
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-phone"
                      type="text"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <label htmlFor="company-website" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Adresse site Web
                  </label>
                  <div className="relative flex items-center">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-website"
                      type="text"
                      value={form.website || ""}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="www.entreprise.com"
                    />
                  </div>
                </div>

                {/* SIRET */}
                <div className="space-y-1.5">
                  <label htmlFor="company-siret" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Numéro de SIRET / Identification
                  </label>
                  <div className="relative flex items-center">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-siret"
                      type="text"
                      value={form.siret || ""}
                      onChange={(e) => setForm({ ...form, siret: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="123 456 789 00018"
                    />
                  </div>
                </div>

                {/* VAT code */}
                <div className="space-y-1.5">
                  <label htmlFor="company-tva" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Code de TVA Intracommunautaire
                  </label>
                  <div className="relative flex items-center">
                    <Landmark className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-tva"
                      type="text"
                      value={form.tva || ""}
                      onChange={(e) => setForm({ ...form, tva: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="FR 99 123 456 789"
                    />
                  </div>
                </div>

                {/* Capital social */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="company-capital" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Capital Social de l'entreprise
                  </label>
                  <div className="relative flex items-center">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                      id="company-capital"
                      type="text"
                      value={form.capital || ""}
                      onChange={(e) => setForm({ ...form, capital: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                      placeholder="Ex: 50 000€ ou 100 000 $"
                    />
                  </div>
                </div>

                {/* Postal Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="company-address" className="text-[11px] font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                    Adresse Postale / Siège social
                  </label>
                  <div className="relative flex items-start">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <textarea
                      id="company-address"
                      rows={3}
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full bg-slate-950 text-xs text-white pl-10 pr-4 py-2 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none pt-2.5"
                      placeholder="12 Rue de l'I.A. Décisionnelle, 75001 Paris, France"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Sidebar currency select & actions */}
          <div className="space-y-6">
            
            {/* Preferred operating currency */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-400" /> Devise Monétaire Global
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Définissez la monnaie d’échange commerciale d’application pour tous les montants de l’OS (Trésorerie, Salaires, Rentabilité, Fiches de paie, Facturation de tiers et Devis).
              </p>

              <div className="space-y-1.5">
                <label htmlFor="company-currency" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Sélectionner la Devise
                </label>
                <select
                  id="company-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-slate-950 text-xs text-white p-3 rounded-xl border border-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                >
                  {availableCurrencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11px] text-indigo-300 leading-relaxed space-y-2">
                <span className="font-bold text-white block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Application instantanée
                </span>
                Tout changement sera instantanément répercuté sur l’ensemble des fiches clients, de la facturation et l’intégralité des graphiques comptables.
              </div>
            </div>

            {/* Error and Success notifications */}
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-550/20 text-rose-400 text-xs rounded-2xl">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit save button */}
            <button
              id="save-settings-btn"
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-650/15"
            >
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement en cours..." : "Sauvegarder les configurations"}
            </button>

          </div>

        </form>
      )}

    </div>
  );
}
