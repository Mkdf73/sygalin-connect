import React, { useEffect, useState } from "react";
import { Search, User as UserIcon, MessageSquare, X } from "lucide-react";
import api from "../../lib/axios";
import { useChatStore } from "../../store/useChatStore";
import { cn } from "../../lib/utils";

interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
}

interface ChatListProps {
  onSelect?: (id: string, name: string) => void;
  onClose?: () => void;
  className?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelect, onClose, className }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const { unreadCounts, setActiveRecipientId, activeRecipientId, fetchUnreadCounts } = useChatStore();

  const handleSelectClient = (client: Client) => {
    setActiveRecipientId(client.id);
    if (onSelect) {
      onSelect(client.id, `${client.first_name} ${client.last_name}`);
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/admin/clients");
        setClients(res.data);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      }
    };
    fetchClients();
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const filteredClients = clients.filter(c => 
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-slate-200 w-full md:w-80", className)}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-900">Messages</h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-90"
              title="Fermer"
            >
              <X size={24} className="text-slate-500" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aucun client trouvé.
          </div>
        ) : (
          filteredClients.map((client) => {
            const unread = unreadCounts[client.id] || 0;
            const isActive = activeRecipientId === client.id;

            return (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-slate-50 ${
                  isActive ? "bg-blue-50 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                    <UserIcon size={20} />
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                      {client.first_name} {client.last_name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{client.company || client.email}</p>
                </div>
                {unread > 0 && !isActive && (
                  <MessageSquare className="text-blue-500 w-4 h-4" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
