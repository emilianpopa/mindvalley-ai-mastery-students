/**
 * Field-Level Encryption Service
 * Provides encryption/decryption for PHI fields
 * Uses AES-256-GCM for strong encryption
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

// Get encryption key from environment or generate a secure fallback
function getEncryptionKey() {
  const key = process.env.PHI_ENCRYPTION_KEY;

  if (!key) {
    console.warn('WARNING: PHI_ENCRYPTION_KEY not set. Using development key.');
    console.warn('Set PHI_ENCRYPTION_KEY environment variable in production!');
    // Development-only fallback (32 bytes = 256 bits)
    return crypto.createHash('sha256').update('development-key-do-not-use-in-production').digest();
  }

  // If key is provided as hex string, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise hash the provided key to get correct length
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string value
 * @param {string} plaintext - The value to encrypt
 * @returns {string} - Base64 encoded encrypted value (iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    return plaintext;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and ciphertext
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);

    return 'ENC:' + combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted value
 * @param {string} encryptedValue - The encrypted value (with ENC: prefix)
 * @returns {string} - Decrypted plaintext
 */
function decrypt(encryptedValue) {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    return encryptedValue;
  }

  // Check if value is encrypted
  if (!encryptedValue.startsWith('ENC:')) {
    return encryptedValue; // Return as-is if not encrypted
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedValue.slice(4), 'base64');

    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if a value is encrypted
 * @param {string} value - The value to check
 * @returns {boolean} - True if encrypted
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith('ENC:');
}

/**
 * Encrypt specific fields in an object
 * @param {Object} data - Object containing fields to encrypt
 * @param {string[]} fieldsToEncrypt - Array of field names to encrypt
 * @returns {Object} - Object with encrypted fields
 */
function encryptFields(data, fieldsToEncrypt) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      // Handle JSON fields
      if (typeof result[field] === 'object') {
        result[field] = encrypt(JSON.stringify(result[field]));
      } else {
        result[field] = encrypt(String(result[field]));
      }
    }
  }

  return result;
}

/**
 * Decrypt specific fields in an object
 * @param {Object} data - Object containing fields to decrypt
 * @param {string[]} fieldsToDecrypt - Array of field names to decrypt
 * @returns {Object} - Object with decrypted fields
 */
function decryptFields(data, fieldsToDecrypt) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    if (result[field] !== undefined && result[field] !== null && isEncrypted(result[field])) {
      const decrypted = decrypt(result[field]);

      // Try to parse as JSON if it looks like JSON
      if (decrypted && (decrypted.startsWith('{') || decrypted.startsWith('['))) {
        try {
          result[field] = JSON.parse(decrypted);
        } catch {
          result[field] = decrypted;
        }
      } else {
        result[field] = decrypted;
      }
    }
  }

  return result;
}

/**
 * PHI field definitions for different resource types
 */
const PHI_FIELDS = {
  client: [
    'date_of_birth',
    'medical_history',
    'current_medications',
    'allergies',
    'emergency_contact_name',
    'emergency_contact_phone'
  ],
  lab_result: [
    'results',
    'notes',
    'ai_summary'
  ],
  note: [
    'content'
  ],
  form_submission: [
    'answers'
  ]
};

/**
 * Encrypt PHI fields for a specific resource type
 * @param {Object} data - The data object
 * @param {string} resourceType - Type of resource (client, lab_result, etc.)
 * @returns {Object} - Object with encrypted PHI fields
 */
function encryptPHI(data, resourceType) {
  const fields = PHI_FIELDS[resourceType];
  if (!fields) {
    return data;
  }
  return encryptFields(data, fields);
}

/**
 * Decrypt PHI fields for a specific resource type
 * @param {Object} data - The data object
 * @param {string} resourceType - Type of resource (client, lab_result, etc.)
 * @returns {Object} - Object with decrypted PHI fields
 */
function decryptPHI(data, resourceType) {
  const fields = PHI_FIELDS[resourceType];
  if (!fields) {
    return data;
  }
  return decryptFields(data, fields);
}

/**
 * Decrypt PHI fields for an array of records
 * @param {Array} records - Array of data objects
 * @param {string} resourceType - Type of resource
 * @returns {Array} - Array with decrypted PHI fields
 */
function decryptPHIArray(records, resourceType) {
  if (!Array.isArray(records)) {
    return records;
  }
  return records.map(record => decryptPHI(record, resourceType));
}

/**
 * Generate a new encryption key (for initial setup)
 * @returns {string} - Hex encoded 256-bit key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash sensitive data for comparison (e.g., for searching encrypted fields)
 * @param {string} value - Value to hash
 * @returns {string} - SHA-256 hash
 */
function hashForSearch(value) {
  if (!value) return null;
  const salt = process.env.PHI_SEARCH_SALT || 'expandhealth-search-salt';
  return crypto
    .createHmac('sha256', salt)
    .update(String(value).toLowerCase().trim())
    .digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
  encryptPHI,
  decryptPHI,
  decryptPHIArray,
  generateEncryptionKey,
  hashForSearch,
  PHI_FIELDS
};
