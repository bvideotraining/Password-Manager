import { create } from 'zustand';

interface User {
  uid: string;
  email: string | null;
}

interface VaultState {
  user: User | null;
  masterKey: CryptoKey | null;
  salt: string | null;
  isUnlocked: boolean;
  setUser: (user: User | null) => void;
  setMasterKey: (key: CryptoKey | null, salt: string | null) => void;
  lockVault: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  user: null,
  masterKey: null,
  salt: null,
  isUnlocked: false,
  setUser: (user) => set({ user }),
  setMasterKey: (key, salt) => set({ masterKey: key, salt, isUnlocked: !!key }),
  lockVault: () => set({ masterKey: null, salt: null, isUnlocked: false }),
}));
