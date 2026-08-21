/**
 * Chats API
 *
 * Chat and message endpoint wrappers.
 * Real-time messaging is handled by WebSocketContext — this module
 * is for REST operations (history, read receipts, chat list).
 */
import { apiFetch } from './client';

/** Get all chats, sorted by most recent message */
export function getChats() {
  return apiFetch('/chats');
}

/**
 * Get paginated message history for a chat.
 *
 * @param {number} chatId - Chat ID
 * @param {number} page - Page number (1-indexed)
 * @returns {Promise<Array>} Array of Message objects
 */
export function getMessages(chatId, page = 1) {
  return apiFetch(`/chats/${chatId}/messages?page=${page}`);
}

/**
 * Mark all messages in a chat as read.
 *
 * @param {number} chatId - Chat ID
 */
export function markAsRead(chatId) {
  return apiFetch(`/chats/${chatId}/read`, {
    method: 'POST',
  });
}
