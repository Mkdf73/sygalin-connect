import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/axios";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Send, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      if (status === 503) {
        setError("Le serveur ne peut pas envoyer d'email pour le moment. Vérifiez la configuration SMTP ou contactez l'administrateur.");
      } else if (status === 429) {
        setError(detail || "Veuillez attendre 5 minutes avant de demander un nouveau lien.");
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.message || "Une erreur réseau ou serveur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md p-8 glass-card rounded-2xl relative z-10 shadow-xl border border-white/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg flex items-center justify-center mb-4">
            <Send className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mot de passe oublié</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleResetRequest} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Adresse e-mail</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  placeholder="vous@entreprise.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 h-11 text-base" isLoading={loading}>
              Envoyer le lien
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <p className="text-slate-600">
              Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation sous peu.
            </p>
            
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Link to="/login" className="flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};
