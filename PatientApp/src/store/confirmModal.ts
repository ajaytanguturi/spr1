import { create } from "zustand";
export type ConfirmModalType = "danger" | "warning" | "success" | "info";

export interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmModalType;
}

interface ConfirmModalState {
  isOpen: boolean;
  config: ConfirmModalConfig | null;
  resolve: ((confirmed: boolean) => void) | null;
  open: (config: ConfirmModalConfig) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export const useConfirmModal = create<ConfirmModalState>((set, get) => ({
  isOpen: false,
  config: null,
  resolve: null,

  open: (config) =>
    new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        config: { confirmText: "Confirm", cancelText: "Cancel", type: "danger", ...config },
        resolve,
      });
    }),

  confirm: () => {
    get().resolve?.(true);
    set({ isOpen: false, config: null, resolve: null });
  },

  cancel: () => {
    get().resolve?.(false);
    set({ isOpen: false, config: null, resolve: null });
  },
}));
