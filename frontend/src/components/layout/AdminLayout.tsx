import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { LayoutDashboard, Users, CreditCard, Send, FileText, Shield, Menu, Bell, MessageCircle, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useChatStore } from "../../store/useChatStore";
import { AdminChatPanel } from "../chat/AdminChatPanel";
import { BottomNav } from "./BottomNav";
import { useChat } from "../../hooks/useChat";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { isPaneOpen } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialisation du WebSocket de chat
  useChat();

  useEffect(() => {
    if (user?.role === "sygalin") {
      fetchNotifications("sygalin");
      
      const interval = setInterval(() => {
        fetchNotifications("sygalin", true);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const adminLinks = [
    { icon: LayoutDashboard, label: "Tableau de bord", href: "/admin/dashboard" },
    { icon: Users, label: "Clients", href: "/admin/clients" },
    { icon: MessageCircle, label: "Messagerie", action: () => useChatStore.getState().setIsPaneOpen(true) },
    { icon: CreditCard, label: "Packs SMS", href: "/admin/packs" },
    { icon: Send, label: "Sender IDs", href: "/admin/senders" },
    { icon: Shield, label: "Administrateurs", href: "/admin/administrators" },
    { icon: FileText, label: "Rapports", href: "/admin/reports" },
    { icon: Bell, label: "Alertes", href: "/admin/alerts" },
    { icon: Send, label: "Test Email", href: "/admin/test-email" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        items={adminLinks} 
        role="Sygalin Admin" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 flex flex-col p-3 lg:p-8 space-y-4">
          <div className="flex justify-between items-center glass px-3 py-2 lg:px-6 lg:py-4 rounded-xl lg:rounded-2xl border border-white/20 shadow-lg shadow-blue-500/5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 hover:bg-blue-50 rounded-xl lg:hidden transition-all active:scale-95 bg-white border border-slate-200"
              >
                <Menu className="w-5 h-5 text-blue-600" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-base lg:text-2xl font-bold tracking-tight text-slate-900 leading-tight">Administration</h2>
                <p className="text-[9px] lg:text-sm text-slate-500 font-medium">Sygalin Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <button 
                onClick={() => {
                  useNotificationStore.getState().markAllAsRead("sygalin");
                  navigate("/admin/alerts");
                }}
                className="relative p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors" 
                title="Notifications"
              >
                <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
               <Link 
                to="/admin/profile"
                className="flex items-center gap-2 p-1 pr-3 lg:pr-4 rounded-full bg-white/50 glass border border-white/30 hover:bg-white/80 transition-all group lg:rounded-xl"
              >
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full lg:rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px] lg:text-base shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                </div>
                <div className="text-left">
                  <div className="text-[10px] lg:text-sm font-bold text-slate-900 leading-none">
                    {window.innerWidth < 640 ? "Moi" : (user?.company || "Admin")}
                  </div>
                  <div className="text-[8px] lg:text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">SYGALIN</div>
                </div>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 lg:ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
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
      {!isPaneOpen && <BottomNav role="admin" />}
      <AdminChatPanel />
    </div>
  );
};
