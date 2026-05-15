import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Shield, ShieldAlert, ShieldX, UserPlus, X, Loader2, Search } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useToastStore } from "../../store/useToastStore";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

export const Administrators = () => {
  const { user: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: ""
  });
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();
  const [revokeAdmin, setRevokeAdmin] = useState<{ id: string, email: string } | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/admin/administrators");
      setAdmins(res.data);
    } catch (err) {
      console.error("Erreur administrators", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.first_name || !newAdmin.last_name || !newAdmin.password) {
      toast.warning("Veuillez remplir tous les champs.");
      return;
    }
    
    setSaving(true);
    try {
      await api.post("/admin/administrators", newAdmin);
      toast.success("Administrateur créé avec succès !");
      setShowNewModal(false);
      setNewAdmin({ first_name: "", last_name: "", email: "", password: "" });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur de création.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (id === currentUser?.id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    setRevokeAdmin({ id, email });
  };

  const handleConfirmRevoke = async () => {
    if (!revokeAdmin) return;
    const { id } = revokeAdmin;
    
    try {
      await api.delete(`/admin/administrators/${id}`);
      toast.success("L'administrateur a été retiré de la plateforme.");
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur de suppression.");
    } finally {
      setRevokeAdmin(null);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const search = searchTerm.toLowerCase();
    return (
      admin.first_name?.toLowerCase().includes(search) ||
      admin.last_name?.toLowerCase().includes(search) ||
      admin.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Gestion d'Équipe (Administrateurs)
          </h3>
          <p className="text-slate-500 text-sm mt-1">Gérez votre personnel pouvant accéder à la console centrale.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20"
          onClick={() => setShowNewModal(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvel Admin
        </Button>
      </div>

      <Card className="glass-card shadow-lg shadow-blue-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
           <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Rechercher un collègue..." 
              className="pl-9 h-9 border-slate-200 focus:border-blue-300" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Identité de l'admin</th>
                  <th className="px-5 py-3.5 font-semibold">Email d'entreprise</th>
                  <th className="px-5 py-3.5 font-semibold">Date de création</th>
                  <th className="px-5 py-3.5 font-semibold">Statut</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Révocation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Chargement de l'équipe...
                    </td>
                  </tr>
                ) : filteredAdmins.length > 0 ? (
                  filteredAdmins.map(admin => {
                    const isMe = admin.id === currentUser?.id;
                    return (
                      <tr key={admin.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isMe ? "bg-blue-50/20" : ""}`}>
                        <td className="px-5 py-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shadow-sm ${
                            isMe ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
                          }`}>
                            {admin.first_name[0]}{admin.last_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              {admin.first_name} {admin.last_name}
                              {isMe && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Moi</span>}
                            </div>
                            <div className="text-xs text-slate-500">Administrateur Sygalin</div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-medium">{admin.email}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100/80 text-emerald-700 border border-emerald-200/50 flex items-center w-fit gap-1">
                            <ShieldAlert className="w-3 h-3" /> Accès Complet
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isMe}
                            onClick={() => handleDelete(admin.id, admin.email)}
                            title={isMe ? "Action impossible sur vous-même" : "Retirer définitivement cet administrateur"}
                            className={`h-8 border-red-200 hover:bg-red-50 hover:text-red-700 px-3 text-red-600 transition-colors ${isMe ? "opacity-50" : ""}`}
                          >
                            <ShieldX className="w-4 h-4 mr-1.5" />
                            Révoquer
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Aucun administrateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Créer Admin Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Ajouter à l'équipe Sygalin
              </h3>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Prénom <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="Ex: Paul"
                    value={newAdmin.first_name}
                    onChange={e => setNewAdmin({...newAdmin, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nom <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="Ex: Atangana"
                    value={newAdmin.last_name}
                    onChange={e => setNewAdmin({...newAdmin, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email Professionnel <span className="text-red-500">*</span></label>
                <Input 
                  type="email"
                  placeholder="paul.atangana@sygalin.com"
                  value={newAdmin.email}
                  onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mot de passe provisoire <span className="text-red-500">*</span></label>
                <Input 
                  type="text"
                  placeholder="Admin@2026..."
                  value={newAdmin.password}
                  onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1 pl-1">Le nouvel administrateur devra utiliser ça lors de sa première connexion.</p>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleCreateAdmin} 
                  disabled={saving}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                  Finaliser la création
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Revoke Modal */}
      <ConfirmModal 
        isOpen={!!revokeAdmin}
        onClose={() => setRevokeAdmin(null)}
        onConfirm={handleConfirmRevoke}
        title="Révoquer l'accès ?"
        message={`Voulez-vous vraiment retirer les droits d'administration à ${revokeAdmin?.email} ? Cette action est immédiate.`}
        confirmText="Révoquer"
        variant="danger"
      />
    </div>
  );
};
