import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { FileText, Loader2, Search, Download, Calendar } from "lucide-react";
import { Input } from "../../components/ui/Input";
import api from "../../lib/axios";

export const Reports = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/admin/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = async () => {
    try {
      const response = await api.get("/admin/transactions/csv", {
        responseType: 'blob'
      });
      
      // Téléchargement du fichier
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur lors de l'export CSV", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 text-center sm:text-left">
            <FileText className="w-5 h-5 text-blue-600" /> Rapports & Transactions
          </h3>
          <p className="text-slate-500 text-sm mt-1">Historique complet de toutes les activités financières et crédits sur la plateforme.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-4 gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Rechercher par email, réf..." 
              className="pl-9 w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            Toutes les transactions
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container border border-slate-200 bg-white/50">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Type</th>
                  <th>SMS</th>
                  <th>Détails</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Chargement des rapports...
                    </td>
                  </tr>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="group">
                      <td>
                        <div className="pro-data-primary">{tx.user_email}</div>
                        <div className="pro-data-meta">{tx.id.substring(0, 8)}...</div>
                      </td>
                      <td>
                        <span className={`status-pill ${
                          tx.transaction_type === 'credit_allocation' ? 'bg-blue-100 text-blue-700' :
                          tx.transaction_type === 'pack_purchase' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.transaction_type === 'credit_allocation' ? 'Allocation Admin' :
                           tx.transaction_type === 'pack_purchase' ? 'Achat Pack' : 'Débit'}
                        </span>
                      </td>
                      <td>
                        <div className={`text-sm font-bold ${tx.sms_count > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.sms_count > 0 ? '+' : ''}{tx.sms_count.toLocaleString()}
                        </div>
                   {tx.amount > 0 && <div className="pro-data-meta">{tx.amount.toLocaleString()} {tx.currency}</div>}
                      </td>
                      <td>
                        <div className="text-slate-700 font-medium line-clamp-1">{tx.description}</div>
                        <div className="pro-data-meta">Réf: {tx.reference}</div>
                      </td>
                      <td className="text-slate-500">
                        <div className="text-sm">{new Date(tx.created_at).toLocaleDateString()}</div>
                        <div className="pro-data-meta">{new Date(tx.created_at).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Aucune transaction trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
