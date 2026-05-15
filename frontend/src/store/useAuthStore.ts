import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/axios";

interface User {
  id: string;
  email: string;
  role: "sygalin" | "client";
  status: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  sms_balance?: number;
  address?: string;
  city?: string;
  country?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setToken: (token: string, refreshToken: string) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (token, refreshToken, user) => set({ user, token, refreshToken, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
      setToken: (token, refreshToken) => set({ token, refreshToken }),
      checkAuth: async () => {
        const { token, user } = get();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        
        try {
           // Mise à jour silencieuse des données dynamiques (ex: solde SMS)
           if (user?.role === "client") {
             const { data } = await api.get("/client/me");
             set({ user: { ...user, ...data }, isAuthenticated: true });
           } else {
              set({ isAuthenticated: true });
           }
        } catch (error: any) {
           // Ne déconnecter que si le token est invalide (401)
           if (error.response?.status === 401) {
             // La déconnexion sera gérée dans l'intercepteur axios (axios.ts)
           }
        }
      }
    }),
    {
      name: "sygalin-auth",
    }
  )
);
