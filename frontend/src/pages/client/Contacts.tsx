import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Plus, Search, FolderClosed, Users, Trash2, Loader2, UserPlus, X, Upload, AlertCircle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";
import { Modal } from "../../components/ui/Modal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useToastStore } from "../../store/useToastStore";

export const Contacts = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // On capture le groupe cible AU MOMENT où le modal s'ouvre
  // pour éviter tout problème de closure/state stale
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [newContact, setNewContact] = useState({ phone: "", name: "", email: "" });
  
  const toast = useToastStore();
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'contact' | 'group', id: string } | null>(null);
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importGroupId, setImportGroupId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // New Group within Contact Modal
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [selectedGroupForContact, setSelectedGroupForContact] = useState<string>("");

  const openContactModal = () => {
    // Figer le groupe actuel au moment de l'ouverture
    setTargetGroupId(selectedGroupId);
    setSelectedGroupForContact(selectedGroupId || "");
    setIsCreatingNewGroup(false);
    setTempGroupName("");
    setShowContactModal(true);
  };

  useEffect(() => {
    fetchGroups();
    fetchContacts();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get("/client/groups");
      setGroups(res.data);
    } catch (err) {
      console.error("Erreur groupes", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchContacts = async (groupId: string | null = null) => {
    setLoadingContacts(true);
    try {
      const url = groupId ? `/client/groups/${groupId}/contacts` : "/client/contacts";
      const res = await api.get(url);
      setContacts(res.data);
      setSelectedGroupId(groupId);
    } catch (err) {
      console.error("Erreur contacts", err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const deleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ type: 'contact', id });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    
    try {
      if (type === 'contact') {
        await api.delete(`/client/contacts/${id}`);
        setContacts(contacts.filter(c => c.id !== id));
        toast.success("Contact supprimé et retiré de ses groupes.");
      } else {
        await api.delete(`/client/groups/${id}`);
        setGroups(groups.filter(g => g.id !== id));
        if (selectedGroupId === id) fetchContacts(null);
        toast.success("Groupe supprimé avec succès.");
      }
      fetchGroups();
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const deleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ type: 'group', id });
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name) return;
    try {
      await api.post("/client/groups", { ...newGroup, contact_ids: [] });
      setShowGroupModal(false);
      setNewGroup({ name: "", description: "" });
      toast.success("Groupe créé avec succès.");
      fetchGroups();
    } catch (err) {
      toast.error("Erreur lors de la création du groupe.");
    }
  };

  const handleCreateContact = async () => {
    if (!newContact.phone) return;
    
    try {
      let groupToUse = targetGroupId || selectedGroupForContact;

      // 1. Créer le groupe si demandé à la volée
      if (isCreatingNewGroup && tempGroupName.trim()) {
        try {
          const groupRes = await api.post("/client/groups", { 
            name: tempGroupName.trim(), 
            description: "Groupe créé lors de l'ajout d'un contact",
            contact_ids: [] 
          });
          groupToUse = groupRes.data.id;
          fetchGroups(); // Actualiser la liste de gauche
        } catch (err) {
          toast.error("Erreur lors de la création du groupe.");
          return;
        }
      }

      const payload = {
        phone: newContact.phone,
        name: newContact.name,
        email: newContact.email,
        group_id: groupToUse || null
      };
      
      await api.post("/client/contacts", payload);
      
      // Reset & Close
      setShowContactModal(false);
      setNewContact({ phone: "", name: "", email: "" });
      setTargetGroupId(null);
      setIsCreatingNewGroup(false);
      setTempGroupName("");
      
      // Rafraîchir la vue courante ET les compteurs
      await fetchContacts(groupToUse || null); 
      toast.success(isCreatingNewGroup ? "Groupe et contact créés !" : "Contact ajouté avec succès.");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du contact.");
    }
  };

  const handleImportContacts = async () => {
    if (!importFile) {
      toast.warning("Veuillez sélectionner un fichier (.csv ou .xlsx).");
      return;
    }

    if (!importGroupId) {
      toast.warning("Veuillez sélectionner un groupe pour organiser vos contacts.");
      return;
    }
    
    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    if (importGroupId) {
      formData.append("group_id", importGroupId);
    }

    try {
      const res = await api.post("/client/contacts/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`${res.data.created} contact(s) créés.`);
      setShowImportModal(false);
      setImportFile(null);
      setImportGroupId("");
      
      // Rafraîchir les données
      if (selectedGroupId && (importGroupId === selectedGroupId || !importGroupId)) {
        fetchContacts(selectedGroupId);
      } else {
        fetchContacts(selectedGroupId); 
      }
      fetchGroups();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erreur lors de l'importation.";
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 text-center sm:text-left">Contacts & Groupes</h3>
          <p className="text-slate-500 text-sm">Gérez vos répertoires pour cibler vos envois.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="w-full sm:w-auto text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer Excel/CSV
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={openContactModal}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau Contact
          </Button>
          <Button 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setShowGroupModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Groupe
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des groupes */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderClosed className="w-4 h-4 text-blue-500" />
                Mes Groupes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div 
                onClick={() => fetchContacts(null)}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-colors ${
                  selectedGroupId === null ? "bg-blue-50 border-blue-100 text-blue-900" : "hover:bg-slate-50 border-transparent text-slate-700"
                }`}
              >
                <span className="text-sm font-medium">Tous les contacts</span>
              </div>
              {loadingGroups ? (
                <div className="flex justify-center py-4 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : groups.length > 0 ? (
                groups.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => fetchContacts(g.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-colors group ${
                      selectedGroupId === g.id ? "bg-blue-50 border-blue-100 text-blue-900" : "hover:bg-slate-50 border-transparent text-slate-700"
                    }`}
                  >
                    <span className="text-sm font-medium truncate pr-2">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{g.contact_count}</span>
                      <button 
                        onClick={(e) => deleteGroup(g.id, e)} 
                        className="sm:opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs italic">
                  Aucun groupe 
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Détail Contacts */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-4 gap-4">
            <CardTitle className="text-lg text-center sm:text-left">
              {selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : "Tous les contacts"}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-9 h-9 w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingContacts ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                Chargement...
              </div>
            ) : contacts.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0 border sm:rounded-lg border-slate-100">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-left">Nom</th>
                      <th className="px-4 py-2.5 font-semibold text-left">Téléphone</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{c.name || "Inconnu"}</td>
                        <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{c.phone}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                            onClick={(e) => deleteContact(c.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Aucun contact trouvé ici.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Nouveau Groupe */}
      <Modal 
        isOpen={showGroupModal} 
        onClose={() => setShowGroupModal(false)}
        title="Nouveau Groupe"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nom du groupe *</label>
            <Input 
              placeholder="ex: Clients Fidèles" 
              value={newGroup.name}
              onChange={e => setNewGroup({...newGroup, name: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea 
              className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Description facultative..."
              rows={3}
              value={newGroup.description}
              onChange={e => setNewGroup({...newGroup, description: e.target.value})}
            />
          </div>
          <Button onClick={handleCreateGroup} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
            Créer le groupe
          </Button>
        </div>
      </Modal>

      {/* Modal Nouveau Contact */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Nouveau Contact</h3>
                {targetGroupId && (
                  <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                    <FolderClosed className="w-3 h-3" />
                    Sera ajouté au groupe : {groups.find(g => g.id === targetGroupId)?.name}
                  </p>
                )}
              </div>
              <button onClick={() => setShowContactModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {targetGroupId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
                  <FolderClosed className="w-4 h-4 flex-shrink-0" />
                  Ce contact sera ajouté au groupe <strong>{groups.find(g => g.id === targetGroupId)?.name}</strong>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Numéro de téléphone *</label>
                <Input 
                  placeholder="ex: +237690123456" 
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nom Complet</label>
                <Input 
                  placeholder="ex: Jean Dupont" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Adresse Email</label>
                <Input 
                  placeholder="ex: jean@example.com" 
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact({...newContact, email: e.target.value})}
                />
              </div>

              {/* Sélection / Création de groupe */}
              {!targetGroupId && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800">Groupe</label>
                    <button 
                      type="button"
                      onClick={() => setIsCreatingNewGroup(!isCreatingNewGroup)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                    >
                      {isCreatingNewGroup ? "Choisir existant" : "Nouveau groupe ?"}
                    </button>
                  </div>

                  {isCreatingNewGroup ? (
                    <div className="animate-in slide-in-from-top-2">
                       <Input 
                        placeholder="Nom du nouveau groupe..." 
                        value={tempGroupName}
                        onChange={e => setTempGroupName(e.target.value)}
                        className="border-blue-200 focus:ring-blue-500 bg-blue-50/30"
                      />
                      <p className="text-[10px] text-blue-500 mt-1">Le groupe sera créé en même temps que le contact.</p>
                    </div>
                  ) : (
                    <select 
                      className="w-full p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      value={selectedGroupForContact}
                      onChange={e => setSelectedGroupForContact(e.target.value)}
                    >
                      <option value="">Aucun (Global)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <Button onClick={handleCreateContact} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
                {isCreatingNewGroup ? "Créer groupe & contact" : (targetGroupId ? `Ajouter au groupe` : `Enregistrer le contact`)}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import */}
      <Modal 
        isOpen={showImportModal} 
        onClose={() => !isImporting && setShowImportModal(false)}
        title="Importer des contacts"
      >
        <div className="space-y-5">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs border border-blue-100 space-y-2">
            <p className="font-bold">Format attendu :</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Fichier <strong>.xlsx</strong> ou <strong>.csv</strong></li>
              <li>Col 1 : <strong>Téléphone</strong> (obligatoire)</li>
              <li>Col 2 : <strong>Nom</strong> | Col 3 : <strong>E-mail</strong></li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Fichier *</label>
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="w-full p-2 border border-slate-200 rounded-xl text-xs"
              onChange={(e) => e.target.files && setImportFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Groupe de destination *</label>
            {groups.length > 0 ? (
              <select 
                className={`w-full p-3 rounded-2xl border ${!importGroupId ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all`}
                value={importGroupId}
                onChange={e => setImportGroupId(e.target.value)}
              >
                <option value="">-- Sélectionner un groupe --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Vous devez créer un groupe avant d'importer des contacts.
              </div>
            )}
            {!importGroupId && groups.length > 0 && (
              <p className="text-[10px] text-amber-600 font-medium">Le choix d'un groupe est requis pour l'organisation.</p>
            )}
          </div>

          <Button 
            onClick={handleImportContacts}
            disabled={isImporting || !importFile}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6"
          >
            {isImporting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importation...</> : "Lancer l'importation"}
          </Button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title={confirmDelete?.type === 'group' ? "Supprimer le groupe ?" : "Supprimer le contact ?"}
        message={confirmDelete?.type === 'group' ? "Voulez-vous vraiment supprimer ce groupe ? Les contacts à l'intérieur ne seront PAS supprimés." : "Cette action est irréversible."}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
