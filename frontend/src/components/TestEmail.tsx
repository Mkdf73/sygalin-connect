import { useState } from "react";
import api from "../lib/axios";
import { useToastStore } from "../store/useToastStore";
import { Send, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export const TestEmail = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToastStore();

  const handleSend = async () => {
    if (!email) {
      toast.error("Veuillez saisir une adresse email.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/send-test-email", { email });
      toast.success(response.data.detail || "Email envoyé avec succès");
      setEmail("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(detail || "Erreur lors de l'envoi de l'email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="glass overflow-hidden rounded-2xl border border-white/20 shadow-xl shadow-blue-500/10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Email de Test</h2>
          <p className="text-blue-100 text-sm mt-1 opacity-90">
            Vérifiez la configuration de votre serveur SMTP
          </p>
        </div>

        <div className="p-8 space-y-6 bg-white/40 backdrop-blur-md">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">
              Adresse Email du Destinataire
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="ex: destinataire@sygalin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={isLoading || !email}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300",
              isLoading || !email
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer le Test
              </>
            )}
          </button>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100/50">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Ce test utilise la configuration SMTP de <strong>mail.sygalin.com</strong> sur le port <strong>465 (SSL)</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
