import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { LayoutDashboard, MessageSquare, CreditCard, Send, Contact, Menu, Bell, MessageCircle, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useChatStore } from "../../store/useChatStore";
import { ChatFloatingButton } from "../chat/ChatFloatingButton";
import { BottomNav } from "./BottomNav";
import { useChat } from "../../hooks/useChat";

export const ClientLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { isPaneOpen } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialisation du WebSocket de chat
  useChat();

  useEffect(() => {
    if (user?.role === "client") {
      fetchNotifications("client");
      
      const interval = setInterval(() => {
        fetchNotifications("client", true);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);
  
  const clientLinks = [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/client/dashboard" },
    { icon: MessageSquare, label: "Campagnes SMS", href: "/client/campaigns" },
    { icon: MessageCircle, label: "Messagerie", action: () => useChatStore.getState().setIsPaneOpen(true) },
    { icon: Contact, label: "Contacts & Groupes", href: "/client/contacts" },
    { icon: CreditCard, label: "Acheter des crédits", href: "/client/billing" },
    { icon: Send, label: "Mes Sender IDs", href: "/client/senders" },
    { icon: Bell, label: "Alertes", href: "/client/alerts" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        items={clientLinks} 
        role="Espace Client" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 flex flex-col p-3 lg:p-8 space-y-4">
          <div className="flex justify-between items-center glass px-3 py-2 lg:px-6 lg:py-4 rounded-xl lg:rounded-2xl border border-white/20 shadow-lg shadow-blue-500/5 backdrop-blur-xl">
            <div className="flex items-center gap-3 lg:gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 hover:bg-blue-50 rounded-xl lg:hidden transition-all active:scale-95 bg-white border border-slate-200"
              >
                <Menu className="w-5 h-5 text-blue-600" />
              </button>
              
              <Link 
                to="/client/profile" 
                className="flex items-center gap-2 lg:gap-3 p-1 pr-3 lg:pr-4 rounded-full glass bg-white/40 border border-white/30 hover:bg-white/60 transition-all group lg:rounded-xl"
              >
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full lg:rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px] lg:text-base shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                </div>
                <div className="text-left">
                  <div className="text-[10px] lg:text-sm font-bold text-slate-900 leading-none">
                    {window.innerWidth < 640 ? "Moi" : (user?.company || "Client")}
                  </div>
                  <div className="text-[8px] lg:text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">
                    {user?.sms_balance?.toLocaleString() || "0"} SMS
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    useNotificationStore.getState().markAllAsRead("client");
                    navigate("/client/alerts");
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all relative group"
                >
                  <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                  {unreadCount > 0 && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
                
                <button 
                  onClick={() => navigate("/client/campaigns")}
                  className="hidden sm:flex bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                >
                  Campagne
                </button>
                
                <button
                  onClick={handleLogout}
                  className="p-2 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-24 lg:px-8 lg:pb-12 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {!isPaneOpen && <BottomNav role="client" />}
      <ChatFloatingButton />
    </div>
  );
};
