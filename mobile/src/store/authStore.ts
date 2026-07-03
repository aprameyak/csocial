import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('csocial_access_token', accessToken);
    await SecureStore.setItemAsync('csocial_refresh_token', refreshToken);
    await SecureStore.setItemAsync('csocial_user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  updateUser: (updatedUser) => {
    const current = get().user;
    if (!current) return;
    const merged = { ...current, ...updatedUser };
    set({ user: merged });
    SecureStore.setItemAsync('csocial_user', JSON.stringify(merged)).catch(() => undefined);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('csocial_access_token');
    await SecureStore.deleteItemAsync('csocial_refresh_token');
    await SecureStore.deleteItemAsync('csocial_user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const [token, userStr] = await Promise.all([
        SecureStore.getItemAsync('csocial_access_token'),
        SecureStore.getItemAsync('csocial_user'),
      ]);
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, accessToken: token, isAuthenticated: true });
      }
    } catch {
      // Token expired or corrupted
    } finally {
      set({ isLoading: false });
    }
  },
}));
