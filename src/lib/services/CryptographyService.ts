/**
 * CryptographyService — SHA-256 hashing for document signing integrity.
 * 
 * Generates deterministic hashes for:
 * 1. Original PDF (hash_original) — proves the document wasn't altered before signing
 * 2. Final signed PDF + session metadata (hash_final) — proves the signed version is untampered
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash from a buffer (raw file bytes).
 */
export function generateSHA256(buffer: Buffer | Uint8Array): string {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
}

/**
 * Generate the final hash that binds the signed PDF to the session metadata.
 * This is the "certificate" — changing ANY input changes the hash, proving tampering.
 * 
 * Components concatenated before hashing:
 * - PDF bytes (the full signed document)
 * - IP address of the signer
 * - Exact timestamp of signing
 * - User ID of the authenticated signer
 */
export function generateFinalHash(
    pdfBuffer: Buffer | Uint8Array,
    ip: string,
    timestamp: string,
    userId: string
): string {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(pdfBuffer));
    hash.update(ip);
    hash.update(timestamp);
    hash.update(userId);
    return hash.digest('hex');
}

/**
 * Verify that a given hash matches a buffer + metadata combination.
 */
export function verifyFinalHash(
    pdfBuffer: Buffer | Uint8Array,
    ip: string,
    timestamp: string,
    userId: string,
    expectedHash: string
): boolean {
    const computed = generateFinalHash(pdfBuffer, ip, timestamp, userId);
    return computed === expectedHash;
}
