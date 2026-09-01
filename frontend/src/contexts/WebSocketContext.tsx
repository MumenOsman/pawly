/**
 * WebSocketContext
 *
 * Single WebSocket connection provider for the entire app.
 * Handles: real-time messages, typing indicators, online/offline status.
 *
 * Usage:
 *   const { sendMessage, sendTyping, onlineUsers, lastMessage } = useWebSocket();
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

// Reconnection config
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const TYPING_TIMEOUT = 3000;

const WS_BASE_URL = (import.meta as any).env?.VITE_WS_URL || 
  ((import.meta as any).env?.VITE_API_URL ? (import.meta as any).env.VITE_API_URL.replace(/^http/, 'ws') : 'ws://localhost:3000');

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const listenersRef = useRef(new Map());
  const handleMessageRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map()); // chatId → Set<userId>
  const [lastMessage, setLastMessage] = useState(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(() => {
    try {
      const welcomeViewed = localStorage.getItem('pawly_welcome_viewed') === 'true';
      const read = JSON.parse(localStorage.getItem('pawly_read_chats') || '[]');
      if (welcomeViewed || read.includes('welcome') || read.includes(1)) {
        return 0;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  // Typing timeout refs
  const typingTimeoutsRef = useRef(new Map());

  /**
   * Connect to the WebSocket server.
   * Only connects if a JWT token exists.
   */
  const connect = useCallback(() => {
    const token = localStorage.getItem('pawly_token');
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Close existing connection if already open/connecting
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        return; // already connected or connecting
      }
      wsRef.current.close();
    }

    try {
      console.log('🔌 [Pawly WS] Connecting to:', `${WS_BASE_URL}/ws`);
      const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);

      ws.onopen = () => {
        console.log('✅ [Pawly WS] Connected successfully');
        setIsConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onclose = (event) => {
        console.log('⚠️ [Pawly WS] Connection closed (code: ' + event.code + ')');
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff if token is still present
        if (localStorage.getItem('pawly_token')) {
          const delay = reconnectDelayRef.current;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.warn('❌ [Pawly WS] Error:', err);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('📩 [Pawly WS] Received frame:', payload);
          if (handleMessageRef.current) {
            handleMessageRef.current(payload);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to instantiate WebSocket:', e);
    }
  }, []);

  /**
   * Route incoming WebSocket messages by type.
   */
  const handleMessage = useCallback((payload) => {
    switch (payload.type) {
      case 'message':
        setLastMessage(payload);
        // Notify registered listeners
        notifyListeners('message', payload);
        break;

      case 'typing':
        handleTypingIndicator(payload);
        break;

      case 'status':
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (payload.online) {
            next.add(payload.user_id);
          } else {
            next.delete(payload.user_id);
          }
          return next;
        });
        notifyListeners('status', payload);
        break;

      default:
        // Forward unknown types to listeners
        notifyListeners(payload.type, payload);
    }
  }, []);

  /**
   * Handle typing indicator with auto-clear after timeout.
   */
  const handleTypingIndicator = useCallback((payload) => {
    const { chat_id, user_id } = payload;

    setTypingUsers((prev) => {
      const next = new Map(prev);
      const chatTypers = new Set(next.get(chat_id) || []);
      chatTypers.add(user_id);
      next.set(chat_id, chatTypers);
      return next;
    });

    // Clear typing indicator after timeout
    const key = `${chat_id}-${user_id}`;
    if (typingTimeoutsRef.current.has(key)) {
      clearTimeout(typingTimeoutsRef.current.get(key));
    }

    typingTimeoutsRef.current.set(
      key,
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          const chatTypers = new Set(next.get(chat_id) || []);
          chatTypers.delete(user_id);
          if (chatTypers.size === 0) {
            next.delete(chat_id);
          } else {
            next.set(chat_id, chatTypers);
          }
          return next;
        });
        typingTimeoutsRef.current.delete(key);
      }, TYPING_TIMEOUT)
    );
  }, []);

  /**
   * Notify registered listeners for a specific message type.
   */
  const notifyListeners = useCallback((type, payload) => {
    const callbacks = listenersRef.current.get(type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(payload));
    }
  }, []);

  /**
   * Register a listener for a specific message type.
   * Returns an unsubscribe function.
   *
   * @param {string} type - Message type ('message', 'typing', 'status')
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  const onMessage = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);

    return () => {
      const callbacks = listenersRef.current.get(type);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }, []);

  /**
   * Send a chat message via WebSocket.
   *
   * @param {number} chatId - Target chat ID
   * @param {string} body - Message text
   */
  const sendMessage = useCallback((chatId, body) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        chat_id: chatId,
        body,
      }));
    }
  }, []);

  /**
   * Send a typing indicator via WebSocket.
   *
   * @param {number} chatId - Target chat ID
   */
  const sendTyping = useCallback((chatId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        chat_id: chatId,
      }));
    }
  }, []);

  /**
   * Check if a specific user is online.
   *
   * @param {number} userId
   * @returns {boolean}
   */
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  /**
   * Get typing users for a specific chat.
   *
   * @param {number} chatId
   * @returns {Set<number>} Set of user IDs currently typing
   */
  const getTypingUsers = useCallback((chatId) => {
    return typingUsers.get(chatId) || new Set();
  }, [typingUsers]);

  // Always maintain latest handleMessage in ref
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // Connect on mount, disconnect on unmount, and reconnect when auth changes
  useEffect(() => {
    connect();

    const handleAuthChange = () => {
      connect();
    };

    window.addEventListener('pawly_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('pawly_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [connect]);

  const value = {
    isConnected,
    onlineUsers,
    lastMessage,
    totalUnreadCount,
    setTotalUnreadCount,
    sendMessage,
    sendTyping,
    onMessage,
    isUserOnline,
    getTypingUsers,
    reconnect: connect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access the WebSocket context.
 *
 * @returns {object} WebSocket context value
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
