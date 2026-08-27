import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { X, Calendar, Clock, Users, DollarSign, AlertCircle } from 'lucide-react';

export const CreateEditSessionModal = ({ session = null, isOpen, onClose, onSuccess }) => {
  const isEditing = !!session;
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    capacity: 5,
    price: '0.00',
    status: 'ACTIVE',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (session) {
      // Format ISO string to datetime-local format: YYYY-MM-DDTHH:mm
      const formatDT = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      };

      setFormData({
        title: session.title || '',
        description: session.description || '',
        start_time: formatDT(session.start_time),
        end_time: formatDT(session.end_time),
        capacity: session.capacity || 5,
        price: session.price || '0.00',
        status: session.status || 'ACTIVE',
      });
    } else {
      // Default new session starting tomorrow
      const now = new Date();
      const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
      end.setMinutes(end.getMinutes() - end.getTimezoneOffset());

      setFormData({
        title: '',
        description: '',
        start_time: start.toISOString().slice(0, 16),
        end_time: end.toISOString().slice(0, 16),
        capacity: 5,
        price: '29.00',
        status: 'ACTIVE',
      });
    }
    setErrorMessage(null);
  }, [session, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!formData.title.trim()) {
      setErrorMessage('Please enter a session title.');
      return;
    }
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
      setErrorMessage('Session end time must be strictly after the start time.');
      return;
    }
    if (parseInt(formData.capacity, 10) < 1) {
      setErrorMessage('Capacity must be at least 1 seat.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        capacity: parseInt(formData.capacity, 10),
        price: parseFloat(formData.price || 0).toFixed(2),
        status: formData.status,
      };

      if (isEditing) {
        await api.patch(`/sessions/${session.id}/`, payload);
        showToast('Session updated successfully!', 'success');
      } else {
        await api.post('/sessions/', payload);
        showToast('New session published to marketplace!', 'success');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content session-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{isEditing ? 'Edit Session Details' : 'Create New Session'}</h2>
            <p className="modal-subtitle">
              {isEditing
                ? 'Update your session capacity, schedule, or details.'
                : 'Publish a new workshop or mentoring session to the marketplace.'}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="auth-error-banner mb-4">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <div className="auth-error-text">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="session-form">
          <div className="form-group mb-3">
            <label className="input-label">Session Title *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Distributed Systems Architecture Workshop"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group mb-3">
            <label className="input-label">Description</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Detailed description of what attendees will learn..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-row-2 mb-3">
            <div className="form-group">
              <label className="input-label">
                <Calendar size={14} className="inline mr-1" /> Start Time (Local) *
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                <Clock size={14} className="inline mr-1" /> End Time (Local) *
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row-2 mb-4">
            <div className="form-group">
              <label className="input-label">
                <Users size={14} className="inline mr-1" /> Max Capacity (Seats) *
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
              <span className="text-xs text-muted">
                Pessimistic DB lock guarantees no oversubscription.
              </span>
            </div>

            <div className="form-group">
              <label className="input-label">
                <DollarSign size={14} className="inline mr-1" /> Price ($ USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          {isEditing && (
            <div className="form-group mb-4">
              <label className="input-label">Session Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">Active (Open for Booking)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          <div className="modal-actions-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Session' : 'Publish Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
