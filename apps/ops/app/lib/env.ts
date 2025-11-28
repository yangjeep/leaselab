/**
 * Environment constants and configuration
 */

// Fixed salt for API token hashing (deterministic lookup)
// TODO: In the future, this should be loaded from environment variables or a secure secret store
export { API_TOKEN_SALT } from '../../../../shared/constants';
