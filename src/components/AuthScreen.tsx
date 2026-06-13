import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase.ts";
import { Building2, ShieldCheck, Waves, Users, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (token: string, userProfile: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      
      // Sync user profile on backend
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Erreur de synchronisation du compte.");
      }

      const syncResult = await res.json();
      onLoginSuccess(token, syncResult.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossible de se connecter avec Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    // Instant developer bypass using our secure demo tokens
    setTimeout(() => {
      onLoginSuccess("DEMO_TOKEN", {
        uid: "demo_admin_uid_2026",
        email: "demo.admin@entreprise.com",
        name: "Administrateur Démo",
        role: "admin",
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div id="auth-screen" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl border border-slate-800/80 overflow-hidden animate-fade-in">
        
        {/* Banner with modern identity branding pattern */}
        <div className="bg-slate-950 text-white p-8 text-center relative overflow-hidden border-b border-slate-800/80">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-sky-500/5 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">Enterprise Core</h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              SaaS unifié de gestion d'entreprise, tableaux analytiques et automatisation RH intelligente.
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-505/15 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-start gap-2 font-mono">
              <span className="font-bold shrink-0">[ERROR] :</span> <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-200 rounded-xl transition font-semibold text-xs shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.317 2.15 15.485 1 12.24 1A11 11 0 0 0 1.24 12a11 11 0 0 0 11 11c5.73 0 9.553-4.004 9.553-9.715 0-.65-.07-1.15-.157-1.428H12.24z"
                />
              </svg>
              {loading ? "Connexion..." : "Se connecter avec Google"}
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-850" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 font-mono font-bold">OU</span>
            </div>

            <button
              id="demo-login-btn"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition font-semibold text-xs shadow-md shadow-indigo-650/10 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-300 fill-indigo-300/25" />
              {loading ? "Chargement de la démo..." : "Lancer une Démo Express"}
            </button>
          </div>

          <div className="border-t border-slate-850 pt-6 space-y-3">
            <div className="flex items-center gap-3 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs">
                Base de données PostgreSQL hautement sécurisée via Cloud SQL.
              </p>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <Waves className="w-4 h-4 text-sky-400 shrink-0" />
              <p className="text-xs">
                Mise à jour en temps réel des flux de trésorerie de l'entreprise.
              </p>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <Users className="w-4 h-4 text-indigo-400 shrink-0" />
              <p className="text-xs">
                Gestion automatisée de l'intégration et des approbations RH.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 border-t border-slate-850 text-center">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
            Enterprise Core SaaS • v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
