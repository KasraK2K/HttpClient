import type { HistoryDoc } from "@restify/shared";
import { create } from "zustand";

interface HistoryState {
  historyByProject: Record<string, HistoryDoc[]>;
  setHistory: (projectId: string, history: HistoryDoc[]) => void;
  prependHistory: (projectId: string, entry: HistoryDoc) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  historyByProject: {},
  setHistory: (projectId, history) =>
    set((state) => ({
      historyByProject: { ...state.historyByProject, [projectId]: history },
    })),
  prependHistory: (projectId, entry) =>
    set((state) => ({
      historyByProject: {
        ...state.historyByProject,
        [projectId]: [
          entry,
          ...(state.historyByProject[projectId] ?? []),
        ].slice(0, 50),
      },
    })),
}));
