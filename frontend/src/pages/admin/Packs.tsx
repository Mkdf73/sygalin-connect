import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, Trash2, Loader2, X, Pencil } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { useToastStore } from "../../store/useToastStore";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

export const Packs = () => {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sms_count: 1000, price: 15000, description: "" });
  
  const toast = useToastStore();
  const [deletePackId, setDeletePackId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const res = await api.get("/admin/packs");
      setPacks(res.data);
    } catch (err) {
      console.error("Erreur packs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pack?: any) => {
    if (pack) {
      setEditingId(pack.id);
      setForm({
        name: pack.name,
        sms_count: pack.sms_count,
        price: pack.price,
        description: pack.description || ""
      });
    } else {
      setEditingId(null);
      setForm({ name: "", sms_count: 1000, price: 15000, description: "" });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/packs/${editingId}`, form);
        toast.success("Pack mis à jour avec succès.");
      } else {
        await api.post("/admin/packs", form);
        toast.success("Nouveau pack créé.");
      }
      setShowModal(false);
      fetchPacks();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletePackId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletePackId) return;
    try {
      await api.delete(`/admin/packs/${deletePackId}`);
      toast.success("Pack supprimé définitivement.");
      fetchPacks();
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    } finally {
      setDeletePackId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Modèles de Tarification</h3>
          <p className="text-slate-500 text-sm">Gérez les packs SMS visibles par les clients.</p>
        </div>
        <Button 
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          onClick={() => handleOpenModal()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Pack
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Chargement des packs...
          </div>
        ) : packs.length > 0 ? (
          packs.map(pack => (
            <Card key={pack.id} className="glass-card hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{pack.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleOpenModal(pack)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                      onClick={() => confirmDelete(pack.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardTitle>
                <p className="text-sm text-slate-500 line-clamp-2">{pack.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-3xl font-bold text-slate-900">{pack.price.toLocaleString()}</span>
                  <span className="text-sm font-medium text-slate-500 mb-1">XAF</span>
                </div>
                <div className="bg-blue-50 text-blue-700 py-1.5 px-3 rounded-md inline-block text-[10px] font-bold uppercase">
                  {pack.sms_count.toLocaleString()} SMS
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            Aucun pack configuré.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingId ? "Modifier le Pack" : "Nouveau Pack"}</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nom commercial du Pack <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="ex: Pack Bronze" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Crédits (Nb SMS) <span className="text-red-500">*</span></label>
                  <Input 
                    type="number" 
                    placeholder="1000" 
                    value={form.sms_count}
                    onChange={e => setForm({...form, sms_count: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Prix public (XAF) <span className="text-red-500">*</span></label>
                  <Input 
                    type="number" 
                    placeholder="15000" 
                    value={form.price}
                    onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description (Avantages)</label>
                <textarea 
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="ex: Pack idéal pour démarrer..."
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? "Enregistrer les modifications" : "Créer le pack")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!deletePackId}
        onClose={() => setDeletePackId(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer ce Pack ?"
        message="Cette action est définitive. Les clients ne pourront plus acheter ce pack, mais ceux l'ayant déjà acheté conserveront leurs crédits."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
