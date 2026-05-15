import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import api from "../../lib/axios";
import { User, Building, Phone, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useToastStore } from "../../store/useToastStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export const Profile = () => {
  const { user, checkAuth } = useAuthStore();
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    company: user?.company || "",
    phone: user?.phone || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await api.patch("/auth/me", formData);
      await checkAuth(); // Refresh the user profile in store
      toast.success("Profil mis à jour avec succès.");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Paramètres du compte</h2>
        <p className="text-slate-500 mt-1">Gérez vos informations personnelles et les préférences de votre organisation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Colonne d'infos */}
        <div className="md:col-span-1 space-y-6">
          <Card className="glass-card shadow-sm border-slate-200/60 pb-2">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-white tracking-widest uppercase">
                  {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {user?.first_name} {user?.last_name}
                </h3>
                <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-600 font-medium">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    user?.role === 'sygalin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user?.role === 'sygalin' ? 'Administrateur' : 'Client standard'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne Formulaire */}
        <div className="md:col-span-2">
          <Card className="glass-card shadow-sm border-slate-200/60">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Informations du Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Prénom</label>
                    <Input 
                      name="first_name" 
                      value={formData.first_name} 
                      onChange={handleChange}
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nom</label>
                    <Input 
                      name="last_name" 
                      value={formData.last_name} 
                      onChange={handleChange}
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" /> 
                    <span>Nom de votre Entreprise / Projet</span>
                  </label>
                  <Input 
                    name="company" 
                    value={formData.company} 
                    onChange={handleChange}
                    placeholder="Ex: Sygalin Technologies"
                  />
                  <p className="text-xs text-slate-500">Apparaîtra sur vos en-têtes et votre espace.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> 
                    <span>Numéro de Téléphone</span>
                  </label>
                  <Input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    placeholder="+237 600000000"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    {success && (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium animate-in fade-in slide-in-from-bottom-1">
                        <CheckCircle2 className="w-4 h-4" /> Profil mis à jour
                      </span>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md shadow-blue-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Enregistrer
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
