'use client';

import { create } from 'zustand';
import type { UserPublic } from '@manatask/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserPublic | null;
  hydrated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user?: UserPublic }) => void;
  setUser: (user: UserPublic) => void;
  clear: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setAuth: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    set((s) => ({ accessToken, refreshToken, user: user ?? s.user }));
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hydrate: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userRaw = localStorage.getItem('user');
    set({
      accessToken,
      refreshToken,
      user: userRaw ? JSON.parse(userRaw) : null,
      hydrated: true,
    });
  },
}));

interface WorkspaceState {
  currentWorkspaceId: string | null;
  setWorkspace: (id: string) => void;
  hydrate: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  setWorkspace: (id) => {
    localStorage.setItem('workspaceId', id);
    set({ currentWorkspaceId: id });
  },
  hydrate: () => {
    set({ currentWorkspaceId: localStorage.getItem('workspaceId') });
  },
}));
