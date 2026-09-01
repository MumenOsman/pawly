/**
 * ChatList Page
 *
 * Recent messages list matching wireframe row 6 (right).
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { getChats } from '../../api/chats';
import './ChatList.css';

export default function ChatList() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getChats();
        setChats(data || []);
      } catch {
        setChats([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredChats = chats.filter((chat) => {
    if (filter === 'unread') return chat.unread_count > 0;
    return true;
  });

  return (
    <div className="chat-list-page" id="chat-list-page">
      <Navbar />

      <main className="chat-list-page__content">
        <div className="chat-list-card">
          {chats.length > 0 && (
            <div className="chat-list-banner">
              <p>
                <strong>Connected!</strong> You have active connections. You can send them a message below.
              </p>
            </div>
          )}

          <div className="chat-list-header">
            <h1>Messages</h1>
            <div className="chat-list-tabs">
              <button
                className={`chat-list-tab ${filter === 'all' ? 'chat-list-tab--active' : ''}`}
                onClick={() => setFilter('all')}
                id="chat-tab-all"
              >
                All
              </button>
              <button
                className={`chat-list-tab ${filter === 'unread' ? 'chat-list-tab--active' : ''}`}
                onClick={() => setFilter('unread')}
                id="chat-tab-unread"
              >
                Unread
              </button>
            </div>
          </div>

          {loading ? (
            <div className="chat-list-loading">
              <div className="chat-list-spinner" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="chat-list-empty">
              <p>No messages yet. Connect with pet owners to start chatting!</p>
            </div>
          ) : (
            <div className="chat-list-items">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${chat.unread_count > 0 ? 'chat-item--unread' : ''}`}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  id={`chat-item-${chat.id}`}
                >
                  <div className="chat-item__avatar-wrapper">
                    <img
                      src={chat.other_pet?.pet_photo || '/placeholder-pet.svg'}
                      alt={chat.other_pet?.pet_name}
                      className="chat-item__avatar"
                    />
                    <StatusBadge isOnline={chat.is_online} size="sm" />
                  </div>

                  <div className="chat-item__info">
                    <div className="chat-item__top">
                      <h3 className="chat-item__name">
                        {chat.other_pet?.pet_name} & {chat.other_user?.owner_name}
                      </h3>
                      <span className="chat-item__time">{chat.last_message?.time}</span>
                    </div>

                    <div className="chat-item__bottom">
                      <p className="chat-item__preview truncate">{chat.last_message?.body || 'No messages yet'}</p>
                      {chat.unread_count > 0 && (
                        <span className="chat-item__badge">{chat.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
