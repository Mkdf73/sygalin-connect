import { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  CheckCheck, 
  Loader2,
  BellOff
} from "lucide-react";

// Fonction utilitaire pour formater le temps écoulé sans dépendance externe
const formatTimeAgo = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "À l'instant";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days} j`;
    
    return date.toLocaleDateString("fr-FR", { 
      day: "numeric", 
      month: "short", 
      year: "numeric" 
    });
  } catch (e) {
    return "";
  }
};

// Interface Notification déjà définie dans le store, on peut l'importer si besoin ou la redéfinir localement mais le store l'utilise déjà.

export const Alerts = () => {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, filter, setFilter, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();

  const role = user?.role === "sygalin" ? "sygalin" : "client";

  useEffect(() => {
    fetchNotifications(role);
  }, [role, fetchNotifications]);

  const displayNotifications = filter === "unread" 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  const handleMarkAsRead = (id: string) => {
    markAsRead(role, id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead(role);
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return { 
          bg: "bg-emerald-50", 
          icon: CheckCircle2, 
          iconColor: "text-emerald-500",
          border: "border-emerald-100"
        };
      case "error":
        return { 
          bg: "bg-red-50", 
          icon: AlertCircle, 
          iconColor: "text-red-500",
          border: "border-red-100"
        };
      case "warning":
        return { 
          bg: "bg-amber-50", 
          icon: AlertCircle, 
          iconColor: "text-amber-500",
          border: "border-amber-100"
        };
      default:
        return { 
          bg: "bg-blue-50", 
          icon: Info, 
          iconColor: "text-blue-500",
          border: "border-blue-100"
        };
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alertes & Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            Restez informé des événements importants sur votre compte.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 flex-1 sm:flex-initial"
          >
            <CheckCheck className="w-4 h-4" />
            Tout lire
          </button>
        </div>
      </header>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setFilter("all")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            filter === "all" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Toutes
        </button>
        <button 
          onClick={() => setFilter("unread")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            filter === "unread" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Non lues 
          {unreadCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Chargement de vos alertes...</p>
          </div>
        ) : displayNotifications.length > 0 ? (
          displayNotifications.map((notif) => {
            const styles = getTypeStyles(notif.notification_type);
            const Icon = styles.icon;
            
            return (
              <div 
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                className={`group relative p-4 rounded-2xl border transition-all cursor-default ${
                  notif.is_read 
                  ? "bg-white border-slate-100 opacity-80" 
                  : "bg-white border-blue-100 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/5"
                } hover:border-blue-200 hover:shadow-md`}
              >
                {!notif.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
                )}
                
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl ${styles.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className={`text-sm font-bold ${notif.is_read ? "text-slate-700" : "text-slate-900"}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center glass-card rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-800">Aucune alerte</h3>
            <p className="text-slate-500 text-sm mt-1">Vous n'avez pas de notifications pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
