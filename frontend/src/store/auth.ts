import type { AdminUser, User } from "@restify/shared";
import { create } from "zustand";
import { api } from "../lib/http-client";

interface AuthState {
  user: AdminUser | User | null;
  needsSuperuser: boolean;
  isInitializing: boolean;
  error?: string;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  createSuperuser: (
    username: string,
    password: string,
    confirmPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AdminUser | User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  needsSuperuser: false,
  isInitializing: true,
  error: undefined,
  setUser: (user) => set({ user }),
  initialize: async () => {
    set({ isInitializing: true, error: undefined });
    try {
      const [bootstrap, session] = await Promise.all([
        api.bootstrapStatus(),
        api.me(),
      ]);
      set({
        needsSuperuser: bootstrap.needsSuperuser,
        user: session.user,
        isInitializing: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize session",
        isInitializing: false,
      });
    }
  },
  login: async (username, password) => {
    const session = await api.login({ username, password });
    set({ user: session.user, needsSuperuser: false, error: undefined });
  },
  createSuperuser: async (username, password, confirmPassword) => {
    const session = await api.createSuperuser({
      username,
      password,
      confirmPassword,
    });
    set({ user: session.user, needsSuperuser: false, error: undefined });
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
