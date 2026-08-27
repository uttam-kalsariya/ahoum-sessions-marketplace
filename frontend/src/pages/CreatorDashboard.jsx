import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CreateEditSessionModal } from '../components/CreateEditSessionModal';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';

export const CreatorDashboard = ({ onSelectSession }) => {
  const { user, isCreator, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [mySessions, setMySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [attendeeModalSession, setAttendeeModalSession] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMySessions = useCallback(async () => {
    if (!isCreator) return;
    setLoading(true);
    try {
      const data = await api.get('/sessions/my-sessions/');
      setMySessions(data);
    } catch (err) {
      showToast('Error loading your creator sessions: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isCreator, showToast]);

  useEffect(() => {
    fetchMySessions();
  }, [fetchMySessions]);

  const handleDelete = async (sessionId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(sessionId);
    try {
      await api.delete(`/sessions/${sessionId}/`);
      showToast(`Session "${title}" deleted.`, 'success');
      await fetchMySessions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = (session) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingSession(null);
    setModalOpen(true);
  };

  if (!isCreator) {
    return (
      <div className="page-container">
        <div className="empty-state-card">
          <AlertCircle size={40} className="text-amber-400 mb-3" />
          <h2>Creator Studio Access Required</h2>
          <p>You need the Creator role to create, manage, and inspect sessions.</p>
          <button className="btn btn-primary mt-4" onClick={() => openAuthModal('CREATOR')}>
            Switch or Sign in as Creator
          </button>
        </div>
      </div>
    );
  }

  // Summary Metrics
  const totalSessions = mySessions.length;
  const totalBookings = mySessions.reduce((acc, s) => acc + (s.confirmed_bookings_count || 0), 0);
  const activeOfferings = mySessions.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header-row">
        <div>
          <div className="hero-badge">
            <Layers size={14} className="text-cyan-400" />
            <span>Creator Studio</span>
          </div>
          <h1 className="page-title">Manage Your Sessions</h1>
          <p className="page-subtitle">
            Create new sessions, monitor real-time bookings, and review attendee rosters.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Create New Session</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrapper text-indigo-400">
            <Layers size={22} />
          </div>
          <div>
            <div className="metric-label">Total Sessions</div>
            <div className="metric-value">{totalSessions}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper text-emerald-400">
            <Users size={22} />
          </div>
          <div>
            <div className="metric-label">Total Attendees Booked</div>
            <div className="metric-value">{totalBookings}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper text-amber-400">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="metric-label">Active Offerings</div>
            <div className="metric-value">{activeOfferings}</div>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="creator-sessions-container">
        <h2 className="section-title mb-4">Your Published Sessions</h2>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading creator sessions...</p>
          </div>
        ) : mySessions.length === 0 ? (
          <div className="empty-state-card">
            <Layers size={36} className="text-muted mb-2" />
            <h3>No Sessions Yet</h3>
            <p>You haven't created any sessions yet. Click below to publish your first offering!</p>
            <button className="btn btn-primary mt-3" onClick={handleOpenCreate}>
              <Plus size={16} /> Create Session
            </button>
          </div>
        ) : (
          <div className="creator-table-wrapper">
            <table className="creator-table">
              <thead>
                <tr>
                  <th>Session Title</th>
                  <th>Schedule</th>
                  <th>Capacity & Bookings</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mySessions.map((session) => {
                  const booked = session.confirmed_bookings_count || 0;
                  const capacity = session.capacity;
                  const percent = Math.min(100, Math.round((booked / capacity) * 100));

                  return (
                    <tr key={session.id}>
                      <td className="table-title-cell">
                        <div
                          className="font-medium hover-link cursor-pointer"
                          onClick={() => onSelectSession(session.id)}
                        >
                          {session.title}
                        </div>
                        <div className="text-xs text-muted truncate max-w-xs">
                          {session.description}
                        </div>
                      </td>

                      <td>
                        <div className="text-sm font-medium">
                          {new Date(session.start_time).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(session.start_time).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td>
                        <div className="flex-between text-xs mb-1">
                          <span>{booked} / {capacity} seats</span>
                          <span className="text-muted">{percent}%</span>
                        </div>
                        <div className="capacity-progress-track">
                          <div
                            className={`capacity-progress-bar ${booked >= capacity ? 'progress-full' : ''}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="font-semibold text-emerald-400">
                        {parseFloat(session.price) > 0 ? `$${parseFloat(session.price).toFixed(2)}` : 'FREE'}
                      </td>

                      <td>
                        <span className={`status-badge status-${session.status?.toLowerCase()}`}>
                          {session.status}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions-cell">
                          <button
                            className="icon-action-btn"
                            title="View Attendee Roster"
                            onClick={() => setAttendeeModalSession(session)}
                          >
                            <Users size={16} />
                          </button>
                          <button
                            className="icon-action-btn"
                            title="Edit Session"
                            onClick={() => handleOpenEdit(session)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="icon-action-btn text-rose-400 hover:text-rose-300"
                            title="Delete Session"
                            onClick={() => handleDelete(session.id, session.title)}
                            disabled={deletingId === session.id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <CreateEditSessionModal
        session={editingSession}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchMySessions}
      />

      {/* Attendee Roster Modal */}
      {attendeeModalSession && (
        <div className="modal-backdrop" onClick={() => setAttendeeModalSession(null)}>
          <div className="modal-content attendee-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Attendee Roster</h3>
                <p className="modal-subtitle">{attendeeModalSession.title}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setAttendeeModalSession(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="attendee-modal-body">
              {!attendeeModalSession.attendees || attendeeModalSession.attendees.length === 0 ? (
                <div className="empty-state-card py-6">
                  <Users size={32} className="text-muted mb-2" />
                  <p>No confirmed attendees yet for this session.</p>
                </div>
              ) : (
                <div className="attendee-list">
                  {attendeeModalSession.attendees.map((attendee) => (
                    <div key={attendee.id} className="attendee-item">
                      <img
                        src={
                          attendee.user?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            attendee.user?.first_name || attendee.user?.email || 'Attendee'
                          )}&background=4f46e5&color=fff`
                        }
                        alt="Attendee"
                        className="attendee-avatar-sm"
                      />
                      <div className="attendee-details">
                        <div className="attendee-name font-medium">
                          {attendee.user?.first_name
                            ? `${attendee.user.first_name} ${attendee.user.last_name || ''}`
                            : attendee.user?.email}
                        </div>
                        <div className="text-xs text-muted">{attendee.user?.email}</div>
                      </div>
                      <div className="text-right">
                        <span className="badge badge-confirmed">Confirmed</span>
                        <div className="text-xs text-muted mt-1">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
