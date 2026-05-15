import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Check, X, Search, Loader2 } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useToastStore } from "../../store/useToastStore";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Modal } from "../../components/ui/Modal";

export const Senders = () => {
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const toast = useToastStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchSenders();
    const interval = setInterval(() => fetchSenders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSenders = async (isPolling: boolean = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await api.get("/admin/senders");
      setSenders(res.data);
    } catch (err) {
      console.error("Erreur senders", err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setConfirmId(id);
  };

  const handleConfirmApprove = async () => {
    if (!confirmId) return;
    try {
      await api.patch(`/admin/senders/${confirmId}/approve`, { note: "Accepté par l'admin" });
      toast.success("Sender ID accepté avec succès.");
      fetchSenders();
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setConfirmId(null);
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
      await api.patch(`/admin/senders/${rejectId}/reject`, { reason: rejectReason });
      toast.success("Sender ID refusé.");
      setShowRejectModal(false);
      fetchSenders();
    } catch (err) {
      toast.error("Erreur lors du refus.");
    }
  };

  const filteredSenders = senders.filter(s => {
    const search = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(search) ||
      s.user_company?.toLowerCase().includes(search) ||
      s.user_email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Validation des Sender IDs</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Approuvez les noms d'expéditeurs après vérification des documents.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Chercher un Sender ID ou client..." 
              className="pl-9 w-full rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Sender ID demandé</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Justificatif</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Chargement des demandes...
                    </td>
                  </tr>
                ) : filteredSenders.length > 0 ? (
                  filteredSenders.map(sender => (
                    <tr key={sender.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 tracking-wide">{sender.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {sender.user_company || sender.user_email}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sender.created_at ? new Date(sender.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 italic text-xs">Sandbox Mode</span>
                      </td>
                      <td className="px-4 py-3">
                        {sender.status === "pending" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">En attente</span>}
                        {sender.status === "approved" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">Validé</span>}
                        {sender.status === "rejected" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">Rejeté</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                          {sender.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold"
                                onClick={() => handleApprove(sender.id)}
                              >
                                <Check className="h-4 w-4 mr-1.5" /> Accepter
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                                onClick={() => handleRejectClick(sender.id)}
                              >
                                <X className="h-4 w-4 mr-1.5" /> Refuser
                              </Button>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      Aucune demande en attente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal 
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmApprove}
        title="Accepter ce Sender ID ?"
        message="Une fois accepté, le client pourra utiliser ce nom d'expéditeur pour ses campagnes SMS."
        confirmText="Accepter"
      />

      <Modal 
        isOpen={showRejectModal} 
        onClose={() => setShowRejectModal(false)}
        title="Refuser le Sender ID"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Veuillez indiquer la raison du refus pour informer le client.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Motif du refus *</label>
            <textarea 
              className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              placeholder="Ex: Nom réservé, non conforme à l'identité du client..."
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
    </div>
  );
};
