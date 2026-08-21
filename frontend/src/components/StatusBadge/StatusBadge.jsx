/**
 * StatusBadge
 *
 * Small dot indicator for online/offline status.
 * Green with pulse animation when online, gray when offline.
 */
import './StatusBadge.css';

export default function StatusBadge({ isOnline = false, size = 'md' }) {
  return (
    <span
      className={`status-badge status-badge--${size} ${isOnline ? 'status-badge--online' : 'status-badge--offline'}`}
      aria-label={isOnline ? 'Online' : 'Offline'}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
