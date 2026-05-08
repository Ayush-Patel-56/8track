import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import api from './lib/api';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141416]">
        <div className="w-8 h-8 border-4 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const { isAuthenticated, setAccessToken, logout, _hasHydrated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (_hasHydrated && isAuthenticated) {
        try {
          const { data } = await api.post('/auth/refresh');
          setAccessToken(data.accessToken);
        } catch (error) {
          console.error("Session restoration failed:", error);
          logout();
        }
      }
      setIsInitializing(false);
    };

    if (_hasHydrated) {
      initAuth();
    }
  }, [_hasHydrated, isAuthenticated, setAccessToken, logout]);

  if (!_hasHydrated || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141416]">
        <div className="w-8 h-8 border-4 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ToastProvider>
            <div className="min-h-screen bg-[#141416] text-[#F0EEE8]">
              <AppContent />
            </div>
          </ToastProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
