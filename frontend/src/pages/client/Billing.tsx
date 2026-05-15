import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CreditCard, ShoppingCart, Loader2, Phone } from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/useToastStore";
import { isValidCameroonPhone, isValidCardNumber, isValidExpiryDate, isValidCvv } from "../../lib/utils";

export const Billing = () => {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États de la modale de paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("orange_money");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user, checkAuth } = useAuthStore();
  const toast = useToastStore();

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const res = await api.get("/client/packs");
      setPacks(res.data);
    } catch (err) {
      console.error("Erreur packs", err);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (pack: any) => {
    setSelectedPack(pack);
    setPaymentMethod("orange_money");
    setPaymentDetails("");
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (paymentMethod !== "card") {
      if (!paymentDetails) {
        toast.warning("Veuillez entrer votre numéro de téléphone pour le paiement.");
        return;
      }
      
      if (!isValidCameroonPhone(paymentDetails)) {
        toast.error("Le numéro de téléphone saisi n'est pas valide pour le pays actuel (Cameroun). Format attendu: 6xxxxxxxx");
        return;
      }
    } else {
      // Payment by Card
      if (!isValidCardNumber(cardNumber)) {
        toast.error("Numéro de carte invalide.");
        return;
      }
      if (!isValidExpiryDate(expiryDate)) {
        toast.error("Date d'expiration invalide (MM/YY) ou carte expirée.");
        return;
      }
      if (!isValidCvv(cvv)) {
        toast.error("Code CVV invalide (3 ou 4 chiffres).");
        return;
      }
    }
    
    setIsProcessing(true);
    
    // Simuler le délai de paiement vers l'opérateur (MoMo / OM / Bank)
    setTimeout(async () => {
        try {
          await api.post("/client/purchase", { 
              pack_id: selectedPack.id,
              payment_method: paymentMethod,
              payment_details: paymentMethod === 'card' ? { cardNumber, expiryDate, cvv } : paymentDetails
          });
          checkAuth(); // Rafraîchir le solde
          setShowPaymentModal(false);
          toast.success("Paiement effectué avec succès !");
        } catch (err) {
          toast.error("Erreur lors de l'achat. Veuillez réessayer.");
        } finally {
          setIsProcessing(false);
        }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
        <CardHeader>
          <CardTitle className="text-blue-100 text-sm font-normal">Solde de Messagerie Disponible</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3 pb-8">
          <span className="text-5xl font-bold tracking-tight">{user?.sms_balance?.toLocaleString() || "0"}</span>
          <span className="text-xl text-blue-200 mb-1">SMS</span>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Recharger mon compte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Chargement des packs...
            </div>
          ) : packs.length > 0 ? (
            packs.map(pack => (
              <Card key={pack.id} className="glass-card border-slate-200 hover:border-blue-400 transition-colors relative group overflow-hidden">
                 <div className="absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative z-10 text-center pb-2">
                  <CardTitle className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{pack.name}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">{pack.sms_count.toLocaleString()} SMS</div>
                  <div className="text-lg font-medium text-slate-600 mb-6">{pack.price.toLocaleString()} XAF</div>
                  <Button 
                    onClick={() => openPaymentModal(pack)}
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Acheter
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
              Aucun pack disponible pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Paiement */}
      <Modal 
        isOpen={showPaymentModal && !!selectedPack} 
        onClose={() => !isProcessing && setShowPaymentModal(false)}
        title="Paiement du Pack"
        className="max-w-md p-0"
      >
        <div className="p-6 lg:p-8 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex justify-between items-center">
                <div>
                    <div className="text-indigo-950 font-black text-xl">{selectedPack?.name}</div>
                    <div className="text-indigo-600 text-sm font-bold">{selectedPack?.sms_count.toLocaleString()} SMS</div>
                </div>
                <div className="text-2xl font-black text-indigo-900">{selectedPack?.price.toLocaleString()} XAF</div>
            </div>

            <div className="space-y-4">
                <label className="text-sm font-black text-slate-700 block text-center uppercase tracking-wider">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'orange_money' ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-200' : 'border-slate-100 hover:border-orange-200 bg-white'}`}
                        onClick={() => setPaymentMethod('orange_money')}
                    >
                        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">OM</div>
                        <span className="text-[10px] font-black uppercase text-slate-500">Orange</span>
                    </button>
                    <button 
                        className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'mtn_momo' ? 'border-yellow-400 bg-yellow-50 shadow-lg shadow-yellow-100' : 'border-slate-100 hover:border-yellow-200 bg-white'}`}
                        onClick={() => setPaymentMethod('mtn_momo')}
                    >
                        <div className="w-10 h-10 rounded-full bg-[#ffcc00] text-slate-900 flex items-center justify-center font-bold text-sm shadow-sm">MoMo</div>
                        <span className="text-[10px] font-black uppercase text-slate-500">MTN</span>
                    </button>
                    <button 
                        className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-indigo-200 bg-white'}`}
                        onClick={() => setPaymentMethod('card')}
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-sm"><CreditCard className="w-4 h-4"/></div>
                        <span className="text-[10px] font-black uppercase text-slate-500">Carte</span>
                    </button>
                </div>
            </div>

            {paymentMethod !== 'card' && (
                <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                    <label className="text-sm font-bold text-slate-700 ml-1">Numéro de téléphone payeur</label>
                    <div className="relative">
                        <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            className="w-full pl-12 pr-4 py-4 rounded-3xl border-2 border-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 bg-slate-50/50"
                            placeholder="6xx xx xx xx"
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                        />
                    </div>
                </div>
            )}
            
            {paymentMethod === 'card' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Numéro de carte</label>
                        <div className="relative">
                            <CreditCard className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl border-2 border-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 bg-slate-50/50"
                                placeholder="0000 0000 0000 0000"
                                value={cardNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                                    setCardNumber(value.substring(0, 19));
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Expiration (MM/YY)</label>
                            <input 
                                type="text"
                                className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 bg-slate-50/50"
                                placeholder="MM/YY"
                                value={expiryDate}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
                                    setExpiryDate(value.substring(0, 5));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">CVV</label>
                            <input 
                                type="text"
                                className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 bg-slate-50/50"
                                placeholder="123"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            />
                        </div>
                    </div>
                </div>
            )}

            <Button 
                onClick={processPayment}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[2rem] shadow-xl shadow-indigo-600/20 text-lg font-black tracking-tight"
            >
                {isProcessing ? (
                    <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Validation...</>
                ) : (
                    `Payer ${selectedPack?.price.toLocaleString()} XAF`
                )}
            </Button>
        </div>
      </Modal>
    </div>
  );
};
