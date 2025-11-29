/**
 * Secure hashing utilities using Web Crypto API
 */
/**
 * Hash a password using PBKDF2-SHA256
 * @param password The password to hash
 * @returns The hashed password in "salt:hash" hex format
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a stored hash
 * @param password The password to verify
 * @param storedHash The stored hash in "salt:hash" hex format
 * @returns True if the password matches, false otherwise
 */
export declare function verifyPassword(password: string, storedHash: string): Promise<boolean>;
/**
 * Hash a token using PBKDF2-SHA256 with a provided salt
 * Useful for deterministic hashing when needed (e.g. API token lookup)
 */
export declare function hashToken(token: string, salt: Uint8Array): Promise<string>;
/**
 * Generate a random secure token
 */
export declare function generateRandomToken(length?: number): string;
//# sourceMappingURL=crypto.d.ts.map