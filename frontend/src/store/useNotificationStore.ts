import { create } from "zustand";
import api from "../lib/axios";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: "success" | "error" | "info" | "warning";
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  filter: "all" | "unread";
  fetchNotifications: (role: "sygalin" | "client", silent?: boolean) => Promise<void>;
  markAsRead: (role: "sygalin" | "client", id: string) => Promise<void>;
  markAllAsRead: (role: "sygalin" | "client") => Promise<void>;
  setFilter: (filter: "all" | "unread") => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  filter: "all",
  
  setFilter: (filter) => set({ filter }),

  fetchNotifications: async (role, silent = false) => {
    const endpoint = role === "sygalin" ? "/admin/notifications" : "/client/notifications";
    try {
      if (!silent) set({ loading: true });
      const res = await api.get(endpoint);
      const notifications = res.data;
      const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      if (!silent) set({ loading: false });
    }
  },

  markAsRead: async (role, id) => {
    const endpoint = role === "sygalin" ? "/admin/notifications" : "/client/notifications";
    try {
      await api.patch(`${endpoint}/${id}/read`);
      const notifications = get().notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  },

  markAllAsRead: async (role) => {
    const endpoint = role === "sygalin" ? "/admin/notifications" : "/client/notifications";
    const unreadNotifications = get().notifications.filter(n => !n.is_read);
    
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(unreadNotifications.map(n => api.patch(`${endpoint}/${n.id}/read`)));
      const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
      set({ notifications, unreadCount: 0 });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }
}));
