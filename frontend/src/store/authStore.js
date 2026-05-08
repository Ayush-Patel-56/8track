import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            _hasHydrated: false,
            setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
            setAccessToken: (accessToken) => set({ accessToken }),
            logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
            updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: '8track-auth',
            // Only persist user info, not the access token (security)
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
