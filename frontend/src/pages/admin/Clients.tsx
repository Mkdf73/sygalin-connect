import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Check, X, Search, MoreVertical, Loader2, Ban, Play, Coins } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useToastStore } from "../../store/useToastStore";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Modal } from "../../components/ui/Modal";

export const Clients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // SMS Allocation Modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [allocation, setAllocation] = useState({ count: "", reference: "" });
  
  const toast = useToastStore();
  const [confirmAction, setConfirmAction] = useState<{ type: 'validate' | 'suspend' | 'reactivate', id: string } | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchClients();
    const interval = setInterval(() => fetchClients(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchClients = async (isPolling: boolean = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await api.get("/admin/clients");
      setClients(res.data);
    } catch (err) {
      console.error("Erreur clients", err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const handleValidate = async (id: string) => {
    setConfirmAction({ type: 'validate', id });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    
    try {
      if (type === 'validate') {
        await api.patch(`/admin/clients/${id}/validate`, { note: "Accepté par l'admin" });
        toast.success("Compte client accepté.");
      } else if (type === 'suspend') {
        await api.patch(`/admin/clients/${id}/suspend`);
        toast.success("Compte client suspendu.");
      } else if (type === 'reactivate') {
        await api.patch(`/admin/clients/${id}/reactivate`);
        toast.success("Compte client réactivé.");
      }
      fetchClients();
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectId || !rejectReason) return;
    try {
      await api.patch(`/admin/clients/${rejectId}/reject`, { reason: rejectReason });
      toast.success("Inscription refusée.");
      setShowRejectModal(false);
      fetchClients();
    } catch (err) {
      toast.error("Erreur lors du refus.");
    }
  };

  const handleSuspend = async (id: string) => {
    setConfirmAction({ type: 'suspend', id });
  };

  const handleReactivate = async (id: string) => {
    setConfirmAction({ type: 'reactivate', id });
  };

  const openAllocateModal = (client: any) => {
    setSelectedClient(client);
    setAllocation({ count: "", reference: "" });
    setShowAllocateModal(true);
  };

  const handleAllocateSubmit = async () => {
    const amount = parseInt(allocation.count);
    if (!amount || amount <= 0) {
      toast.warning("Veuillez entrer une quantité valide.");
      return;
    }
    
    try {
      await api.post("/admin/allocate-sms", {
        user_id: selectedClient.id,
        sms_count: amount,
        reference: allocation.reference || "Attribution admin"
      });
      toast.success(`${amount} SMS alloués avec succès.`);
      setShowAllocateModal(false);
      fetchClients();
    } catch (err) {
      toast.error("Erreur lors de l'allocation.");
    }
  };

  // Filtrage des clients
  const filteredClients = clients.filter(client => {
    const search = searchTerm.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(search) ||
      client.last_name?.toLowerCase().includes(search) ||
      client.company?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search)
    );
  });

  // State to manage which dropdown is open (by client ID)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <CardTitle>Gestion des Clients</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Validez ou bloquez l'accès des entreprises à la plateforme.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Rechercher un client..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0 border sm:rounded-lg border-slate-200" onClick={() => setOpenDropdownId(null)}>
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Nom de l'entreprise</th>
                  <th>Email</th>
                  <th>Solde SMS</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Chargement des clients...
                    </td>
                  </tr>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <tr key={client.id} className="group">
                      <td>
                        <div className="pro-data-primary">
                          {client.first_name} {client.last_name}
                        </div>
                        {client.company && <div className="pro-data-meta">{client.company}</div>}
                      </td>
                      <td className="text-slate-600">{client.email}</td>
                      <td>
                        <div className="pro-data-primary">{client.sms_balance.toLocaleString()}</div>
                      </td>
                      <td>
                        {client.status === "pending" && <span className="status-pill bg-amber-100 text-amber-700">En attente</span>}
                        {client.status === "active" && <span className="status-pill bg-emerald-100 text-emerald-700">Actif</span>}
                        {client.status === "rejected" && <span className="status-pill bg-red-100 text-red-700">Refusé</span>}
                        {client.status === "suspended" && <span className="status-pill bg-slate-100 text-slate-700">Suspendu</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 relative">
                          {client.status === "pending" && (
                            <div className="flex justify-end gap-2">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-emerald-600 border-emerald-100 hover:bg-emerald-50 font-bold"
                                 onClick={() => handleValidate(client.id)}
                               >
                                 <Check className="h-4 w-4 mr-1.5" /> Accepter
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-red-600 border-red-100 hover:bg-red-50 font-bold"
                                 onClick={() => handleRejectClick(client.id)}
                               >
                                 <X className="h-4 w-4 mr-1.5" /> Refuser
                               </Button>
                            </div>
                          )}
                        {(client.status === "active" || client.status === "suspended") && (
                          <div className="inline-block relative">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === client.id ? null : client.id);
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {openDropdownId === client.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-20 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                                {client.status === "active" && (
                                  <>
                                    <button 
                                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                      onClick={() => openAllocateModal(client)}
                                    >
                                      <Coins className="w-4 h-4" /> Allouer SMS
                                    </button>
                                    <button 
                                      className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-slate-100"
                                      onClick={() => handleSuspend(client.id)}
                                    >
                                      <Ban className="w-4 h-4" /> Suspendre
                                    </button>
                                  </>
                                )}
                                {client.status === "suspended" && (
                                  <button 
                                    className="w-full text-left px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                    onClick={() => handleReactivate(client.id)}
                                  >
                                    <Play className="w-4 h-4" /> Réactiver l'accès
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Aucun client trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Allocation Modal */}
      <Modal 
        isOpen={showAllocateModal && !!selectedClient} 
        onClose={() => setShowAllocateModal(false)}
        title="Allocation Manuelle"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <p className="text-slate-500">Client : <span className="font-bold text-slate-900">{selectedClient?.email}</span></p>
            <p className="text-slate-500 mt-1.5Small">Solde Actuel : <span className="font-bold text-slate-900">{selectedClient?.sms_balance.toLocaleString()} SMS</span></p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Quantité à rajouter *</label>
            <Input 
              type="number"
              placeholder="Ex: 500"
              value={allocation.count}
              onChange={e => setAllocation({...allocation, count: e.target.value})}
              min="1"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Référence / Motif</label>
            <Input 
              placeholder="Ex: Bonus de fidélité..."
              value={allocation.reference}
              onChange={e => setAllocation({...allocation, reference: e.target.value})}
            />
          </div>

          <Button onClick={handleAllocateSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 mt-2">
            Valider l'attribution
          </Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal 
        isOpen={showRejectModal} 
        onClose={() => setShowRejectModal(false)}
        title="Refuser l'inscription"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Veuillez indiquer la raison du refus pour informer le client.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Motif du refus *</label>
            <textarea 
              className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              placeholder="Ex: Informations incomplètes, entreprise non vérifiable..."
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleConfirmReject} 
            disabled={!rejectReason}
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
          >
            Confirmer le refus
          </Button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === 'validate' ? "Accepter le client ?" :
          confirmAction?.type === 'suspend' ? "Suspendre le compte ?" : "Réactiver le compte ?"
        }
        message={
          confirmAction?.type === 'validate' ? "Le client pourra alors commencer à envoyer des SMS après avoir rechargé son compte." :
          confirmAction?.type === 'suspend' ? "Le client ne pourra plus accéder à ses fonctionnalités d'envoi jusqu'à réactivation." : 
          "Le client retrouvera l'accès complet à ses services."
        }
        confirmText={
          confirmAction?.type === 'validate' ? "Accepter" :
          confirmAction?.type === 'suspend' ? "Suspendre" : "Réactiver"
        }
        variant={confirmAction?.type === 'suspend' ? "danger" : "primary"}
      />
    </div>
  );
};
