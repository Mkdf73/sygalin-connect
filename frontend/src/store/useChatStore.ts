import { create } from "zustand";
import api from "../lib/axios";

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  timestamp: string;
}

interface UnreadCount {
  user_id: string;
  count: number;
}

interface ChatState {
  messages: ChatMessage[];
  activeRecipientId: string | null;
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  isConnected: boolean;
  isPaneOpen: boolean;
  
  setActiveRecipientId: (id: string | null) => void;
  setIsPaneOpen: (open: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setUnreadCounts: (counts: UnreadCount[]) => void;
  updateUnreadCount: (userId: string, delta: number) => void;
  setIsConnected: (connected: boolean) => void;
  
  fetchHistory: (otherId: string) => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  activeRecipientId: null,
  unreadCounts: {},
  totalUnreadCount: 0,
  isConnected: false,
  isPaneOpen: false,

  setActiveRecipientId: (id) => set({ activeRecipientId: id }),
  setIsPaneOpen: (open) => set({ isPaneOpen: open }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => {
    if (state.messages.some(m => m.id === message.id)) {
      return state;
    }
    return { messages: [...state.messages, message] };
  }),
  
  setUnreadCounts: (counts) => {
    const countsDict: Record<string, number> = {};
    let total = 0;
    counts.forEach((c) => {
      countsDict[c.user_id] = c.count;
      total += c.count;
    });
    set({ unreadCounts: countsDict, totalUnreadCount: total });
  },

  updateUnreadCount: (userId, delta) => {
    set((state) => {
      const newCounts = { ...state.unreadCounts };
      newCounts[userId] = (newCounts[userId] || 0) + delta;
      if (newCounts[userId] < 0) newCounts[userId] = 0;
      
      const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0);
      return { unreadCounts: newCounts, totalUnreadCount: newTotal };
    });
  },

  setIsConnected: (connected) => set({ isConnected: connected }),

  fetchHistory: async (otherId) => {
    try {
      const res = await api.get(`/chat/history/${otherId}`);
      set({ messages: res.data });
    } catch (err) {
      console.error("Failed to fetch chat history", err);
    }
  },

  fetchUnreadCounts: async () => {
    try {
      const res = await api.get("/chat/unread-counts");
      const counts: UnreadCount[] = res.data;
      const countsDict: Record<string, number> = {};
      let total = 0;
      counts.forEach((c) => {
        countsDict[c.user_id] = c.count;
        total += c.count;
      });
      set({ unreadCounts: countsDict, totalUnreadCount: total });
    } catch (err) {
      console.error("Failed to fetch unread counts", err);
    }
  },

  markAsRead: async (senderId) => {
    try {
      await api.post(`/chat/mark-read/${senderId}`);
      set((state) => {
        const newCounts = { ...state.unreadCounts };
        const removed = newCounts[senderId] || 0;
        newCounts[senderId] = 0;
        return { 
          unreadCounts: newCounts, 
          totalUnreadCount: state.totalUnreadCount - removed 
        };
      });
    } catch (err) {
      console.error("Failed to mark messages as read", err);
    }
  },
}));

export default useChatStore;
