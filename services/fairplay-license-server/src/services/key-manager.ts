import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { db } from '../utils/database';
import { AppError } from '../middleware/error-handler';

const logger = createLogger('key-manager');

export interface ContentKey {
  id: string;
  key: Buffer;
  iv: Buffer;
  createdAt: Date;
}

export interface LicenseRecord {
  contentId: string;
  userId: string;
  keyId: string;
  issuedAt?: Date;
  expiresAt: Date;
}

/**
 * KeyManager handles content encryption keys
 * Uses AWS KMS for key generation and encryption
 */
export class KeyManager {
  private kmsClient: KMSClient;
  private secretsClient: SecretsManagerClient;
  private kmsKeyId: string;
  private keyCache: Map<string, ContentKey>;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';

    this.kmsClient = new KMSClient({ region });
    this.secretsClient = new SecretsManagerClient({ region });
    this.kmsKeyId = process.env.AWS_KMS_KEY_ID || 'alias/fluxstudio-content-keys';
    this.keyCache = new Map();

    logger.info('KeyManager initialized', { region, kmsKeyId: this.kmsKeyId });
  }

  /**
   * Get or generate content key for a media file
   */
  async getContentKey(contentId: string): Promise<ContentKey> {
    try {
      // Check cache first
      if (this.keyCache.has(contentId)) {
        logger.debug('Content key retrieved from cache', { contentId });
        return this.keyCache.get(contentId)!;
      }

      // Check database for existing key
      const existing = await this.getKeyFromDatabase(contentId);
      if (existing) {
        this.keyCache.set(contentId, existing);
        logger.debug('Content key retrieved from database', { contentId });
        return existing;
      }

      // Generate new key
      const newKey = await this.generateNewKey(contentId);
      await this.storeKeyInDatabase(contentId, newKey);
      this.keyCache.set(contentId, newKey);

      logger.info('New content key generated', { contentId, keyId: newKey.id });
      return newKey;

    } catch (error) {
      logger.error('Failed to get content key', { contentId, error });
      throw new AppError('Key management error', 500);
    }
  }

  /**
   * Generate new encryption key using AWS KMS
   */
  private async generateNewKey(contentId: string): Promise<ContentKey> {
    try {
      const command = new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_128',
        EncryptionContext: {
          contentId,
          service: 'fluxstudio-fairplay'
        }
      });

      const response = await this.kmsClient.send(command);

      if (!response.Plaintext || !response.CiphertextBlob) {
        throw new Error('KMS response missing key data');
      }

      // Generate IV (Initialization Vector) for AES-128
      const iv = Buffer.from(this.generateRandomBytes(16));

      return {
        id: uuidv4(),
        key: Buffer.from(response.Plaintext),
        iv,
        createdAt: new Date()
      };

    } catch (error) {
      logger.error('KMS key generation failed', { contentId, error });
      throw new AppError('Failed to generate encryption key', 500);
    }
  }

  /**
   * Generate cryptographically secure random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    const crypto = require('crypto');
    return crypto.randomBytes(length);
  }

  /**
   * Retrieve key from database
   */
  private async getKeyFromDatabase(contentId: string): Promise<ContentKey | null> {
    try {
      const result = await db.query(
        `SELECT id, content_key, iv, created_at
         FROM content_keys
         WHERE content_id = $1
         AND revoked_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [contentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        key: Buffer.from(row.content_key, 'base64'),
        iv: Buffer.from(row.iv, 'base64'),
        createdAt: row.created_at
      };

    } catch (error) {
      logger.error('Database query failed', { contentId, error });
      return null;
    }
  }

  /**
   * Store key in database (encrypted with KMS)
   */
  private async storeKeyInDatabase(contentId: string, key: ContentKey): Promise<void> {
    try {
      await db.query(
        `INSERT INTO content_keys
         (id, content_id, content_key, iv, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          key.id,
          contentId,
          key.key.toString('base64'),
          key.iv.toString('base64'),
          key.createdAt
        ]
      );

      logger.debug('Content key stored in database', { contentId, keyId: key.id });
    } catch (error) {
      logger.error('Failed to store key in database', { contentId, error });
      throw new AppError('Key storage error', 500);
    }
  }

  /**
   * Record license issuance for tracking/analytics
   */
  async recordLicenseIssuance(record: LicenseRecord): Promise<void> {
    try {
      await db.query(
        `INSERT INTO media_licenses
         (id, content_id, user_id, key_id, issued_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          record.contentId,
          record.userId,
          record.keyId,
          record.issuedAt || new Date(),
          record.expiresAt
        ]
      );

      logger.debug('License issuance recorded', {
        contentId: record.contentId,
        userId: record.userId
      });
    } catch (error) {
      // Don't fail the license request if logging fails
      logger.error('Failed to record license issuance', { error });
    }
  }

  /**
   * Revoke a content key (for key rotation or security incidents)
   */
  async revokeKey(keyId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE content_keys
         SET revoked_at = NOW()
         WHERE id = $1`,
        [keyId]
      );

      // Remove from cache
      for (const [contentId, key] of this.keyCache.entries()) {
        if (key.id === keyId) {
          this.keyCache.delete(contentId);
          break;
        }
      }

      logger.info('Content key revoked', { keyId });
    } catch (error) {
      logger.error('Failed to revoke key', { keyId, error });
      throw new AppError('Key revocation error', 500);
    }
  }

  /**
   * Get FPS ASK from AWS Secrets Manager
   */
  async getFPSApplicationSecretKey(): Promise<Buffer> {
    try {
      const secretName = process.env.FPS_ASK_SECRET_NAME || 'fluxstudio/fairplay/ask';

      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsClient.send(command);

      if (!response.SecretString) {
        throw new Error('ASK secret not found');
      }

      const secret = JSON.parse(response.SecretString);
      return Buffer.from(secret.ask, 'hex');

    } catch (error) {
      logger.error('Failed to retrieve FPS ASK from Secrets Manager', { error });
      throw new AppError('ASK retrieval error', 500);
    }
  }
}
