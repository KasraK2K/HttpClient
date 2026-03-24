import type { RequestDoc, WorkspaceMeta, WorkspaceTree } from "@restify/shared";
import { create } from "zustand";
import { api } from "../lib/http-client";
import { useUnlockTokenStore } from "./unlockTokens";

type TreeProject = WorkspaceTree["projects"][number];

interface WorkspaceState {
  workspaces: WorkspaceMeta[];
  trees: Record<string, WorkspaceTree>;
  activeWorkspaceId?: string;
  activeProjectId?: string;
  activeRequestId?: string;
  isLoading: boolean;
  loadWorkspaces: () => Promise<void>;
  loadWorkspaceTree: (workspaceId: string) => Promise<void>;
  setWorkspaces: (workspaces: WorkspaceMeta[]) => void;
  setTree: (workspaceId: string, tree: WorkspaceTree) => void;
  selectWorkspace: (workspaceId?: string) => void;
  selectProject: (projectId?: string) => void;
  selectRequest: (requestId?: string) => void;
  getActiveTree: () => WorkspaceTree | undefined;
  getActiveProject: () => TreeProject | undefined;
  getActiveRequest: () => RequestDoc | undefined;
}

function getFirstRequestId(tree: WorkspaceTree): string | undefined {
  return (
    tree.projects[0]?.requests[0]?._id ??
    tree.projects[0]?.folders[0]?.requests[0]?._id
  );
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  trees: {},
  activeWorkspaceId: undefined,
  activeProjectId: undefined,
  activeRequestId: undefined,
  isLoading: false,
  loadWorkspaces: async () => {
    set({ isLoading: true });
    const { workspaces } = await api.listWorkspaces();
    set((state) => ({
      workspaces,
      activeWorkspaceId: state.activeWorkspaceId ?? workspaces[0]?._id,
      isLoading: false,
    }));
  },
  loadWorkspaceTree: async (workspaceId) => {
    const token = useUnlockTokenStore.getState().getWorkspaceToken(workspaceId);
    const { tree } = await api.getWorkspaceTree(workspaceId, token);
    set((state) => ({
      trees: { ...state.trees, [workspaceId]: tree },
      activeWorkspaceId: workspaceId,
      activeProjectId:
        tree.projects.find((project) => project._id === state.activeProjectId)
          ?._id ?? tree.projects[0]?._id,
      activeRequestId: state.activeRequestId ?? getFirstRequestId(tree),
    }));
  },
  setWorkspaces: (workspaces) => set({ workspaces }),
  setTree: (workspaceId, tree) =>
    set((state) => ({ trees: { ...state.trees, [workspaceId]: tree } })),
  selectWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
  selectProject: (projectId) => set({ activeProjectId: projectId }),
  selectRequest: (requestId) => set({ activeRequestId: requestId }),
  getActiveTree: () => {
    const { activeWorkspaceId, trees } = get();
    return activeWorkspaceId ? trees[activeWorkspaceId] : undefined;
  },
  getActiveProject: () => {
    const { activeProjectId } = get();
    const tree = get().getActiveTree();
    return tree?.projects.find((project) => project._id === activeProjectId);
  },
  getActiveRequest: () => {
    const { activeRequestId } = get();
    const project = get().getActiveProject();
    if (!project) {
      return undefined;
    }

    return [
      ...project.requests,
      ...project.folders.flatMap((folder) => folder.requests),
    ].find((request) => request._id === activeRequestId);
  },
}));
