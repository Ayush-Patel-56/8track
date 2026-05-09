import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
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

const REFRESH_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`;

// On every page load, accessToken is lost from memory. If we have a persisted
// session (isAuthenticated=true), proactively restore it via the refreshToken
// cookie before rendering protected routes — avoids a logout on every refresh.
function useBootSession() {
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const logout = useAuthStore((s) => s.logout);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated && !accessToken) {
      axios
        .post(REFRESH_URL, {}, { withCredentials: true })
        .then(({ data }) => setAccessToken(data.accessToken))
        .catch(() => logout())
        .finally(() => setSessionReady(true));
    } else {
      setSessionReady(true);
    }
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return sessionReady;
}

function ProtectedRoute({ children, sessionReady }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  if (!_hasHydrated || !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141416]">
        <div className="w-8 h-8 border-4 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppContent() {
  const sessionReady = useBootSession();

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
          <ProtectedRoute sessionReady={sessionReady}>
            <Layout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
