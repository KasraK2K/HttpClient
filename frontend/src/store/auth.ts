import type { AdminUser, User } from "@restify/shared";
import { create } from "zustand";
import { api } from "../lib/http-client";

interface AuthState {
  user: AdminUser | User | null;
  needsSuperuser: boolean;
  requiresSetupSecret: boolean;
  isInitializing: boolean;
  error?: string;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  createSuperuser: (
    name: string,
    username: string,
    password: string,
    confirmPassword: string,
    setupSecret?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AdminUser | User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  needsSuperuser: false,
  requiresSetupSecret: false,
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
        requiresSetupSecret: bootstrap.requiresSetupSecret,
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
  createSuperuser: async (
    name,
    username,
    password,
    confirmPassword,
    setupSecret,
  ) => {
    const session = await api.createSuperuser({
      name,
      username,
      password,
      confirmPassword,
      setupSecret,
    });
    set({
      user: session.user,
      needsSuperuser: false,
      requiresSetupSecret: false,
      error: undefined,
    });
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
