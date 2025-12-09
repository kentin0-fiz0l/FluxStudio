import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { KeyManager } from '../services/key-manager';
import { validateContentAccess } from '../services/access-validator';
import { AppError } from '../middleware/error-handler';

const logger = createLogger('license-handler');

interface LicenseRequest {
  contentId: string;
  spcData: Buffer;
  userId: string;
  userEmail: string;
}

interface LicenseResponse {
  ckc: Buffer;
}

/**
 * FairPlay License Handler
 * Converts SPC (Server Playback Context) from client to CKC (Content Key Context)
 *
 * Flow:
 * 1. Client sends SPC + contentId
 * 2. Server decrypts SPC using FPS private key
 * 3. Server validates user access to content
 * 4. Server retrieves/generates content key (CK)
 * 5. Server creates CKC with CK + policy
 * 6. Server encrypts CKC using FPS certificate
 * 7. Server returns CKC to client
 */
export class FairPlayLicenseHandler {
  private fpsCertificate: Buffer;
  private fpsPrivateKey: forge.pki.PrivateKey;
  private fpsASK: Buffer;
  private keyManager: KeyManager;

  constructor() {
    this.loadFPSCredentials();
    this.keyManager = new KeyManager();
  }

  /**
   * Load FairPlay Streaming credentials from files/secrets
   */
  private loadFPSCredentials() {
    try {
      const certPath = process.env.FPS_CERTIFICATE_PATH || './credentials/fps_cert.der';
      const keyPath = process.env.FPS_PRIVATE_KEY_PATH || './credentials/fps_private_key.pem';

      // Load FPS Certificate (DER format from Apple)
      if (fs.existsSync(certPath)) {
        this.fpsCertificate = fs.readFileSync(certPath);
        logger.info('FPS Certificate loaded', { size: this.fpsCertificate.length });
      } else {
        throw new Error(`FPS Certificate not found at ${certPath}`);
      }

      // Load FPS Private Key (PEM format)
      if (fs.existsSync(keyPath)) {
        const keyPem = fs.readFileSync(keyPath, 'utf8');
        this.fpsPrivateKey = forge.pki.privateKeyFromPem(keyPem);
        logger.info('FPS Private Key loaded');
      } else {
        throw new Error(`FPS Private Key not found at ${keyPath}`);
      }

      // Load Application Secret Key (ASK) from AWS Secrets Manager or env
      // For now, using a placeholder - in production, fetch from AWS Secrets Manager
      const askHex = process.env.FPS_ASK_HEX || this.generatePlaceholderASK();
      this.fpsASK = Buffer.from(askHex, 'hex');
      logger.info('FPS ASK loaded', { length: this.fpsASK.length });

    } catch (error) {
      logger.error('Failed to load FPS credentials', { error });
      throw new AppError('FPS credentials not configured properly', 500);
    }
  }

  /**
   * Generate placeholder ASK for development
   * In production, this MUST come from Apple and be stored in AWS Secrets Manager
   */
  private generatePlaceholderASK(): string {
    logger.warn('Using placeholder ASK - NOT FOR PRODUCTION');
    return Buffer.from('0'.repeat(64), 'hex').toString('hex');
  }

  /**
   * Main license request handler
   */
  async handleLicenseRequest(request: LicenseRequest): Promise<Buffer> {
    const { contentId, spcData, userId, userEmail } = request;

    logger.info('Processing license request', { contentId, userId, spcSize: spcData.length });

    try {
      // Step 1: Validate user has access to this content
      const hasAccess = await validateContentAccess(userId, contentId);
      if (!hasAccess) {
        throw new AppError('User does not have access to this content', 403);
      }

      // Step 2: Decrypt and validate SPC
      const spcPayload = this.decryptSPC(spcData);
      logger.debug('SPC decrypted successfully', { payloadSize: spcPayload.length });

      // Step 3: Get or generate content key for this media
      const contentKey = await this.keyManager.getContentKey(contentId);
      logger.debug('Content key retrieved', { contentId, keyId: contentKey.id });

      // Step 4: Create CKC (Content Key Context)
      const ckc = this.createCKC({
        spcPayload,
        contentKey: contentKey.key,
        contentId,
        userId,
        duration: parseInt(process.env.LICENSE_DURATION || '3600')
      });

      logger.info('License issued successfully', {
        contentId,
        userId,
        ckcSize: ckc.length
      });

      // Step 5: Store license issuance record
      await this.keyManager.recordLicenseIssuance({
        contentId,
        userId,
        keyId: contentKey.id,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      });

      return ckc;

    } catch (error) {
      logger.error('License request failed', { contentId, userId, error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to process license request', 500);
    }
  }

  /**
   * Decrypt SPC using FPS private key
   */
  private decryptSPC(spcData: Buffer): Buffer {
    try {
      // SPC is encrypted with the FPS certificate's public key
      // Decrypt it using our private key
      const decrypted = this.fpsPrivateKey.decrypt(spcData.toString('binary'), 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create()
        }
      });

      return Buffer.from(decrypted, 'binary');
    } catch (error) {
      logger.error('SPC decryption failed', { error });
      throw new AppError('Invalid SPC data', 400);
    }
  }

  /**
   * Create CKC (Content Key Context) response
   */
  private createCKC(params: {
    spcPayload: Buffer;
    contentKey: Buffer;
    contentId: string;
    userId: string;
    duration: number;
  }): Buffer {
    const { spcPayload, contentKey, contentId, userId, duration } = params;

    try {
      // CKC Structure (simplified):
      // - Content Key (16 bytes for AES-128)
      // - Key ID
      // - License duration
      // - Rental/Purchase policy
      // - ASK signature

      const now = Math.floor(Date.now() / 1000);
      const expiry = now + duration;

      // Build CKC payload
      const ckcPayload = Buffer.concat([
        contentKey,                                    // 16 bytes: Content Key
        Buffer.from(contentId, 'utf8'),               // Variable: Content ID
        Buffer.from([
          0x00, 0x00, 0x00, 0x01                       // Version
        ]),
        this.encodeTimestamp(now),                    // 4 bytes: Issue time
        this.encodeTimestamp(expiry),                 // 4 bytes: Expiry time
        Buffer.from([0x01])                            // 1 byte: Rental (0x00) or Purchase (0x01)
      ]);

      // Sign with ASK (Application Secret Key)
      const signature = this.signWithASK(ckcPayload);

      // Final CKC = payload + signature
      const ckc = Buffer.concat([ckcPayload, signature]);

      logger.debug('CKC created', {
        size: ckc.length,
        contentId,
        userId,
        expiryTimestamp: expiry
      });

      return ckc;

    } catch (error) {
      logger.error('CKC creation failed', { error });
      throw new AppError('Failed to create license', 500);
    }
  }

  /**
   * Sign CKC payload with ASK
   */
  private signWithASK(payload: Buffer): Buffer {
    const hmac = forge.hmac.create();
    hmac.start('sha256', this.fpsASK.toString('binary'));
    hmac.update(payload.toString('binary'));
    return Buffer.from(hmac.digest().toHex(), 'hex');
  }

  /**
   * Encode Unix timestamp as 4-byte buffer
   */
  private encodeTimestamp(timestamp: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(timestamp, 0);
    return buf;
  }
}

// Export singleton instance
const licenseHandler = new FairPlayLicenseHandler();

export const handleLicenseRequest = async (request: LicenseRequest): Promise<Buffer> => {
  return licenseHandler.handleLicenseRequest(request);
};
