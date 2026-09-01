/**
 * MatchNotification Modal / Toast Component
 *
 * Clean, subtle notification that appears when two users connect.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getFullPhotoUrl, getDefaultPetPhoto } from '../../utils/petPhotos';
import './MatchNotification.css';

export default function MatchNotification() {
  const [matchData, setMatchData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { onMessage } = useWebSocket();

  useEffect(() => {
    // 1. Listen for real-time WebSocket 'match' events
    const unsub = onMessage('match', (payload) => {
      setMatchData(payload);
      setIsOpen(true);
    });

    // 2. Listen for local direct connection events (e.g. from Discover page)
    const handleLocalMatch = (e) => {
      if (e.detail) {
        setMatchData(e.detail);
        setIsOpen(true);
      }
    };
    window.addEventListener('pawly-local-match', handleLocalMatch);

    return () => {
      unsub();
      window.removeEventListener('pawly-local-match', handleLocalMatch);
    };
  }, [onMessage]);

  if (!isOpen || !matchData) return null;

  const handleOpenChat = () => {
    setIsOpen(false);
    if (matchData.chat_id) {
      navigate(`/chats/${matchData.chat_id}`);
    } else {
      navigate('/chats');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const pet1Name = matchData.pet1_name || 'Your Pet';
  const pet2Name = matchData.pet2_name || matchData.target_pet_name || 'Pet Buddy';

  return (
    <div className="match-notif-backdrop" onClick={handleClose}>
      <div
        className="match-notif-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="match-notif-close-btn"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ✕
        </button>

        <div className="match-notif-badge">Connected</div>

        <div className="match-notif-avatars">
          <div className="match-notif-avatar-wrap">
            <img
              src={getFullPhotoUrl(matchData.pet1_photo, getDefaultPetPhoto(1, 'dog', pet1Name))}
              alt={pet1Name}
              className="match-notif-avatar"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.src = '/paw-icon.svg';
              }}
            />
          </div>
          <div className="match-notif-avatar-wrap">
            <img
              src={getFullPhotoUrl(matchData.pet2_photo, getDefaultPetPhoto(2, 'dog', pet2Name))}
              alt={pet2Name}
              className="match-notif-avatar"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.src = getDefaultPetPhoto(2, 'dog', pet2Name);
              }}
            />
          </div>
        </div>

        <h3 className="match-notif-title">
          {pet1Name} and {pet2Name}
        </h3>

        <p className="match-notif-subtext">
          You are now connected. Say hi to set up a playdate!
        </p>

        <div className="match-notif-actions">
          <button
            type="button"
            className="match-notif-btn-primary"
            onClick={handleOpenChat}
            id="match-open-chat-btn"
          >
            Open Chat
          </button>
          <button
            type="button"
            className="match-notif-btn-secondary"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
