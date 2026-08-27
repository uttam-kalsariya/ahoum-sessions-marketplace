import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Sparkles,
  Zap,
  Tag,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Sessions' },
  { id: 'concurrency', label: '⚡ Concurrency & DB' },
  { id: 'fullstack', label: '🎨 React & Full-Stack' },
  { id: 'ai', label: '🤖 AI Agents & LLMs' },
  { id: 'available', label: '🎟️ Available Seats' },
];

export const CatalogPage = ({ onSelectSession, onNavigate }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [bookingInProgressId, setBookingInProgressId] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '/sessions/';
      const params = new URLSearchParams();
      if (upcomingOnly) params.append('upcoming', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const qs = params.toString();
      if (qs) endpoint += `?${qs}`;

      const data = await api.get(endpoint);
      setSessions(data);
    } catch (err) {
      showToast('Failed to load marketplace sessions: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [upcomingOnly, searchQuery, showToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleQuickBook = async (e, session) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('USER');
      return;
    }

    if (session.user_has_booked) {
      onNavigate('my-bookings');
      return;
    }

    if (session.creator?.id === user?.id) {
      onNavigate('creator');
      return;
    }

    setBookingInProgressId(session.id);
    try {
      await api.post(`/sessions/${session.id}/book/`);
      showToast(`Seat confirmed for "${session.title}"!`, 'success');
      await fetchSessions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBookingInProgressId(null);
    }
  };

  // Client-side category filtering
  const filteredSessions = sessions.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'available') return s.remaining_seats > 0;
    if (selectedCategory === 'concurrency') {
      return (
        s.title.toLowerCase().includes('concurrency') ||
        s.title.toLowerCase().includes('locking') ||
        s.description.toLowerCase().includes('locking')
      );
    }
    if (selectedCategory === 'fullstack') {
      return (
        s.title.toLowerCase().includes('react') ||
        s.title.toLowerCase().includes('full-stack') ||
        s.description.toLowerCase().includes('django')
      );
    }
    if (selectedCategory === 'ai') {
      return (
        s.title.toLowerCase().includes('agent') ||
        s.title.toLowerCase().includes('llm') ||
        s.description.toLowerCase().includes('ai')
      );
    }
    return true;
  });

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <section className="catalog-hero">
        <div className="hero-badge">
          <Sparkles size={14} className="text-amber-400" />
          <span>Real-Time Seat Inventory & Booking Engine</span>
        </div>
        <h1 className="hero-title">
          Explore Live Sessions & <span className="text-gradient">Reserve Real-Time Seats</span>
        </h1>
        <p className="hero-subtitle">
          Built with transactional PostgreSQL row-level locks (<code className="code-pill">SELECT FOR UPDATE</code>) guaranteeing zero oversubscription under high concurrent demand.
        </p>

        {/* Search & Filter Bar */}
        <div className="catalog-filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by topic, keyword, or creator name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <label className="toggle-filter-label">
              <input
                type="checkbox"
                checked={upcomingOnly}
                onChange={(e) => setUpcomingOnly(e.target.checked)}
                className="toggle-checkbox"
              />
              <Filter size={14} />
              <span>Upcoming Only</span>
            </label>
          </div>
        </div>

        {/* Category Chips */}
        <div className="category-chips-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-chip ${selectedCategory === cat.id ? 'category-chip-active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="catalog-grid-section">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading live sessions from marketplace...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state-card">
            <AlertTriangle size={36} className="text-amber-400 mb-2" />
            <h3>No Sessions Found</h3>
            <p>Try switching category filters or clearing your search keywords.</p>
            <button
              className="btn btn-secondary btn-sm mt-3"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="sessions-grid">
            {filteredSessions.map((session) => {
              const isOwner = user?.id === session.creator?.id;
              const isBooked = session.user_has_booked;
              const isFull = session.is_sold_out;
              const hasStarted = session.has_started;
              const remaining = session.remaining_seats;
              const capacity = session.capacity;
              const percentFilled = Math.min(100, Math.round(((capacity - remaining) / capacity) * 100));

              return (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => onSelectSession(session.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && onSelectSession(session.id)}
                >
                  {/* Card Header */}
                  <div className="session-card-header">
                    <div className="creator-summary">
                      <img
                        src={
                          session.creator?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            session.creator?.first_name || 'Creator'
                          )}&background=4f46e5&color=fff`
                        }
                        alt={session.creator?.first_name}
                        className="creator-avatar-sm"
                      />
                      <div className="creator-info">
                        <span className="creator-name">
                          {session.creator?.first_name
                            ? `${session.creator.first_name} ${session.creator.last_name || ''}`
                            : session.creator?.email}
                        </span>
                        <span className="creator-role-tag">
                          <ShieldCheck size={11} className="inline mr-0.5" /> Host
                        </span>
                      </div>
                    </div>

                    <div className="price-tag">
                      {parseFloat(session.price) > 0 ? `$${parseFloat(session.price).toFixed(2)}` : 'FREE'}
                    </div>
                  </div>

                  {/* Card Body */}
                  <h3 className="session-card-title">{session.title}</h3>
                  <p className="session-card-description">{session.description}</p>

                  {/* Meta Details */}
                  <div className="session-card-meta">
                    <div className="meta-item">
                      <Calendar size={14} className="text-cyan-400" />
                      <span>{formatDate(session.start_time)}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={14} className="text-cyan-400" />
                      <span>{formatTime(session.start_time)}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="capacity-inventory-box">
                    <div className="capacity-inventory-header">
                      <span className="capacity-label">
                        <Users size={14} /> Capacity
                      </span>
                      <span className={`seats-badge ${isFull ? 'seats-soldout' : 'seats-available'}`}>
                        {hasStarted
                          ? 'Session Ended'
                          : isFull
                          ? 'Sold Out'
                          : `${remaining} of ${capacity} seats remaining`}
                      </span>
                    </div>
                    <div className="capacity-progress-track">
                      <div
                        className={`capacity-progress-bar ${isFull ? 'progress-full' : ''}`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="session-card-footer">
                    <button
                      className="btn-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session.id);
                      }}
                    >
                      <span>View Full Details</span>
                      <ArrowRight size={14} />
                    </button>

                    {isOwner ? (
                      <span className="badge badge-owner">Your Offering</span>
                    ) : isBooked ? (
                      <button
                        className="btn btn-booked btn-sm"
                        onClick={(e) => handleQuickBook(e, session)}
                        title="You already have a confirmed seat in this session"
                      >
                        <CheckCircle2 size={14} />
                        <span>Booked (View)</span>
                      </button>
                    ) : hasStarted ? (
                      <button className="btn btn-disabled btn-sm" disabled>
                        Ended
                      </button>
                    ) : isFull ? (
                      <button className="btn btn-soldout btn-sm" disabled>
                        Sold Out
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => handleQuickBook(e, session)}
                        disabled={bookingInProgressId === session.id}
                      >
                        <Zap size={14} />
                        <span>{bookingInProgressId === session.id ? 'Reserving...' : 'Book Seat'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
