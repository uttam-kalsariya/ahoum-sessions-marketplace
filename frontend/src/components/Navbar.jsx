import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  CalendarCheck2,
  Layers,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

export const Navbar = ({ currentTab, onNavigate }) => {
  const { user, isAuthenticated, isCreator, logout, openAuthModal, updateProfile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const handleRoleToggle = async () => {
    if (!user) return;
    const newRole = isCreator ? 'USER' : 'CREATOR';
    setIsSwitchingRole(true);
    try {
      await updateProfile({ role: newRole });
      if (newRole === 'CREATOR') {
        onNavigate('creator');
      } else {
        onNavigate('catalog');
      }
    } catch {
      // Handled in context toast
    } finally {
      setIsSwitchingRole(false);
      setIsProfileOpen(false);
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand" onClick={() => onNavigate('catalog')}>
          <div className="brand-icon-wrapper">
            <Sparkles className="brand-icon" size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">AHOUM</span>
            <span className="brand-subtitle">Sessions Marketplace</span>
          </div>
        </div>

        {/* Center Nav Items */}
        <nav className="navbar-nav">
          <button
            className={`nav-link ${currentTab === 'catalog' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('catalog')}
          >
            <Compass size={18} />
            <span>Browse Sessions</span>
          </button>

          {isAuthenticated && (
            <button
              className={`nav-link ${currentTab === 'my-bookings' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('my-bookings')}
            >
              <CalendarCheck2 size={18} />
              <span>My Bookings</span>
            </button>
          )}

          {isAuthenticated && isCreator && (
            <button
              className={`nav-link nav-link-creator ${currentTab === 'creator' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('creator')}
            >
              <Layers size={18} />
              <span>Creator Studio</span>
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-menu-wrapper">
              <button
                className="user-profile-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
              >
                <img
                  src={
                    user?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.first_name || user?.username || 'User'
                    )}&background=6366f1&color=fff`
                  }
                  alt={user?.first_name || 'User Avatar'}
                  className="user-avatar-img"
                />
                <div className="user-profile-details">
                  <span className="user-name">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email?.split('@')[0]}
                  </span>
                  <span className={`user-role-badge badge-${user?.role?.toLowerCase()}`}>
                    <ShieldCheck size={12} />
                    {user?.role}
                  </span>
                </div>
                <ChevronDown size={16} className={`chevron-icon ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-user-email">{user?.email}</div>
                    <div className="dropdown-user-role">Role: <strong>{user?.role}</strong></div>
                  </div>

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onNavigate('profile');
                      setIsProfileOpen(false);
                    }}
                  >
                    <User size={16} />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    className="dropdown-item dropdown-item-accent"
                    onClick={handleRoleToggle}
                    disabled={isSwitchingRole}
                  >
                    <Layers size={16} />
                    <span>Switch to {isCreator ? 'User' : 'Creator'} Role</span>
                  </button>

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item dropdown-item-danger"
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                      onNavigate('catalog');
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openAuthModal('USER')}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openAuthModal('CREATOR')}
              >
                Become a Creator
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
