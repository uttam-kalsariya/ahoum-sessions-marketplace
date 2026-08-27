import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { CatalogPage } from './pages/CatalogPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { UserDashboard } from './pages/UserDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { ShieldCheck } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('catalog'); // 'catalog' | 'detail' | 'creator' | 'my-bookings' | 'profile'
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const { user, isCreator, loginWithGitHub, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  // Handle OAuth Callback Redirect params if present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const token = params.get('token') || params.get('id_token');
    const error = params.get('error') || params.get('error_description');

    if (error) {
      showToast(`OAuth Error: ${error}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      showToast('Authenticating with GitHub...', 'info');
      loginWithGitHub(code)
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(() => {});
    } else if (token) {
      showToast('Authenticating with Google...', 'info');
      loginWithGoogle(token)
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(() => {});
    }
  }, [loginWithGitHub, loginWithGoogle, showToast]);

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
    setCurrentTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (tab) => {
    setCurrentTab(tab);
    if (tab !== 'detail') {
      setSelectedSessionId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="app-main">
        {currentTab === 'catalog' && (
          <CatalogPage
            onSelectSession={handleSelectSession}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'detail' && selectedSessionId && (
          <SessionDetailPage
            sessionId={selectedSessionId}
            onBack={() => handleNavigate('catalog')}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'creator' && (
          <CreatorDashboard
            onSelectSession={handleSelectSession}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'my-bookings' && (
          <UserDashboard
            onSelectSession={handleSelectSession}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage onNavigate={handleNavigate} />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-brand">AHOUM Sessions Marketplace</span>
            <span className="footer-copy">
              Built for Full-Stack Intern Candidate Assignment
            </span>
          </div>
          <div className="footer-center">
            <span className="concurrency-badge">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>PostgreSQL Concurrency-Safe (Zero Oversubscription)</span>
            </span>
          </div>
          <div className="footer-right">
            <span className="text-xs text-muted">React + DRF + Postgres + Docker</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
