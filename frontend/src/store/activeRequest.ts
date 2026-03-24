import type { ExecuteRequestResult, RequestDoc } from "@restify/shared";
import { create } from "zustand";
import type { BuilderTab } from "../types";

interface ActiveRequestState {
  draft: RequestDoc | null;
  response: ExecuteRequestResult | null;
  isSending: boolean;
  activeTab: BuilderTab;
  setDraft: (draft: RequestDoc | null) => void;
  patchDraft: (patch: Partial<RequestDoc>) => void;
  setResponse: (response: ExecuteRequestResult | null) => void;
  setSending: (isSending: boolean) => void;
  setActiveTab: (tab: BuilderTab) => void;
}

export const useActiveRequestStore = create<ActiveRequestState>((set) => ({
  draft: null,
  response: null,
  isSending: false,
  activeTab: "body",
  setDraft: (draft) => set({ draft }),
  patchDraft: (patch) =>
    set((state) => ({
      draft: state.draft
        ? { ...state.draft, ...patch, updatedAt: new Date().toISOString() }
        : null,
    })),
  setResponse: (response) => set({ response }),
  setSending: (isSending) => set({ isSending }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
