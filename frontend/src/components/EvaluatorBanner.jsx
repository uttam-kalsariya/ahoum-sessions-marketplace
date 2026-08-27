import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Zap, LogOut, Sparkles } from 'lucide-react';

export const EvaluatorBanner = ({ onNavigate }) => {
  const { user, isAuthenticated, isCreator, loginWithDemo, logout } = useAuth();

  return (
    <div className="evaluator-top-banner">
      <div className="evaluator-banner-container">
        <div className="evaluator-banner-left">
          <span className="evaluator-tag">
            <Sparkles size={12} className="text-amber-400" />
            <span>Evaluator Toolbar</span>
          </span>
          <span className="evaluator-current-state">
            {isAuthenticated ? (
              <>
                Active as: <strong>{user?.first_name || user?.email}</strong>
                <span className={`inline-role-tag role-${user?.role?.toLowerCase()}`}>
                  {user?.role}
                </span>
              </>
            ) : (
              <span className="text-muted">Viewing as Guest (Unauthenticated)</span>
            )}
          </span>
        </div>

        <div className="evaluator-actions">
          <span className="text-xs text-dim mr-1">1-Click Fast Auth:</span>

          <button
            className={`evaluator-btn ${isAuthenticated && !isCreator && user?.email === 'user.alex@ahoum.com' ? 'evaluator-btn-active' : ''}`}
            onClick={() => {
              loginWithDemo('USER', 'user.alex@ahoum.com', 'Alex Mercer');
              onNavigate('catalog');
            }}
            title="Sign in as Attendee / User Alex"
          >
            <UserCheck size={13} />
            <span>Demo User (Alex)</span>
          </button>

          <button
            className={`evaluator-btn ${isAuthenticated && isCreator && user?.email === 'creator.elena@ahoum.com' ? 'evaluator-btn-active' : ''}`}
            onClick={() => {
              loginWithDemo('CREATOR', 'creator.elena@ahoum.com', 'Elena Rostova');
              onNavigate('creator');
            }}
            title="Sign in as Session Host / Creator Elena"
          >
            <ShieldCheck size={13} />
            <span>Demo Creator (Elena)</span>
          </button>

          <button
            className={`evaluator-btn ${isAuthenticated && isCreator && user?.email === 'creator.marcus@ahoum.com' ? 'evaluator-btn-active' : ''}`}
            onClick={() => {
              loginWithDemo('CREATOR', 'creator.marcus@ahoum.com', 'Dr. Marcus Vance');
              onNavigate('creator');
            }}
            title="Sign in as Creator Dr. Marcus"
          >
            <ShieldCheck size={13} />
            <span>Demo Creator (Marcus)</span>
          </button>

          {isAuthenticated && (
            <button
              className="evaluator-btn evaluator-btn-logout"
              onClick={() => {
                logout();
                onNavigate('catalog');
              }}
              title="Sign out to test guest experience"
            >
              <LogOut size={13} />
              <span>Guest Mode</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
