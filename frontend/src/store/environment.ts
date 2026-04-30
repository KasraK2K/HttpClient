import type { ProjectEnvVar } from "@reqloom/shared";
import { create } from "zustand";

interface EnvironmentState {
  activeProjectId?: string;
  envVars: Record<string, ProjectEnvVar[]>;
  setActiveProject: (projectId?: string) => void;
  setEnvVars: (projectId: string, envVars: ProjectEnvVar[]) => void;
  getEnvVars: (projectId?: string) => ProjectEnvVar[];
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  activeProjectId: undefined,
  envVars: {},
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setEnvVars: (projectId, envVars) =>
    set((state) => ({ envVars: { ...state.envVars, [projectId]: envVars } })),
  getEnvVars: (projectId) =>
    projectId ? (get().envVars[projectId] ?? []) : [],
}));
