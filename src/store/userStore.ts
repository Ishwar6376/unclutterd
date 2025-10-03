import { create } from "zustand";

interface UserState {
  user: any | null;
  accessToken: string | null;      // Add this
  setUser: (user: any) => void;
  setAccessToken: (token: string) => void; // Add this
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  accessToken: null,

  setUser: (user) => {
    console.log("🟢 Zustand setUser called:", user);
    set({ user });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
  },
}));















