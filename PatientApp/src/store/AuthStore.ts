import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'jwt';
const LOGGED_IN_KEY = 'isLoggedIn';

export async function saveSecure(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}
export async function getSecure(key: string) {
  return await SecureStore.getItemAsync(key);
}
export async function deleteSecure(key: string) {
  await SecureStore.deleteItemAsync(key);
}

interface AuthState {
  isLoggedIn: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkLoginStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  login: async (token: string) => {
    await saveSecure(TOKEN_KEY, token);
    await saveSecure(LOGGED_IN_KEY, 'true');
    set({ isLoggedIn: true });
  },
  logout: async () => {
    await deleteSecure(TOKEN_KEY);
    await saveSecure(LOGGED_IN_KEY, 'false');
    set({ isLoggedIn: false });
  },
  checkLoginStatus: async () => {
    const token = await getSecure(TOKEN_KEY);
    set({ isLoggedIn: Boolean(token) });
  },
}));
