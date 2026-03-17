import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout, getUser } from '@/lib/auth';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  init: () => {
    const user = getUser();
    set({ user });
  },
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await apiLogin(username, password);
      if (res.success) {
        set({ user: res.data.user, loading: false });
        return true;
      }
      set({ error: res.message || 'Login gagal', loading: false });
      return false;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || 'Login gagal';
      set({ error: msg, loading: false });
      return false;
    }
  },
  logout: () => {
    apiLogout();
    set({ user: null });
  },
}));
