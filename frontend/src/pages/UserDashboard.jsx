import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CalendarCheck2,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Compass,
} from 'lucide-react';

export const UserDashboard = ({ onSelectSession, onNavigate }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await api.get('/bookings/my-bookings/');
      setBookings(data);
    } catch (err) {
      showToast('Error loading your bookings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async (bookingId, sessionTitle) => {
    if (!window.confirm(`Are you sure you want to cancel your seat for "${sessionTitle}"? Your seat will be restored to the available pool.`)) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/cancel/`);
      showToast(`Booking cancelled. Your seat for "${sessionTitle}" is released.`, 'info');
      await fetchBookings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-container">
        <div className="empty-state-card">
          <CalendarCheck2 size={40} className="text-cyan-400 mb-3" />
          <h2>Sign In to View Your Bookings</h2>
          <p>Please sign in to access your active session passes and attendance history.</p>
          <button className="btn btn-primary mt-4" onClick={() => openAuthModal('USER')}>
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  const activeBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.session?.start_time) > new Date()
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'CANCELLED' || new Date(b.session?.start_time) <= new Date()
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header-row">
        <div>
          <div className="hero-badge">
            <CalendarCheck2 size={14} className="text-emerald-400" />
            <span>My Schedule</span>
          </div>
          <h1 className="page-title">My Bookings & Passes</h1>
          <p className="page-subtitle">
            Manage your confirmed workshop seats and review past participation.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => onNavigate('catalog')}>
          <Compass size={18} />
          <span>Browse More Sessions</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state-card">
          <CalendarCheck2 size={36} className="text-muted mb-2" />
          <h3>No Bookings Found</h3>
          <p>You haven't reserved a seat in any sessions yet.</p>
          <button className="btn btn-primary mt-3" onClick={() => onNavigate('catalog')}>
            Explore Session Marketplace
          </button>
        </div>
      ) : (
        <div className="bookings-sections-stack">
          {/* Active Bookings */}
          <div className="bookings-group">
            <h2 className="section-title mb-3">
              Active Confirmed Seats ({activeBookings.length})
            </h2>

            {activeBookings.length === 0 ? (
              <div className="empty-state-subtle">
                <p className="text-sm text-muted">You have no upcoming active bookings.</p>
              </div>
            ) : (
              <div className="bookings-cards-grid">
                {activeBookings.map((booking) => {
                  const session = booking.session;
                  return (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-card-top">
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Confirmed Seat
                        </span>
                        <span className="booking-ref">Ref #{booking.id}</span>
                      </div>

                      <h3
                        className="booking-session-title hover-link"
                        onClick={() => onSelectSession(session.id)}
                      >
                        {session.title}
                      </h3>

                      <div className="booking-host-info">
                        <img
                          src={
                            session.creator?.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              session.creator?.first_name || 'Creator'
                            )}&background=4f46e5&color=fff`
                          }
                          alt="Host"
                          className="creator-avatar-xs"
                        />
                        <span>Host: {session.creator?.first_name || session.creator?.email}</span>
                      </div>

                      <div className="booking-meta-row">
                        <div className="meta-item">
                          <Calendar size={14} className="text-cyan-400" />
                          <span>
                            {new Date(session.start_time).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="meta-item">
                          <Clock size={14} className="text-cyan-400" />
                          <span>
                            {new Date(session.start_time).toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="booking-card-footer">
                        <button
                          className="btn-link"
                          onClick={() => onSelectSession(session.id)}
                        >
                          <span>Session Details</span>
                          <ArrowRight size={14} />
                        </button>

                        <button
                          className="btn btn-danger-outline btn-xs"
                          onClick={() => handleCancelBooking(booking.id, session.title)}
                          disabled={cancellingId === booking.id}
                        >
                          {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past & Cancelled Bookings */}
          {pastBookings.length > 0 && (
            <div className="bookings-group mt-5">
              <h2 className="section-title mb-3">Past & Cancelled Bookings ({pastBookings.length})</h2>
              <div className="bookings-cards-grid">
                {pastBookings.map((booking) => {
                  const session = booking.session;
                  const isCancelled = booking.status === 'CANCELLED';

                  return (
                    <div key={booking.id} className="booking-card booking-card-past">
                      <div className="booking-card-top">
                        <span className={`badge ${isCancelled ? 'badge-cancelled' : 'badge-completed'}`}>
                          {isCancelled ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {isCancelled ? 'Cancelled' : 'Completed'}
                        </span>
                        <span className="booking-ref">Ref #{booking.id}</span>
                      </div>

                      <h4
                        className="booking-session-title hover-link text-muted"
                        onClick={() => onSelectSession(session.id)}
                      >
                        {session.title}
                      </h4>

                      <div className="text-xs text-muted">
                        Scheduled:{' '}
                        {new Date(session.start_time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
