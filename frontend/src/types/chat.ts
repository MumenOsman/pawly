/**
 * Chat & Connection Types
 *
 * Maps to backend tables: connections, connection_requests, chats, messages
 */

/** A connection between two pets (accepted relationship) */
export interface Connection {
  id: number;
  pet1_id: number;
  pet2_id: number;
  created_at: string;
  /** Populated client-side after hydration */
  other_pet?: import('./pet').Pet;
  other_user?: import('./user').User;
}

/** A pending connection request */
export interface ConnectionRequest {
  id: number;
  sender_pet_id: number;
  receiver_pet_id: number;
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
  /** Populated client-side after hydration */
  sender_pet?: import('./pet').Pet;
  sender_user?: import('./user').User;
}

/** A chat room (one per connection) */
export interface Chat {
  id: number;
  connection_id: number;
  created_at: string;
  /** Populated client-side */
  other_user?: import('./user').User;
  other_pet?: import('./pet').Pet;
  last_message?: Message;
  unread_count: number;
}

/** A single chat message */
export interface Message {
  id: number;
  chat_id: number;
  sender_user_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** WebSocket message payloads */
export interface WsMessagePayload {
  type: 'message';
  chat_id: number;
  sender_user_id: number;
  body: string;
  created_at: string;
}

export interface WsTypingPayload {
  type: 'typing';
  chat_id: number;
  user_id: number;
}

export interface WsStatusPayload {
  type: 'status';
  user_id: number;
  online: boolean;
}

export type WsPayload = WsMessagePayload | WsTypingPayload | WsStatusPayload;
