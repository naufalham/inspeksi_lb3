import api from './api';

export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  }
  return data;
}

export function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}
