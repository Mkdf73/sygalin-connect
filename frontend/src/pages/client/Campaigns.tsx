import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, Search, Eye, X, Loader2, Info } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useToastStore } from "../../store/useToastStore";
import { Send } from "lucide-react";

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form Data
  const [senders, setSenders] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const toast = useToastStore();
  
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message_content: "",
    sender_id: "",
    group_ids: [] as string[],
    contact_ids: [] as string[],
    is_scheduled: false,
    scheduled_at: "",
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get("/client/campaigns");
      setCampaigns(res.data);
    } catch (err) {
      console.error("Erreur chargement campagnes", err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = async () => {
    setShowNewModal(true);
    setLoadingForm(true);
    try {
      const [sendersRes, groupsRes] = await Promise.all([
        api.get("/client/senders"),
        api.get("/client/groups")
      ]);
      const approvedSenders = sendersRes.data.filter((s: any) => s.status === "approved" || s.status === "active");
      setSenders(approvedSenders);
      setGroups(groupsRes.data);
      
      if (approvedSenders.length > 0) {
        setNewCampaign(prev => ({ ...prev, sender_id: approvedSenders[0].id }));
      }
    } catch (err) {
      console.error("Erreur chargement données de formulaire", err);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleGroupSelection = (groupId: string) => {
    const isSelected = newCampaign.group_ids.includes(groupId);
    if (isSelected) {
      setNewCampaign({ ...newCampaign, group_ids: newCampaign.group_ids.filter(id => id !== groupId) });
    } else {
      setNewCampaign({ ...newCampaign, group_ids: [...newCampaign.group_ids, groupId] });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_content || !newCampaign.sender_id) {
      toast.warning("Veuillez remplir tous les champs obligatoires (Nom, Expéditeur et Message).");
      return;
    }
    if (newCampaign.group_ids.length === 0 && newCampaign.contact_ids.length === 0) {
      toast.warning("Action requise : Sélectionnez au moins un groupe de contacts.");
      return;
    }
    
    // Validation de la date pour les campagnes programmées
    if (newCampaign.is_scheduled && !newCampaign.scheduled_at) {
      toast.warning("Veuillez spécifier la date et l'heure d'envoi.");
      return;
    }

    try {
      await api.post("/client/campaigns", newCampaign);
      
      if (newCampaign.is_scheduled) {
        toast.success("Succès : Votre campagne a été programmée.");
      } else {
        toast.success("Succès : Votre campagne a été lancée avec succès !");
      }
      
      setShowNewModal(false);
      setNewCampaign({ name: "", message_content: "", sender_id: "", group_ids: [], contact_ids: [], is_scheduled: false, scheduled_at: "" });
      fetchCampaigns();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail && detail.includes("Solde insuffisant")) {
        toast.error("Erreur : Votre solde SMS est insuffisant pour cette campagne.");
      } else {
        toast.error(detail || "Une erreur est survenue lors de la création de la campagne.");
      }
    }
  };

  const filteredCampaigns = campaigns.filter(camp => {
    const search = searchTerm.toLowerCase();
    return (
      camp.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Mes Campagnes SMS</h3>
          <p className="text-slate-500 text-sm">Créez et suivez vos envois de messages en masse.</p>
        </div>
        <Button 
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={openNewModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
           <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Rechercher une campagne..." 
              className="pl-9 w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0 border sm:rounded-lg border-slate-200">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom de la campagne</th>
                  <th className="px-4 py-3 font-medium">Date d'envoi</th>
                  <th className="px-4 py-3 font-medium text-right">SMS Utilisés</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Chargement des campagnes...
                    </td>
                  </tr>
                ) : filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map(camp => (
                    <tr key={camp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{camp.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {camp.is_scheduled && camp.scheduled_at 
                          ? <span className="font-semibold text-slate-800">{new Date(camp.scheduled_at).toLocaleString([], {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'})}</span>
                          : (camp.created_at ? new Date(camp.created_at).toLocaleDateString() : "-")}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-right">{camp.total_sms_used} SMS</td>
                      <td className="px-4 py-3">
                        {camp.status === "completed" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">Terminée</span>}
                        {camp.status === "sending" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">En cours</span>}
                        {camp.status === "scheduled" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">Programmée</span>}
                        {camp.status === "draft" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">Brouillon</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucune campagne trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Création Campagne */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            {/* Header - Reste toujours en haut */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Nouvelle Campagne</h3>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors group"
                title="Fermer"
              >
                <X className="w-6 h-6 text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>
            
            {/* Body - Défile si le contenu est trop long */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {loadingForm ? (
                <div className="py-12 flex justify-center text-slate-400">
                   <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Nom de la campagne *</label>
                    <Input 
                      placeholder="Ex: Promo Noël 2026" 
                      value={newCampaign.name}
                      onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Expéditeur (Sender ID) *</label>
                    {senders.length > 0 ? (
                      <select 
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={newCampaign.sender_id}
                        onChange={e => setNewCampaign({...newCampaign, sender_id: e.target.value})}
                      >
                        {senders.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm border border-amber-200 flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>Vous n'avez aucun Sender ID validé. Veuillez en demander un dans la section "Sender IDs".</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Cibles (Groupes)</label>
                    <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50 space-y-1">
                      {groups.length > 0 ? groups.map(g => (
                        <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={newCampaign.group_ids.includes(g.id)}
                            onChange={() => handleGroupSelection(g.id)}
                          />
                          <span className="text-sm text-slate-700">{g.name} <span className="text-slate-400 text-xs">({g.contact_count} contacts)</span></span>
                        </label>
                      )) : (
                        <p className="p-2 text-sm text-slate-500">Aucun groupe disponible.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex justify-between">
                      <span>Message SMS *</span>
                      <span className="text-xs text-slate-400 font-normal">{newCampaign.message_content.length} caractères</span>
                    </label>
                    <textarea 
                      className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      placeholder="Votre message SMS ici..."
                      value={newCampaign.message_content}
                      onChange={e => setNewCampaign({...newCampaign, message_content: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3 pb-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only"
                          checked={newCampaign.is_scheduled}
                          onChange={e => setNewCampaign({...newCampaign, is_scheduled: e.target.checked})}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${newCampaign.is_scheduled ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newCampaign.is_scheduled ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Planifier l'envoi pour plus tard</span>
                    </label>
                    
                    {newCampaign.is_scheduled && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Date et Heure d'envoi</label>
                        <input 
                          type="datetime-local" 
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700"
                          value={newCampaign.scheduled_at}
                          onChange={e => setNewCampaign({...newCampaign, scheduled_at: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleCreateCampaign}
                    disabled={senders.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-bold shadow-lg shadow-blue-200"
                  >
                    {newCampaign.is_scheduled ? (
                      <><Search className="w-5 h-5 mr-2" /> Programmer la Campagne</>
                    ) : (
                      <><Send className="w-5 h-5 mr-2" /> Lancer la Campagne SMS</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
