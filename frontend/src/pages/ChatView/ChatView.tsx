/**
 * Unified Chat Page
 *
 * 3-Column Layout matching Wireframe Row 6 Right & Row 7 Right:
 *   - Left Column: Messages List (All / Unread filters)
 *   - Middle Column: Active Chat Stream & Input
 *   - Right Column: Pet & Owner Profile Summary
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import MatchRing from '../../components/MatchRing/MatchRing';
import Button from '../../components/Button/Button';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getChats, getMessages, markAsRead, sendChatMessage } from '../../api/chats';
import { getMyProfile } from '../../api/users';
import { getFullPhotoUrl, getDefaultPetPhoto } from '../../utils/petPhotos';
import './ChatView.css';

const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr === 'Just now' || (dateStr.includes('M') && !dateStr.includes('T'))) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    }

    const dateFormatted = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return `${dateFormatted}, ${timeStr}`;
  } catch {
    return dateStr;
  }
};

const formatMatchDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted} at ${timeStr}`;
  } catch {
    return dateStr;
  }
};

const WELCOME_CHAT = {
  id: 'welcome',
  connection_id: 0,
  is_online: false,
  other_pet: {
    id: 0,
    pet_name: 'Pawly',
    breed: 'Playmate Matcher',
    size: 'Companion',
    pet_photo: '/paw-icon.svg',
    about_me: '',
  },
  other_user: { id: 0, owner_name: '' },
  unread_count: 0,
  last_message: {
    body: 'Hi there! 👋 Thanks for joining us and Welcome!',
    time: 'Just now',
  },
};

const WELCOME_MESSAGES = [
  {
    id: 'w1',
    sender_user_id: 0,
    body: 'Hi there! 👋\nThanks for joining us and Welcome! You can connect with pet owners on the Discover page to start chatting and set up playdates!',
    created_at: 'Just now',
  },
];

export default function ChatView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { sendMessage, sendTyping, onMessage, getTypingUsers, setTotalUnreadCount, isConnected, reconnect } = useWebSocket();

  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);

  const displayChats = chats.length > 0 ? chats : [WELCOME_CHAT];
  const activeChat = displayChats.find((c) => String(c.id) === String(activeChatId)) || displayChats[0];
  const isPawly = String(activeChat.id) === 'welcome';
  const isOtherTyping = activeChatId && activeChatId !== 'welcome' ? getTypingUsers(activeChatId).size > 0 : false;
  const filteredChats = displayChats.filter((c) => (filter === 'unread' ? c.unread_count > 0 : true));

  useEffect(() => {
    if (!isConnected) {
      reconnect();
    }
  }, [isConnected, reconnect]);

  useEffect(() => {
    async function loadMyProfile() {
      try {
        const prof = await getMyProfile();
        if (prof && prof.id) {
          setCurrentUserId(prof.id);
        }
      } catch { }
    }
    loadMyProfile();
  }, []);

  const clearChatUnread = useCallback((chatId) => {
    if (!chatId) return;
    markChatAsReadInStorage(chatId);
    if (chatId === 'welcome') {
      try {
        localStorage.setItem('pawly_welcome_viewed', 'true');
      } catch { }
      setTotalUnreadCount(0);
      return;
    }
    const readIds = getReadChatIds();

    setChats((prev) => {
      const updated = prev.map((c) => (readIds.includes(c.id) || c.id === chatId ? { ...c, unread_count: 0 } : c));
      const newTotal = updated.reduce((sum, item) => sum + (item.unread_count || 0), 0);
      setTotalUnreadCount(newTotal);
      return updated;
    });
  }, [setTotalUnreadCount]);

  // 1. Load all chats list
  useEffect(() => {
    async function loadAllChats() {
      setLoading(true);
      const readIds = getReadChatIds();
      try {
        const data = await getChats();
        const rawList = Array.isArray(data) ? data : [];
        const hydrated = rawList.map((c) => (readIds.includes(c.id) ? { ...c, unread_count: 0 } : c));
        setChats(hydrated);

        if (hydrated.length > 0) {
          const initialId = id ? (isNaN(Number(id)) ? id : Number(id)) : hydrated[0].id;
          setActiveChatId(initialId);
          clearChatUnread(initialId);
        } else {
          setActiveChatId('welcome');
          try {
            localStorage.setItem('pawly_welcome_viewed', 'true');
          } catch { }
          setTotalUnreadCount(0);
        }
      } catch {
        setChats([]);
        setActiveChatId('welcome');
        try {
          localStorage.setItem('pawly_welcome_viewed', 'true');
        } catch { }
        setTotalUnreadCount(0);
      } finally {
        setLoading(false);
      }
    }
    loadAllChats();
  }, [id, clearChatUnread, setTotalUnreadCount]);

  // 2. Load messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    if (activeChatId === 'welcome') {
      setMessages(WELCOME_MESSAGES);
      return;
    }

    async function loadChatMessages() {
      try {
        const msgs = await getMessages(activeChatId);
        setMessages(Array.isArray(msgs) ? msgs : (msgs?.messages || []));
        await markAsRead(activeChatId).catch(() => { });
      } catch {
        setMessages([]);
      }
    }
    loadChatMessages();
  }, [activeChatId]);

  // Reorder chats dynamically so the most recently active chat rises to the top
  // Elevates conversation with latest message to top of conversation list in real-time
  const updateChatListWithLatestMessage = useCallback((chatId: any, text: string, timeStr?: string) => {
    setChats((prevChats: any[]) => {
      const chatIndex = prevChats.findIndex((c) => String(c.id) === String(chatId));
      if (chatIndex === -1) return prevChats;
      const targetChat = prevChats[chatIndex];
      const updatedChat = {
        ...targetChat,
        last_message: {
          body: text,
          time: timeStr || new Date().toISOString(),
        },
      };
      const restChats = prevChats.filter((_, idx) => idx !== chatIndex);
      return [updatedChat, ...restChats];
    });
  }, []);

  // Robust scroll to bottom for message stream
  // Automatically scrolls conversation container to latest message
  const scrollToBottom = useCallback((instant = false) => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
      }
    });
  }, []);

  // 3. Auto-scroll message stream to the bottom whenever messages change, active chat changes, or typing starts
  useEffect(() => {
    scrollToBottom(true);
    const timer = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(timer);
  }, [messages, activeChatId, isOtherTyping, scrollToBottom]);

  // 4. WebSocket real-time listener
  useEffect(() => {
    const unsubscribe = onMessage('message', (payload) => {
      if (payload && payload.chat_id) {
        updateChatListWithLatestMessage(payload.chat_id, payload.body, payload.created_at);
        if (String(payload.chat_id) === String(activeChatId)) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) {
              return prev;
            }
            return [...prev, payload];
          });
          markAsRead(payload.chat_id).catch(() => {});
        }
      }
    });
    return unsubscribe;
  }, [activeChatId, onMessage, updateChatListWithLatestMessage]);

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    clearChatUnread(chatId);
    setShowDrawer(false);
    if (chatId !== 'welcome') {
      navigate(`/chats/${chatId}`, { replace: true });
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (activeChatId && activeChatId !== 'welcome') {
      sendTyping(activeChatId);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChatId) return;

    const messageText = input.trim();
    setInput('');

    const tempId = Date.now();
    const newMsg = {
      id: tempId,
      chat_id: activeChatId,
      sender_user_id: currentUserId,
      body: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    updateChatListWithLatestMessage(activeChatId, messageText);

    if (activeChatId !== 'welcome') {
      sendMessage(activeChatId, messageText);
      try {
        const saved = await sendChatMessage(activeChatId, messageText);
        if (saved && saved.id) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } catch (err) {
        console.warn('Failed persisting message to database:', err);
      }
    }
  };

  return (
    <div className="unified-chat-page" id="chat-page">
      <Navbar />

      <main className="unified-chat-content">
        {loading ? (
          <div className="chat-mid-empty">
            <div className="discover__spinner" />
            <p>Loading messages...</p>
          </div>
        ) : (
          <div className="unified-chat-grid">
            {/* Backdrop for sliding drawer on small screens */}
            {showDrawer && (
              <div
                className="chat-drawer-backdrop"
                onClick={() => setShowDrawer(false)}
                aria-label="Close conversation list"
              />
            )}

            {/* ============================================================
               LEFT COLUMN: Messages & Conversations List (Slides in on mobile)
               ============================================================ */}
            <aside className={`chat-left-col ${showDrawer ? 'chat-left-col--open' : ''}`}>
              <div className="chat-left-header">
                <div className="chat-left-header__top">
                  <h2>Messages</h2>
                  <button
                    type="button"
                    className="chat-drawer-close-btn"
                    onClick={() => setShowDrawer(false)}
                    aria-label="Close messages drawer"
                  >
                    ✕
                  </button>
                </div>
                <div className="chat-filter-tabs">
                  <button
                    className={`chat-filter-tab ${filter === 'all' ? 'chat-filter-tab--active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`chat-filter-tab ${filter === 'unread' ? 'chat-filter-tab--active' : ''}`}
                    onClick={() => setFilter('unread')}
                  >
                    Unread
                  </button>
                </div>
              </div>

              <div className="chat-list-scroll">
                {filteredChats.map((chat) => {
                  const isSelected = String(chat.id) === String(activeChatId);
                  const isPawlyChat = String(chat.id) === 'welcome';
                  const fallbackChatPhoto = isPawlyChat
                    ? '/paw-icon.svg'
                    : getDefaultPetPhoto(chat.other_pet?.id, chat.other_pet?.animal_type, chat.other_pet?.pet_name);
                  const chatPetPhoto = getFullPhotoUrl(chat.other_pet?.pet_photo, fallbackChatPhoto);

                  return (
                    <div
                      key={chat.id}
                      className={`chat-list-item ${isSelected ? 'chat-list-item--active' : ''} ${chat.unread_count > 0 ? 'chat-list-item--unread' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="chat-list-item__avatar-wrap">
                        <img
                          src={chatPetPhoto}
                          alt={chat.other_pet?.pet_name}
                          className="chat-list-item__avatar"
                          onError={(e: any) => {
                            e.target.onerror = null;
                            e.target.src = fallbackChatPhoto;
                          }}
                        />
                        {!isPawlyChat && <StatusBadge isOnline={chat.is_online} size="sm" />}
                      </div>

                      <div className="chat-list-item__body">
                        <div className="chat-list-item__row1">
                          <span className="chat-list-item__name">
                            {isPawlyChat
                              ? chat.other_pet?.pet_name
                              : `${chat.other_pet?.pet_name} and ${chat.other_user?.owner_name}`}
                          </span>
                          <span className="chat-list-item__time">{formatMessageTime(chat.last_message?.time)}</span>
                        </div>
                        <div className="chat-list-item__row2">
                          <p className="chat-list-item__snippet truncate">
                            {chat.last_message?.body || 'No messages yet'}
                          </p>
                          {chat.unread_count > 0 && (
                            <span className="chat-list-item__badge">{chat.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* ============================================================
               MIDDLE COLUMN: Active Conversation Stream & Input
               ============================================================ */}
            <section className="chat-mid-col">
              {activeChat ? (
                <>
                  {/* Chat Header */}
                  <div className="chat-mid-header">
                    <button
                      type="button"
                      className="chat-toggle-sidebar-btn"
                      onClick={() => setShowDrawer((prev) => !prev)}
                      aria-label="Toggle conversations list"
                      title="View all conversations"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="20" y2="6"></line>
                        <line x1="4" y1="12" x2="20" y2="12"></line>
                        <line x1="4" y1="18" x2="20" y2="18"></line>
                      </svg>
                      <span>Chats</span>
                    </button>

                    <img
                      src={getFullPhotoUrl(
                        activeChat.other_pet?.pet_photo,
                        isPawly
                          ? '/paw-icon.svg'
                          : getDefaultPetPhoto(activeChat.other_pet?.id, activeChat.other_pet?.animal_type, activeChat.other_pet?.pet_name)
                      )}
                      alt={activeChat.other_pet?.pet_name}
                      className="chat-mid-header__avatar"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = isPawly
                          ? '/paw-icon.svg'
                          : getDefaultPetPhoto(activeChat.other_pet?.id, activeChat.other_pet?.animal_type, activeChat.other_pet?.pet_name);
                      }}
                    />
                    <div>
                      <h3 className="chat-mid-header__name">
                        {isPawly
                          ? activeChat.other_pet?.pet_name
                          : `${activeChat.other_pet?.pet_name} & ${activeChat.other_user?.owner_name}`}
                      </h3>
                      {!isPawly && (
                        <div className="chat-mid-header__status">
                          <StatusBadge isOnline={activeChat.is_online} size="sm" />
                          <span>{activeChat.is_online ? 'Online' : 'Offline'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="chat-mid-messages" ref={messagesContainerRef}>
                    {messages.map((msg) => {
                      const isSystem =
                        msg.is_system ||
                        msg.body?.startsWith('Matched! Say hi') ||
                        msg.body?.includes('Matched! Say hi to set up a playdate!');

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="chat-system-notice">
                            <div className="chat-system-notice__card">
                              <p>{msg.body}</p>
                              <span className="chat-system-notice__time">{formatMatchDateTime(msg.created_at)}</span>
                            </div>
                          </div>
                        );
                      }

                      const isMe = Number(msg.sender_user_id) === Number(currentUserId);
                      return (
                        <div
                          key={msg.id}
                          className={`chat-bubble-row ${isMe ? 'chat-bubble-row--me' : 'chat-bubble-row--other'}`}
                        >
                          <div className="chat-bubble">
                            <p style={{ whiteSpace: 'pre-line' }}>{msg.body}</p>
                            <span className="chat-bubble__time">{formatMessageTime(msg.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Dedicated Typing Indicator Bar (Permanently above Input Bar) */}
                  <div className={`chat-typing-status-bar ${isOtherTyping ? 'chat-typing-status-bar--visible' : ''}`}>
                    <div className="chat-typing-dots">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </div>
                    <span className="chat-typing-text">
                      <strong>{activeChat.other_pet?.pet_name || 'User'}</strong> is typing...
                    </span>
                  </div>

                  {/* Message Input Bar */}
                  <form onSubmit={handleSend} className="chat-mid-input-bar">
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Write a message..."
                      className="chat-mid-input"
                      id="chat-message-input"
                    />
                    <Button type="submit" variant="accent" id="chat-send-btn">
                      Send ➔
                    </Button>
                  </form>
                </>
              ) : (
                <div className="chat-mid-empty">
                  <p>Select a conversation to start chatting.</p>
                </div>
              )}
            </section>

            {/* ============================================================
               RIGHT COLUMN: Pet & Owner Profile Summary Card (Matching Discover Card)
               ============================================================ */}
            {activeChat && (
              <aside className="chat-right-col">
                <div className="in-place-pet-detail" style={{ margin: 0, padding: 0, background: 'transparent', boxShadow: 'none' }}>
                  {/* Hero Photo & MatchRing */}
                  <div className="in-place-pet-detail__hero">
                    <img
                      src={getFullPhotoUrl(
                        activeChat.other_pet?.pet_photo,
                        isPawly
                          ? '/paw-icon.svg'
                          : getDefaultPetPhoto(activeChat.other_pet?.id, activeChat.other_pet?.animal_type, activeChat.other_pet?.pet_name)
                      )}
                      alt={activeChat.other_pet?.pet_name}
                      className="in-place-pet-detail__photo"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = isPawly
                          ? '/paw-icon.svg'
                          : getDefaultPetPhoto(activeChat.other_pet?.id, activeChat.other_pet?.animal_type, activeChat.other_pet?.pet_name);
                      }}
                    />
                    {!isPawly && (
                      <div className="chat-right-col__match-pill">
                        99% matched with {activeChat.my_pet_name || 'Poppy'}
                      </div>
                    )}
                  </div>

                  {/* Pet Header */}
                  <h1 className="in-place-pet-detail__name">{activeChat.other_pet?.pet_name}</h1>

                  {/* Details Line */}
                  <div className="in-place-pet-detail__meta">
                    <span>{activeChat.other_pet?.animal_type ? activeChat.other_pet.animal_type.toUpperCase() : 'DOG'}</span>
                    <span>{activeChat.other_pet?.breed || 'Pet Buddy Finder'}</span>
                    <span>{activeChat.other_pet?.size ? activeChat.other_pet.size.toUpperCase() : 'MEDIUM'}</span>
                    {activeChat.other_pet?.pet_age > 0 && <span>{activeChat.other_pet.pet_age} YEARS</span>}
                  </div>

                  {/* Trait Chips */}
                  <div className="in-place-pet-detail__chips">
                    {activeChat.other_pet?.energy_level && (
                      <span className="in-place-chip in-place-chip--energy">
                        {activeChat.other_pet.energy_level.toUpperCase()} ENERGY
                      </span>
                    )}
                    {Array.isArray(activeChat.other_pet?.temperament) &&
                      activeChat.other_pet.temperament.map((t) => (
                        <span key={t} className="in-place-chip">
                          {t.toUpperCase()}
                        </span>
                      ))}
                  </div>

                  {/* Pet Bio */}
                  {!isPawly && activeChat.other_pet?.about_me && (
                    <p className="in-place-pet-detail__bio">{activeChat.other_pet.about_me}</p>
                  )}

                  {!isPawly && <hr className="in-place-divider" />}

                  {/* Owner Info Section matching Discover Wireframe */}
                  {!isPawly && (
                    <div className="in-place-owner-section">
                      <div className="in-place-owner-header">
                        <img
                          src={getFullPhotoUrl(activeChat.other_user?.owner_photo, '/placeholder-user.svg')}
                          alt={activeChat.other_user?.owner_name || 'Owner'}
                          className="in-place-owner-avatar"
                          onError={(e: any) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-user.svg';
                          }}
                        />
                        <div>
                          <h2 className="in-place-owner-title">
                            {activeChat.other_user?.owner_name || 'Owner'} <span className="in-place-owner-label">(Owner)</span>
                          </h2>
                          <div className="in-place-owner-status">
                            <StatusBadge isOnline={activeChat.is_online} size="sm" />
                            <span>{activeChat.is_online ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>

                      {activeChat.other_user?.about_me && (
                        <p className="in-place-owner-bio">{activeChat.other_user.about_me}</p>
                      )}

                      <div className="in-place-owner-badges">
                        <span className="in-place-badge">100% response rate</span>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function getReadChatIds() {
  try {
    const raw = localStorage.getItem('pawly_read_chats');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markChatAsReadInStorage(chatId) {
  try {
    const read = getReadChatIds();
    if (!read.includes(chatId)) {
      const updated = [...read, chatId];
      localStorage.setItem('pawly_read_chats', JSON.stringify(updated));
    }
  } catch { }
}
