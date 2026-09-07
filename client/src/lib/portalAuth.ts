import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  clientId: string;
}

interface PortalAuthState {
  clientUser: PortalUser | null;
  token: string | null;
  setAuth: (clientUser: PortalUser, token: string) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      clientUser: null,
      token: null,
      setAuth: (clientUser, token) => set({ clientUser, token }),
      logout: () => set({ clientUser: null, token: null }),
    }),
    { name: "portal-auth" }
  )
);
