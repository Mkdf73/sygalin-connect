import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import api from "../../lib/axios";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Send, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useToastStore } from "../../store/useToastStore";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const toast = useToastStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const payload = {
        email: email,
        password: password
      };

      const response = await api.post("/auth/login", payload);
      
      const { access_token, refresh_token, user } = response.data;
      login(access_token, refresh_token, user);
      
      toast.success(`Bienvenue, ${user.first_name} !`);
      
      if (user.role === "sygalin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/client/dashboard");
      }
    } catch (err: any) {
      if (!err.response) {
        toast.error("Erreur réseau : Impossible de contacter le serveur.");
        return;
      }
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg.replace('Value error, ', '')).join(" | "));
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Email ou mot de passe incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-sky-300/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-8 glass-card rounded-2xl relative z-10 shadow-xl border border-white/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg flex items-center justify-center mb-4">
            <Send className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SYGALIN CONNECT</h1>
          <p className="text-slate-500 text-sm mt-1">Plateforme d'envoi de SMS Professionnel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Mot de passe</label>
              <Link to="/forgot-password" data-id="forgot-password-link" className="text-xs font-medium text-blue-600 hover:text-blue-700">Mot de passe oublié ?</Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2 h-11 text-base" isLoading={loading}>
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-8">
          Vous n'avez pas encore de compte ?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Créer un compte client
          </Link>
        </p>
      </div>
    </div>
  );
};
