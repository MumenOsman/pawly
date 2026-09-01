/**
 * Connections Page
 *
 * Incoming connection requests & active pet connections list.
 */
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import PetCard from '../../components/PetCard/PetCard';
import Button from '../../components/Button/Button';
import {
  getConnections,
  getConnectionRequests,
  acceptConnection,
  dismissConnection,
  disconnect
} from '../../api/connections';
import './Connections.css';

export default function Connections() {
  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConnections() {
      setLoading(true);
      try {
        const [reqs, conns] = await Promise.all([
          getConnectionRequests().catch(() => []),
          getConnections().catch(() => []),
        ]);

        if (reqs.length > 0) {
          setRequests(reqs);
        } else {
          // Mock requests
          setRequests([
            {
              id: 101,
              sender_pet: {
                id: 10,
                pet_name: 'Sisu',
                animal_type: 'dog',
                breed: 'English Bulldog',
                size: 'small',
                about_me: 'Loves playdates and short forest walks.',
                pet_photo: '',
                energy_level: 'high',
                temperament: ['playful', 'friendly'],
              }
            }
          ]);
        }

        if (conns.length > 0) {
          setConnections(conns);
        } else {
          // Mock connections
          setConnections([
            {
              id: 201,
              other_pet: {
                id: 11,
                pet_name: 'Santa',
                animal_type: 'dog',
                breed: 'Husky',
                size: 'large',
                about_me: 'Loves hiking and winter trails.',
                pet_photo: '',
                energy_level: 'high',
                temperament: ['energetic', 'social'],
              }
            }
          ]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadConnections();
  }, []);

  const handleAccept = async (reqId) => {
    try {
      await acceptConnection(reqId);
    } catch {}
    const accepted = requests.find((r) => r.id === reqId);
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    if (accepted && accepted.sender_pet) {
      setConnections((prev) => [...prev, { id: Date.now(), other_pet: accepted.sender_pet }]);
    }
  };

  const handleDismiss = async (reqId) => {
    try {
      await dismissConnection(reqId);
    } catch {}
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleDisconnect = async (petId) => {
    const conn = connections.find((c) => c.other_pet?.id === petId);
    if (conn) {
      try {
        await disconnect(conn.id);
      } catch {}
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    }
  };

  return (
    <div className="connections-page" id="connections-page">
      <Navbar />

      <main className="connections-page__content">
        <h1 className="connections-page__title">Connections & Invitations</h1>

        {loading ? (
          <div className="connections-page__loading">
            <div className="connections-page__spinner" />
          </div>
        ) : (
          <div className="connections-page__sections">
            {/* Incoming Requests */}
            <section className="connections-section">
              <h2 className="connections-section__title">
                Incoming Connection Requests ({requests.length})
              </h2>

              {requests.length === 0 ? (
                <p className="connections-section__empty">No pending invitations.</p>
              ) : (
                <div className="connections-grid">
                  {requests.map((req) => (
                    <div key={req.id} className="connection-request-card">
                      <PetCard
                        pet={req.sender_pet || req}
                        showActions={false}
                      />
                      <div className="connection-request-card__actions">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAccept(req.id)}
                          id={`accept-req-${req.id}`}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDismiss(req.id)}
                          id={`dismiss-req-${req.id}`}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Active Connections */}
            <section className="connections-section">
              <h2 className="connections-section__title">
                Connected Buddies ({connections.length})
              </h2>

              {connections.length === 0 ? (
                <p className="connections-section__empty">No active connections yet. Connect with pets on Discover!</p>
              ) : (
                <div className="connections-grid">
                  {connections.map((conn) => (
                    <PetCard
                      key={conn.id}
                      pet={conn.other_pet || conn}
                      isConnected={true}
                      onDisconnect={handleDisconnect}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
