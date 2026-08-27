import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  UserCheck,
} from 'lucide-react';

export const SessionDetailPage = ({ sessionId, onBack, onNavigate }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get(`/sessions/${sessionId}/`);
      setSession(data);
    } catch (err) {
      setErrorMessage(err.message);
      showToast('Could not load session: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleBook = async () => {
    if (!isAuthenticated) {
      openAuthModal('USER');
      return;
    }

    setBookingLoading(true);
    setErrorMessage(null);
    try {
      await api.post(`/sessions/${sessionId}/book/`);
      showToast(`Successfully booked seat for "${session.title}"!`, 'success');
      await fetchSession();
    } catch (err) {
      setErrorMessage(err.message);
      showToast(err.message, 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!session?.user_booking_id) return;

    setCancellingLoading(true);
    try {
      await api.post(`/bookings/${session.user_booking_id}/cancel/`);
      showToast('Booking cancelled. Your seat has been released back to the pool.', 'info');
      await fetchSession();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancellingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container loading-state">
        <div className="spinner" />
        <p>Loading session details...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-container">
        <button className="btn btn-secondary btn-sm mb-4" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Catalog
        </button>
        <div className="empty-state-card">
          <AlertCircle size={36} className="text-rose-400 mb-2" />
          <h3>Session Not Found</h3>
          <p>{errorMessage || 'The requested session could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === session.creator?.id;
  const isBooked = session.user_has_booked;
  const isSoldOut = session.is_sold_out;
  const hasStarted = session.has_started;
  const remaining = session.remaining_seats;
  const capacity = session.capacity;
  const percentFilled = Math.min(100, Math.round(((capacity - remaining) / capacity) * 100));

  const formatDate = (isoStr) => {
    return new Date(isoStr).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeRange = (startIso, endIso) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const startStr = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    const endStr = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="page-container session-detail-page">
      {/* Back button */}
      <div className="detail-top-nav">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      </div>

      <div className="detail-layout-grid">
        {/* Left Column: Details & Creator Bio */}
        <div className="detail-main-content">
          <div className="detail-header-card">
            <div className="detail-badges">
              <span className={`status-badge status-${session.status.toLowerCase()}`}>
                {session.status}
              </span>
              {isBooked && (
                <span className="badge badge-booked">
                  <CheckCircle2 size={12} /> Booked by You
                </span>
              )}
            </div>

            <h1 className="detail-title">{session.title}</h1>

            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <Calendar size={18} className="text-cyan-400" />
                <div>
                  <div className="text-xs text-muted">Date</div>
                  <div className="font-medium">{formatDate(session.start_time)}</div>
                </div>
              </div>

              <div className="detail-meta-item">
                <Clock size={18} className="text-cyan-400" />
                <div>
                  <div className="text-xs text-muted">Time</div>
                  <div className="font-medium">{formatTimeRange(session.start_time, session.end_time)}</div>
                </div>
              </div>

              <div className="detail-meta-item">
                <DollarSign size={18} className="text-emerald-400" />
                <div>
                  <div className="text-xs text-muted">Price</div>
                  <div className="font-medium">
                    {parseFloat(session.price) > 0 ? `$${parseFloat(session.price).toFixed(2)} USD` : 'FREE'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="content-card">
            <h2 className="section-title">About this Session</h2>
            <div className="session-full-description">
              {session.description.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Creator Profile Section */}
          <div className="content-card creator-bio-card">
            <h2 className="section-title">Session Host</h2>
            <div className="creator-profile-layout">
              <img
                src={
                  session.creator?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    session.creator?.first_name || 'Creator'
                  )}&background=6366f1&color=fff`
                }
                alt={session.creator?.first_name}
                className="creator-avatar-lg"
              />
              <div className="creator-bio-details">
                <div className="creator-bio-name-row">
                  <h3 className="creator-full-name">
                    {session.creator?.first_name
                      ? `${session.creator.first_name} ${session.creator.last_name || ''}`
                      : session.creator?.email}
                  </h3>
                  <span className="creator-role-tag">
                    <ShieldCheck size={12} /> Host & Creator
                  </span>
                </div>
                <p className="creator-bio-text">
                  {session.creator?.bio || 'Experienced software professional and mentor on Ahoum.'}
                </p>
                <div className="text-xs text-muted">Contact: {session.creator?.email}</div>
              </div>
            </div>
          </div>

          {/* Attendee Roster (Visible ONLY to Creator of this session) */}
          {isOwner && (
            <div className="content-card attendee-roster-card">
              <div className="flex-between mb-3">
                <h2 className="section-title">
                  <UserCheck size={18} className="inline mr-2 text-cyan-400" />
                  Live Attendee Roster ({session.attendees?.length || 0})
                </h2>
                <span className="text-xs text-muted">Protected Creator Endpoint</span>
              </div>

              {!session.attendees || session.attendees.length === 0 ? (
                <p className="text-sm text-muted">No attendees have booked this session yet.</p>
              ) : (
                <div className="attendee-list">
                  {session.attendees.map((attendee) => (
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
                        <div className="attendee-name">
                          {attendee.user?.first_name
                            ? `${attendee.user.first_name} ${attendee.user.last_name || ''}`
                            : attendee.user?.email}
                        </div>
                        <div className="attendee-email">{attendee.user?.email}</div>
                      </div>
                      <div className="attendee-meta">
                        <span className="badge badge-confirmed">Confirmed</span>
                        <span className="text-xs text-muted">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Booking Action Card */}
        <div className="detail-sidebar">
          <div className="booking-action-card sticky-sidebar">
            <h3 className="sidebar-card-title">Seat Availability</h3>

            {/* Error Message if booking fails */}
            {errorMessage && (
              <div className="auth-error-banner mb-3">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <div className="auth-error-text text-xs">{errorMessage}</div>
              </div>
            )}

            {/* Inventory Visualizer */}
            <div className="inventory-block">
              <div className="inventory-stat-row">
                <span className="inventory-stat-label">Remaining Seats</span>
                <span className={`inventory-count ${remaining === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {remaining} <span className="text-xs text-muted">/ {capacity}</span>
                </span>
              </div>

              <div className="capacity-progress-track mb-3">
                <div
                  className={`capacity-progress-bar ${isSoldOut ? 'progress-full' : ''}`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>

              <div className="concurrency-lock-badge">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span>Protected by PostgreSQL Row Lock</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="booking-buttons-stack">
              {isOwner ? (
                <button className="btn btn-secondary btn-block" onClick={() => onNavigate('creator')}>
                  Manage in Creator Studio
                </button>
              ) : isBooked ? (
                <div className="booked-state-box">
                  <div className="booked-status-banner">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>You have confirmed a seat!</span>
                  </div>
                  <button
                    className="btn btn-danger-outline btn-block btn-sm"
                    onClick={handleCancelBooking}
                    disabled={cancellingLoading}
                  >
                    {cancellingLoading ? 'Cancelling...' : 'Cancel Booking & Release Seat'}
                  </button>
                </div>
              ) : hasStarted ? (
                <button className="btn btn-disabled btn-block" disabled>
                  Session Has Ended
                </button>
              ) : isSoldOut ? (
                <button className="btn btn-soldout btn-block" disabled>
                  Session Sold Out
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-block btn-lg"
                  onClick={handleBook}
                  disabled={bookingLoading}
                >
                  <Zap size={18} />
                  <span>{bookingLoading ? 'Securing Seat (Locking)...' : 'Confirm & Reserve Seat'}</span>
                </button>
              )}
            </div>

            <p className="sidebar-hint text-xs text-center text-muted mt-3">
              Real-time transactional locking ensures instant seat confirmation without race conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
