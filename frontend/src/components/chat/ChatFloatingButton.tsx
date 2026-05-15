import React, { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { useChatStore } from "../../store/useChatStore";
import api from "../../lib/axios";

export const ChatFloatingButton: React.FC = () => {
  const [adminUser, setAdminUser] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const { totalUnreadCount, fetchUnreadCounts, isPaneOpen: isOpen, setIsPaneOpen: setIsOpen } = useChatStore();

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await api.get("/chat/admin-user");
        setAdminUser(res.data);
      } catch (err) {
        console.error("Failed to fetch admin user for chat", err);
      }
    };
    fetchAdmin();
    fetchUnreadCounts();
    
    // Refresh unread counts every 30 seconds as fallback to WS
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  if (!adminUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-5 duration-300 chat-popup">
          <ChatWindow
            recipientId={adminUser.id}
            recipientName={`${adminUser.first_name} ${adminUser.last_name}`}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden lg:flex w-14 h-14 rounded-full items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          isOpen ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
        }`}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <MessageCircle size={28} />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};
