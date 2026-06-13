import React, { useState, useEffect } from "react";
import { Printer, Download, Copy, Check, FileText, AlertCircle, Sparkles } from "lucide-react";
import { DocumentItem } from "../types.ts";
import { formatCurrency } from "../utils/currency.ts";

interface SharedDoc {
  id: number;
  type: "facture" | "devis";
  number: string;
  contactId: number;
  status: string;
  issueDate: string;
  dueDate: string;
  items: string; // JSON
  taxRate: number;
  totalAmount: number;
  notes?: string | null;
  createdAt?: string | null;
  contactName: string;
  contactCompany?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  contactAddress?: string | null;
}

export default function SharedDocumentView() {
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get share ID from query string
  const shareId = new URLSearchParams(window.location.search).get("share");

  useEffect(() => {
    if (!shareId) {
      setError("Identifiant de document invalide de lien de partage.");
      setLoading(false);
      return;
    }

    const fetchPublicData = async () => {
      try {
        const [docRes, settingsRes] = await Promise.all([
          fetch(`/api/public/documents/${shareId}`),
          fetch(`/api/public/company-settings`)
        ]);

        if (!docRes.ok) {
          throw new Error("Ce document n'existe pas ou n'est plus accessible publiquement.");
        }

        const docData = await docRes.json();
        setDoc(docData);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setCompanySettings(settingsData);
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors de la récupération publique de la pièce.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [shareId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type === "facture" ? "facture" : "devis"}_${doc.number}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-xs tracking-wider animate-pulse uppercase">
            [CHARGEMENT SÉCURISÉ DU DOCUMENT ENTREPRISE...]
          </p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="inline-flex p-3 bg-rose-500/10 text-rose-450 rounded-2xl border border-rose-500/25">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Accès Impossible</h2>
          <p className="text-slate-400 text-sm">
            {error || "Le document est indisponible ou le jeton de partage public a expiré."}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-block px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Retour à l'accueil SaaS
            </a>
          </div>
        </div>
      </div>
    );
  }

  let itemsArr: DocumentItem[] = [];
  try {
    itemsArr = JSON.parse(doc.items);
  } catch (e) {
    itemsArr = [];
  }

  const subtotal = itemsArr.reduce((s, i) => s + i.total, 0);
  const taxAmount = Math.round((subtotal * doc.taxRate) / 100);
  const currency = companySettings?.currency || "EUR";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 overflow-y-auto selection:bg-indigo-505/30">
      
      {/* HEADER CONTROLS (Floating Bento Bar) */}
      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl z-10 mb-8 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                {doc.type === "facture" ? "Facture Officielle" : "Devis / Proposition commerciale"}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md uppercase border ${
                doc.status === "Payé" 
                  ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
                  : doc.status === "Envoyé"
                  ? "bg-indigo-500/10 text-indigo-450 border-indigo-500/20"
                  : doc.status === "Brouillon"
                  ? "bg-slate-100/10 text-slate-400 border-slate-100/20"
                  : "bg-amber-500/10 text-amber-450 border-amber-500/20"
              }`}>
                {doc.status}
              </span>
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight">Pièce #{doc.number}</h1>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> imprimer / PDF
          </button>
          
          <button
            onClick={handleDownloadJSON}
            title="Exporter en données JSON structurées"
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 text-xs rounded-xl flex items-center justify-center transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLink}
            title="Copier le lien public"
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 text-xs rounded-xl flex items-center justify-center transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* QUICK INSTRUCTION ALERT (For saving to PDF using standard browsers) */}
      <div className="w-full max-w-2xl bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-xl text-xs text-indigo-300/90 flex gap-2.5 items-start no-print mb-6">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Astuce d'enregistrement :</span> Pour sauvegarder ce document au format PDF natif impeccablement mis en page A4, cliquez sur le bouton <span className="font-semibold text-white">"Imprimer / PDF"</span> ci-dessus puis choisissez l'option <span className="font-semibold text-white">"Enregistrer au format PDF"</span> dans le panneau d'impression.
        </div>
      </div>

      {/* A4 PRINT CONTAINER SHEET (Elegantly center alignment mimicking professional PDF preview sheets) */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl p-1 shadow-2xl mb-12">
        <div id="printable-area" className="bg-white text-slate-900 p-8 md:p-12 rounded-xl text-xs font-sans leading-relaxed space-y-8 shadow-inner">
          
           {/* Invoice Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              {companySettings?.logoUrl && (
                <div className="mb-2">
                  <img
                    src={companySettings.logoUrl}
                    alt="Logo de l'entreprise"
                    className="max-h-12 max-w-[200px] object-contain object-left"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase border-b pb-1">
                {companySettings?.name || "ENTERPRISE CORE SAS"}
              </h1>
              <p className="text-[10px] text-slate-500 font-mono mt-1.5 leading-normal">
                {companySettings?.address ? (
                  companySettings.address.split("\n").map((line: string, idx: number) => (
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
                {companySettings?.siret && <>SIRET : {companySettings.siret}<br /></>}
                {companySettings?.tva && <>TVA : {companySettings.tva}<br /></>}
                Email : {companySettings?.email || "contact@entreprise-core.com"}
              </p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                {doc.type === "facture" ? "FACTURE" : "DEVIS PROPOSITION"}
              </span>
              <div className="mt-2 text-md font-bold text-slate-900 font-mono">
                #{doc.number}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 space-y-0.5 leading-normal">
                <div>Émission : {doc.issueDate}</div>
                <div>Échéance : {doc.dueDate}</div>
              </div>
            </div>
          </div>

          {/* Recipient details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                Émetteur
              </span>
              <span className="font-bold text-slate-950">{companySettings?.name || "Enterprise Core Solutions"}</span>
              <p className="text-[10px] text-slate-550 mt-1 leading-normal">
                {companySettings?.address ? (
                  companySettings.address.split("\n").map((line: string, idx: number) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    Service Facturation & Gestion<br />
                    Paris Ier Ingress Section
                  </>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                Destinataire / Tiers
              </span>
              <span className="font-bold text-slate-950">{doc.contactName}</span>
              {doc.contactCompany && (
                <div className="text-slate-700 font-semibold">{doc.contactCompany}</div>
              )}
              <p className="text-[10px] text-slate-550 mt-1 leading-normal">
                {doc.contactAddress && <>{doc.contactAddress}<br /></>}
                Email : {doc.contactEmail}
                {doc.contactPhone && <><br />Tél : {doc.contactPhone}</>}
              </p>
            </div>
          </div>

          {/* Items Grid rendering */}
          <div className="space-y-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-[10px] text-slate-400 font-bold tracking-wider font-mono">
                  <th className="py-2">DÉSIGNATION / PRESTATION</th>
                  <th className="py-2 text-center" style={{ width: "80px" }}>QUANTITÉ</th>
                  <th className="py-2 text-right" style={{ width: "120px" }}>TARIF UNITAIRE HT</th>
                  <th className="py-2 text-right" style={{ width: "125px" }}>TOTAL COMPTE HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsArr.map((line, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-950">{line.description}</div>
                    </td>
                    <td className="py-2.5 text-center font-mono">{line.quantity}</td>
                    <td className="py-2.5 text-right font-mono">{formatCurrency(line.price, currency)}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-slate-950">
                      {formatCurrency(line.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summaries block */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-sm space-y-2 pt-2 border-t border-slate-200 text-[11px]">
              <div className="flex justify-between text-slate-600 font-mono">
                <span>Total Net Hors Taxes (HT) :</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-mono">
                <span>Taxe sur la Valeur Ajoutée (TVA {doc.taxRate}%) :</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-slate-300 font-bold text-slate-950 text-sm">
                <span>TOTAL TTC À PAYER :</span>
                <span className="font-mono text-slate-950">{formatCurrency(doc.totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Extra notes / legal terms */}
          {doc.notes && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-550 italic leading-normal">
              <span className="font-bold text-slate-700 not-italic block mb-1">Informations Complémentaires</span>
              {doc.notes}
            </div>
          )}

          {/* Printable footer */}
          <div className="text-center text-[9px] text-slate-400 font-mono pt-8 border-t border-dashed border-slate-200">
            {companySettings ? (
              <>
                {companySettings.name}
                {companySettings.capital && <> - Capital social de {companySettings.capital}</>}
                {companySettings.siret && <> - SIRET {companySettings.siret}</>}
                {companySettings.website && <> - {companySettings.website}</>}
              </>
            ) : (
              "Enterprise Core SAS - Capital social de 50 000€ - RCS Paris B 123 456 789 - www.entreprise-core.com"
            )}
            <br />
            <span className="no-screen mt-1 block">Document certifié conforme, généré par signature numérique SaaS sécurisée.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
