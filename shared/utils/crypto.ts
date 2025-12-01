/**
 * Secure hashing utilities using Web Crypto API
 */

// Use global crypto if available (Node 19+, Cloudflare Workers), otherwise fallback
// @ts-ignore - globalThis.crypto is available in Cloudflare Workers and Node 19+
const cryptoAPI = globalThis.crypto;

/**
 * Hash a password using PBKDF2-SHA256
 * @param password The password to hash
 * @returns The hashed password in "salt:hash" hex format
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = cryptoAPI.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await cryptoAPI.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const hash = await cryptoAPI.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const saltHex = Array.from(salt).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hash)).map((b) => (b as number).toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 * @param password The password to verify
 * @param storedHash The stored hash in "salt:hash" hex format
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(':');
    // Handle legacy hashes (fail secure) or invalid formats
    if (parts.length !== 2) return false;

    const [saltHex, hashHex] = parts;
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const encoder = new TextEncoder();
    const keyMaterial = await cryptoAPI.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const hash = await cryptoAPI.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const computedHashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHashHex === hashHex;
}

/**
 * Hash a token using PBKDF2-SHA256 with a provided salt
 * Useful for deterministic hashing when needed (e.g. API token lookup)
 */
export async function hashToken(token: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await cryptoAPI.subtle.importKey(
        'raw',
        encoder.encode(token),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const hash = await cryptoAPI.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random secure token
 */
export function generateRandomToken(length: number = 32): string {
    const array = new Uint8Array(length);
    cryptoAPI.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
