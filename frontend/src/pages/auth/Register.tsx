import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Send, User, Mail, Lock, Building, Phone, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { SuccessModal } from "../../components/ui/SuccessModal";

export const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    email: "",
    password: "",
  });

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "firstName":
      case "lastName":
      case "company":
        return value.trim() === "" ? "Ce champ est requis." : "";
      case "phone": {
        if (value.trim() === "") return "Le téléphone est requis.";
        // On valide avec libphonenumber-js (Format international attendu: +...)
        if (!value.startsWith("+")) return "Format international requis (+...).";
        try {
          if (!isValidPhoneNumber(value)) return "Numéro de téléphone invalide pour ce pays.";
        } catch {
          return "Format de numéro invalide.";
        }
        return "";
      }
      case "email": {
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (value.trim() === "") return "L'email est requis.";
        if (!emailRegex.test(value)) return "Adresse e-mail invalide.";
        return "";
      }
      case "password": {
        if (value.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
        return "";
      }
      default:
        return "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Real-time validation for the changed field
    const errorMsg = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear generic error
    setError("");
    // Run full validation before submit
    const newErrors: Record<string, string> = {};
    (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError("Veuillez corriger les erreurs du formulaire.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        company: formData.company,
        first_name: formData.firstName,
        last_name: formData.lastName
      };
      
      await api.post("/auth/register", payload);
      
      // Nouvelle inscription => Affichage de la modale de succès
      setShowSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // FastAPI validation errors return an array of error objects
        setError(detail.map((d: any) => d.msg.replace('Value error, ', '')).join(" | "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 relative overflow-hidden">
       {/* Background decoration */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
       <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-300/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-xl p-8 glass-card rounded-3xl relative z-10 shadow-xl border border-white/60">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-md flex items-center justify-center mb-4">
            <Send className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ouvrir un compte</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">Remplissez ce formulaire. Votre inscription sera soumise à Sygalin pour validation.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Prénom *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input name="firstName" placeholder="John" className="pl-9" required onChange={handleChange} />
                </div>
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>
                )}
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nom *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input name="lastName" placeholder="Doe" className="pl-9" required onChange={handleChange} />
                </div>
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Entreprise</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input name="company" placeholder="Mon Entreprise SA" className="pl-9" onChange={handleChange} />
                </div>
                {fieldErrors.company && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.company}</p>
                )}
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Téléphone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input name="phone" placeholder="+237 6..." className={`pl-9 ${formData.phone && (fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : "border-green-500 focus-visible:ring-green-500")}`} required onChange={handleChange} />
                  {formData.phone && !fieldErrors.phone && (
                    <CheckCircle2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                  )}
                  {formData.phone && fieldErrors.phone && (
                    <AlertCircle className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                  )}
                </div>
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                )}
            </div>
          </div>

          <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">E-mail professionnel *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type="email" name="email" placeholder="contact@entreprise.com" className="pl-9" required onChange={handleChange} />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                )}
          </div>

          <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mot de passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    className="pl-9"
                    required
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Huit caractères minimum, dont une majuscule et un chiffre.</p>
          </div>

          <Button type="submit" className="w-full mt-4 h-11 text-base" isLoading={loading}>
            Soumettre l'inscription
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>

      <SuccessModal 
        isOpen={showSuccess}
        onClose={() => navigate("/login")}
        title="Inscription réussie !"
        message="votre compte a bien été créé ! Il est maintenant en attente d'activation par un administrateur de Sygalin."
        buttonText="Passer à la connexion"
        onAction={() => navigate("/login")}
      />
    </div>
  );
};
