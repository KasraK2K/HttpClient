import { create } from "zustand";

interface UnlockTokenState {
  workspaceTokens: Record<string, string>;
  projectTokens: Record<string, string>;
  setWorkspaceToken: (workspaceId: string, token: string) => void;
  setProjectToken: (projectId: string, token: string) => void;
  getWorkspaceToken: (workspaceId?: string) => string | undefined;
  getProjectToken: (projectId?: string) => string | undefined;
  clearAll: () => void;
}

export const useUnlockTokenStore = create<UnlockTokenState>((set, get) => ({
  workspaceTokens: {},
  projectTokens: {},
  setWorkspaceToken: (workspaceId, token) =>
    set((state) => ({
      workspaceTokens: { ...state.workspaceTokens, [workspaceId]: token },
    })),
  setProjectToken: (projectId, token) =>
    set((state) => ({
      projectTokens: { ...state.projectTokens, [projectId]: token },
    })),
  getWorkspaceToken: (workspaceId) =>
    workspaceId ? get().workspaceTokens[workspaceId] : undefined,
  getProjectToken: (projectId) =>
    projectId ? get().projectTokens[projectId] : undefined,
  clearAll: () => set({ workspaceTokens: {}, projectTokens: {} }),
}));
