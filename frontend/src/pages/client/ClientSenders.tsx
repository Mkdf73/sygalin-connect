import { useEffect, useState } from "react";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, ShieldQuestion, ShieldCheck, ShieldAlert, X, Loader2, Search } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useToastStore } from "../../store/useToastStore";

export const ClientSenders = () => {
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [description, setDescription] = useState("");
  const toast = useToastStore();

  useEffect(() => {
    fetchSenders();
    const interval = setInterval(() => fetchSenders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSenders = async (isPolling: boolean = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await api.get("/client/senders");
      setSenders(res.data);
    } catch (err) {
      console.error("Erreur senders", err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!newName) return;
    try {
      await api.post("/client/senders", { 
        name: newName, 
        usage_type: "transactional", 
        description 
      });
      setShowModal(false);
      setNewName("");
      setDescription("");
      fetchSenders();
      toast.success("Votre demande de Sender ID a été soumise avec succès.");
    } catch (err) {
      toast.error("Format de Sender ID invalide ou erreur réseau.");
    }
  };

  const filteredSenders = senders.filter(sender => {
    const search = searchTerm.toLowerCase();
    return (
      sender.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-800">Mes Sender IDs</h3>
          <p className="text-slate-500 text-sm mt-1">Gérez vos noms d'expéditeurs personnalisés (11 caractères max).</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-9 h-11 w-full rounded-xl bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto h-11 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all font-semibold rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Demander un Sender ID
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Chargement de vos Sender IDs...
          </div>
        ) : filteredSenders.length > 0 ? (
          filteredSenders.map(sender => (
            <Card key={sender.id} className="glass-card">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 
                  ${sender.status === 'approved' || sender.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                    sender.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                    'bg-red-100 text-red-600'}`}>
                  {(sender.status === 'approved' || sender.status === 'active') && <ShieldCheck className="w-8 h-8" />}
                  {sender.status === 'pending' && <ShieldQuestion className="w-8 h-8" />}
                  {sender.status === 'rejected' && <ShieldAlert className="w-8 h-8" />}
                </div>
                <h4 className="text-lg font-bold text-slate-900 tracking-wider bg-slate-100 px-4 py-1 rounded-md border border-slate-200">
                  {sender.name}
                </h4>
                <p className="text-sm font-medium mt-4">
                  {(sender.status === 'approved' || sender.status === 'active') && <span className="text-emerald-600">Approuvé et prêt à l'emploi</span>}
                  {sender.status === 'pending' && <span className="text-amber-600">En cours de vérification</span>}
                  {sender.status === 'rejected' && <span className="text-red-600">Refusé (Documents non conformes)</span>}
                </p>
                {sender.rejection_reason && (
                  <p className="mt-2 text-xs text-red-400 px-4 italic line-clamp-2">
                    Motif: {sender.rejection_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
            Aucun Sender ID trouvé.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border-0">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Nouveau Sender ID</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white rounded-full transition-colors shadow-sm"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Nom d'expéditeur (3-11 caractères)
                </label>
                <Input 
                  placeholder="EX: MABOUTIQUE" 
                  value={newName}
                  onChange={e => setNewName(e.target.value.toUpperCase())}
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Justification / Utilisation
                </label>
                <textarea 
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Envoi de notifications de commande pour mon e-commerce..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleRequest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
              >
                Soumettre la demande
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
