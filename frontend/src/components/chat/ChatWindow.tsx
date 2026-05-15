import React, { useState, useEffect, useRef } from "react";
import { Send, X, Loader2, ChevronLeft } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useChat } from "../../hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { Button } from "../../components/ui/Button";

interface ChatWindowProps {
  recipientId: string;
  recipientName: string;
  onClose?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  recipientId, 
  recipientName, 
  onClose 
}) => {
  const [input, setInput] = useState("");
  const { messages, fetchHistory, markAsRead, isConnected } = useChatStore();
  const { user } = useAuthStore();
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      setLoading(true);
      await fetchHistory(recipientId);
      await markAsRead(recipientId);
      setLoading(false);
    };
    loadChat();

    // Polling fallback every 5 seconds when WebSocket is disconnected
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!useChatStore.getState().isConnected) {
      interval = setInterval(() => {
        fetchHistory(recipientId);
        markAsRead(recipientId);
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    }
  }, [recipientId, fetchHistory, markAsRead, isConnected]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    sendMessage(recipientId, input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
            {recipientName.charAt(0)}
          </div>
          <div>
             <div className="flex items-center gap-2">
               <button 
                 onClick={onClose}
                 className="md:hidden p-1 -ml-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} />
               </button>
               <h3 className="font-semibold text-sm">{recipientName}</h3>
             </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-orange-400"}`}></span>
              <span className="text-[10px] opacity-80">{isConnected ? "En ligne" : "Mode Asynchrone"}</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={() => useChatStore.getState().setIsPaneOpen(false)} 
            className="hover:bg-white/20 p-2 rounded-full transition-all active:rotate-90 duration-200"
            title="Fermer"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-2 scroll-smooth"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
            <p className="text-sm">Aucun message pour le moment.</p>
            <p className="text-xs mt-1">Envoyez le premier message pour entamer la discussion.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              timestamp={msg.timestamp}
              isMe={msg.sender_id === user?.id}
            />
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? "Écrivez votre message..." : "Message (Mode Asynchrone)..."}
          className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <Button 
          type="submit" 
          size="sm"
          className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
          disabled={!input.trim()}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};
