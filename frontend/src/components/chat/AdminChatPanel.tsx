import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { useChatStore } from "../../store/useChatStore";
import "./chat.css";

export const AdminChatPanel = () => {
  const { activeRecipientId, totalUnreadCount, isPaneOpen: isOpen, setIsPaneOpen: setIsOpen } = useChatStore();
  
  const [activeRecipientName, setActiveRecipientName] = useState("Client");

  return (
    <div className="chat-panel-container">
      {isOpen && (
        <div className={`chat-popup ${activeRecipientId ? 'has-active-chat' : ''}`}>
          <ChatList 
            onSelect={(_, name) => setActiveRecipientName(name)} 
            onClose={() => setIsOpen(false)}
            className="chat-list-sidebar"
          />
          <div className={`flex-1 bg-slate-50 flex flex-col chat-window-container ${activeRecipientId ? 'active' : ''}`}>
            {activeRecipientId ? (
              <ChatWindow 
                recipientId={activeRecipientId} 
                recipientName={activeRecipientName} 
                onClose={() => useChatStore.getState().setActiveRecipientId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 hidden md:flex">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <MessageSquare size={32} />
                </div>
                <p>Sélectionnez un client pour démarrer la discussion</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`chat-trigger hidden lg:flex w-14 h-14 rounded-full items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          isOpen ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
        }`}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <MessageSquare size={28} />
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
