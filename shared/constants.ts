/**
 * Shared constants for the application
 */

// Fixed salt for API token hashing (deterministic lookup)
// TODO: In the future, this should be loaded from environment variables or a secure secret store
export const API_TOKEN_SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
