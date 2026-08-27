import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, ShieldCheck, UserCheck, Sparkles, Check, AlertCircle } from 'lucide-react';

export const ProfilePage = ({ onNavigate }) => {
  const { user, isAuthenticated, updateProfile, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    avatar_url: '',
    role: 'USER',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        role: user.role || 'USER',
      });
    }
  }, [user]);

  if (!isAuthenticated) {
    return (
      <div className="page-container">
        <div className="empty-state-card">
          <User size={40} className="text-cyan-400 mb-3" />
          <h2>Sign In to Manage Your Profile</h2>
          <p>Please sign in to view and update your details.</p>
          <button className="btn btn-primary mt-4" onClick={() => openAuthModal('USER')}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(formData);
    } catch {
      // Toast handles error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container profile-page">
      <div className="profile-layout-container">
        <div className="profile-header-card">
          <div className="profile-avatar-block">
            <img
              src={
                formData.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  formData.first_name || user?.username || 'User'
                )}&background=6366f1&color=fff`
              }
              alt="Avatar Preview"
              className="profile-avatar-large"
            />
            <div>
              <h1 className="profile-name">
                {formData.first_name ? `${formData.first_name} ${formData.last_name}` : user.email}
              </h1>
              <div className="profile-email text-sm text-muted">{user.email}</div>
              <span className={`badge badge-${formData.role.toLowerCase()} mt-2 inline-flex items-center gap-1`}>
                <ShieldCheck size={12} /> Active Role: {formData.role}
              </span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2 className="section-title mb-4">Edit Profile & Account Details</h2>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row-2 mb-3">
              <div className="form-group">
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Elena"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Rostova"
                />
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="input-label">Avatar Image URL</label>
              <input
                type="url"
                className="input-field"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="form-group mb-4">
              <label className="input-label">Biography & Expertise</label>
              <textarea
                className="input-field"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell other users and attendees about yourself..."
              />
            </div>

            <div className="form-group mb-5">
              <label className="input-label">Platform Role</label>
              <div className="role-options-grid">
                <div
                  className={`role-option-card ${formData.role === 'USER' ? 'role-option-active' : ''}`}
                  onClick={() => setFormData({ ...formData, role: 'USER' })}
                >
                  <div className="role-option-icon">
                    <UserCheck size={20} />
                  </div>
                  <div className="role-option-info">
                    <div className="role-name">User / Attendee</div>
                    <div className="role-desc">Browse and book sessions.</div>
                  </div>
                </div>

                <div
                  className={`role-option-card ${formData.role === 'CREATOR' ? 'role-option-active' : ''}`}
                  onClick={() => setFormData({ ...formData, role: 'CREATOR' })}
                >
                  <div className="role-option-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="role-option-info">
                    <div className="role-name">Creator / Host</div>
                    <div className="role-desc">Publish and manage workshops.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('catalog')}
              >
                Back to Catalog
              </button>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Check size={16} />
                <span>{loading ? 'Saving Changes...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
