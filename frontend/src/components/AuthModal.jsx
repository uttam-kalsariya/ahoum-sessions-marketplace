import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  X,
  Sparkles,
  Shield,
  UserCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialRole,
    loginWithDemo,
    loginWithGoogle,
    loginWithGitHub,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState('USER');
  const [activeTab, setActiveTab] = useState('demo'); // 'demo' | 'google' | 'github'
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [oauthConfig, setOAuthConfig] = useState({ has_google: false, has_github: false });

  // Custom demo input
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  // OAuth inputs if running manual token test
  const [googleTokenInput, setGoogleTokenInput] = useState('');
  const [githubCodeInput, setGithubCodeInput] = useState('');

  useEffect(() => {
    if (isAuthModalOpen) {
      setSelectedRole(authModalInitialRole || 'USER');
      setAuthError(null);

      // Fetch OAuth configuration from backend
      api.get('/auth/config/')
        .then((config) => setOAuthConfig(config))
        .catch(() => {});
    }
  }, [isAuthModalOpen, authModalInitialRole]);

  if (!isAuthModalOpen) return null;

  const handleDemoSignIn = async (role) => {
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithDemo(role, customEmail.trim() || undefined, customName.trim() || undefined);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!googleTokenInput.trim()) {
      setAuthError('Please provide a valid Google ID token or Access token.');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle(googleTokenInput.trim(), selectedRole);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubCodeSubmit = async (e) => {
    e.preventDefault();
    if (!githubCodeInput.trim()) {
      setAuthError('Please provide a valid GitHub authorization code.');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGitHub(githubCodeInput.trim(), selectedRole);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="auth-modal-title-group">
            <div className="brand-badge">
              <Sparkles size={16} />
              <span>Ahoum Auth</span>
            </div>
            <h2 className="modal-title">Sign In & Access Marketplace</h2>
            <p className="modal-subtitle">Choose an authentication method to explore as a User or Creator</p>
          </div>
          <button className="modal-close-btn" onClick={closeAuthModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <div className="auth-error-text">
              <strong>Authentication Error:</strong> {authError}
            </div>
          </div>
        )}

        {/* Role Selector */}
        <div className="role-selector-container">
          <label className="input-label">Select Active Role for this session:</label>
          <div className="role-options-grid">
            <button
              type="button"
              className={`role-option-card ${selectedRole === 'USER' ? 'role-option-active' : ''}`}
              onClick={() => setSelectedRole('USER')}
            >
              <div className="role-option-icon">
                <UserCheck size={20} />
              </div>
              <div className="role-option-info">
                <div className="role-name">User / Attendee</div>
                <div className="role-desc">Browse sessions, reserve seats, and manage bookings.</div>
              </div>
            </button>

            <button
              type="button"
              className={`role-option-card ${selectedRole === 'CREATOR' ? 'role-option-active' : ''}`}
              onClick={() => setSelectedRole('CREATOR')}
            >
              <div className="role-option-icon">
                <Shield size={20} />
              </div>
              <div className="role-option-info">
                <div className="role-name">Session Creator</div>
                <div className="role-desc">Publish workshops, set seat capacities, manage rosters.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Auth Method Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'demo' ? 'auth-tab-active' : ''}`}
            onClick={() => { setActiveTab('demo'); setAuthError(null); }}
          >
            <Zap size={16} />
            <span>Instant Demo Sign-in</span>
          </button>
          <button
            className={`auth-tab ${activeTab === 'google' ? 'auth-tab-active' : ''}`}
            onClick={() => { setActiveTab('google'); setAuthError(null); }}
          >
            <svg className="oauth-icon-svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google OAuth</span>
          </button>
          <button
            className={`auth-tab ${activeTab === 'github' ? 'auth-tab-active' : ''}`}
            onClick={() => { setActiveTab('github'); setAuthError(null); }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub OAuth</span>
          </button>
        </div>

        {/* Tab Content: Demo Fast Login */}
        {activeTab === 'demo' && (
          <div className="tab-pane">
            <div className="demo-callout">
              <div className="demo-callout-title">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Evaluator Instant Access Mode</span>
              </div>
              <p className="demo-callout-text">
                Instantly generates verified JWT Access and Refresh tokens on the backend without requiring third-party OAuth setup.
              </p>
            </div>

            <div className="demo-actions-grid">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handleDemoSignIn(selectedRole)}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : `Sign in as Demo ${selectedRole === 'CREATOR' ? 'Creator (Elena)' : 'User (Alex)'}`}
              </button>
            </div>

            <div className="custom-demo-accordion">
              <span className="text-xs text-muted">Or sign in with custom test email:</span>
              <div className="custom-demo-inputs">
                <input
                  type="email"
                  placeholder="e.g. tester@example.com"
                  className="input-field input-sm"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Display Name (optional)"
                  className="input-field input-sm"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Google OAuth */}
        {activeTab === 'google' && (
          <div className="tab-pane">
            <p className="text-sm text-muted mb-3">
              Exchange a Google OAuth token for backend JWT tokens. The backend securely verifies the token and issues JWT credentials.
            </p>
            <form onSubmit={handleGoogleTokenSubmit}>
              <div className="form-group mb-3">
                <label className="input-label">Google ID Token / Access Token</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Paste Google OAuth token here..."
                  value={googleTokenInput}
                  onChange={(e) => setGoogleTokenInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !googleTokenInput.trim()}
              >
                {loading ? 'Verifying with Google...' : `Authorize as ${selectedRole}`}
              </button>
            </form>
          </div>
        )}

        {/* Tab Content: GitHub OAuth */}
        {activeTab === 'github' && (
          <div className="tab-pane">
            <p className="text-sm text-muted mb-3">
              Exchange GitHub OAuth authorization code for backend JWT tokens.
            </p>
            <form onSubmit={handleGithubCodeSubmit}>
              <div className="form-group mb-3">
                <label className="input-label">GitHub Authorization Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Paste GitHub code from OAuth redirect..."
                  value={githubCodeInput}
                  onChange={(e) => setGithubCodeInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !githubCodeInput.trim()}
              >
                {loading ? 'Exchanging GitHub Code...' : `Authorize as ${selectedRole}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
