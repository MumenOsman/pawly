/**
 * Connections API
 *
 * Connection management endpoint wrappers.
 * Connections are between pets, not users.
 */
import { apiFetch } from './client';

/** Get all established connections (IDs only) */
export function getConnections() {
  return apiFetch('/connections');
}

/** Get incoming connection requests */
export function getConnectionRequests() {
  return apiFetch('/connections/requests');
}

/** Send a connection request to another pet */
export function sendConnectionRequest(petId) {
  return apiFetch('/connections/request', {
    method: 'POST',
    body: { pet_id: petId },
  });
}

/** Accept an incoming connection request */
export function acceptConnection(requestId) {
  return apiFetch(`/connections/requests/${requestId}/accept`, {
    method: 'POST',
  });
}

/** Dismiss an incoming connection request */
export function dismissConnection(requestId) {
  return apiFetch(`/connections/requests/${requestId}/dismiss`, {
    method: 'POST',
  });
}

/** Disconnect from an established connection */
export function disconnect(connectionId) {
  return apiFetch(`/connections/${connectionId}`, {
    method: 'DELETE',
  });
}
