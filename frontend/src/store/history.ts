import type { HistoryDoc } from "@restify/shared";
import { create } from "zustand";

const DEFAULT_HISTORY_LIMIT = 250;

interface HistoryState {
  historyByProject: Record<string, HistoryDoc[]>;
  historyLimit: number;
  setHistoryLimit: (historyLimit: number) => void;
  setHistory: (projectId: string, history: HistoryDoc[]) => void;
  prependHistory: (projectId: string, entry: HistoryDoc) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  historyByProject: {},
  historyLimit: DEFAULT_HISTORY_LIMIT,
  setHistoryLimit: (historyLimit) =>
    set((state) => ({
      historyLimit,
      historyByProject: Object.fromEntries(
        Object.entries(state.historyByProject).map(([projectId, history]) => [
          projectId,
          history.slice(0, historyLimit),
        ]),
      ),
    })),
  setHistory: (projectId, history) =>
    set((state) => ({
      historyByProject: {
        ...state.historyByProject,
        [projectId]: history.slice(0, state.historyLimit),
      },
    })),
  prependHistory: (projectId, entry) =>
    set((state) => ({
      historyByProject: {
        ...state.historyByProject,
        [projectId]: [
          entry,
          ...(state.historyByProject[projectId] ?? []),
        ].slice(0, state.historyLimit),
      },
    })),
}));
