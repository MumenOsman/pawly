/**
 * AuthContext
 *
 * Global authentication state provider. Provides:
 * - currentUser: the logged-in user object (or null)
 * - token: JWT string for API calls
 * - login(email, password): authenticates and stores token
 * - register(email, password): creates account and stores token
 * - logout(): clears token and user state
 * - isAuthenticated: boolean shortcut
 *
 * Wraps the entire app. All protected routes check this context.
 * Token is stored in localStorage and attached to API requests via api/client.js.
 */
