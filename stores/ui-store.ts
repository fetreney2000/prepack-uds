// UI-only Zustand store: modals, toasts, Tetapan auth flag.
// NEVER put server data here — that belongs in TanStack Query / RSC.
"use client";

import { create } from "zustand";

export type ModalName =
  | "prabungkusCreate"
  | "prabungkusEdit"
  | "ubatCreate"
  | "ubatEdit"
  | "settings"
  | "passwordPrompt"
  | "changePassword"
  | "udsRekodCreate"
  | "udsRekodEdit"
  | "udsPrint"
  | "udsUbatCreate"
  | "udsUbatEdit"
  | null;

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  activeModal: ModalName;
  tetapanAuthenticated: boolean;
  toasts: ToastItem[];
  openModal: (m: NonNullable<ModalName>) => void;
  closeModal: () => void;
  setTetapanAuthenticated: (v: boolean) => void;
  pushToast: (message: string, type?: ToastItem["type"]) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  tetapanAuthenticated: false,
  toasts: [],
  openModal: (m) => set({ activeModal: m }),
  closeModal: () => set({ activeModal: null }),
  setTetapanAuthenticated: (v) => set({ tetapanAuthenticated: v }),
  pushToast: (message, type = "info") => {
    const id = `toast-${++toastSeq}-${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Auto-dismiss after 4s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));