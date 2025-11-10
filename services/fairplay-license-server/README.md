# FairPlay License Server

FairPlay Streaming (FPS) License Server for FluxStudio - provides DRM protection for video and audio content.

## Overview

This microservice handles FairPlay Streaming license requests from Apple devices (iOS, macOS, tvOS, visionOS). It:

- Validates user access to protected content
- Issues encrypted licenses (CKC) in response to client requests (SPC)
- Manages content encryption keys using AWS KMS
- Tracks license issuances for analytics

## Architecture

```
Client (iOS/macOS) → HLS Player → FairPlay Framework
                         ↓
                   License Request (SPC)
                         ↓
              FairPlay License Server ← AWS KMS
                         ↓                  ↓
                   License Response (CKC) + Content Keys
                         ↓
                   Encrypted Playback
```

## Prerequisites

### 1. Apple FairPlay Streaming Credentials

Apply at: https://developer.apple.com/streaming/fps/

You will receive:
- FPS Certificate (`fps_cert.der`)
- FPS Private Key (create using `openssl`)
- Application Secret Key (ASK) - 32-byte hex string

### 2. AWS Services

- **AWS KMS**: For content key generation and encryption
- **AWS Secrets Manager**: For storing FPS ASK securely
- **PostgreSQL**: For license tracking

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3002
NODE_ENV=development

# FairPlay Credentials
FPS_CERTIFICATE_PATH=./credentials/fps_cert.der
FPS_PRIVATE_KEY_PATH=./credentials/fps_private_key.pem
FPS_ASK_SECRET_NAME=fluxstudio/fairplay/ask

# AWS
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=alias/fluxstudio-content-keys

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fluxstudio

# JWT (must match main FluxStudio API)
JWT_SECRET=your-jwt-secret

# License
LICENSE_DURATION=3600
MAX_CONCURRENT_STREAMS=3
```

## Setup Instructions

### Step 1: Obtain FairPlay Credentials

1. **Register for FPS Deployment Package**:
   - Go to https://developer.apple.com/streaming/fps/
   - Complete the application form
   - Download the FPS SDK when approved

2. **Generate Private Key**:
   ```bash
   openssl genrsa -out fps_private_key.pem 2048
   ```

3. **Create CSR (Certificate Signing Request)**:
   ```bash
   openssl req -new -key fps_private_key.pem -out fps.csr
   ```

4. **Upload CSR to Apple Developer Portal**:
   - Apple will provide `fps_cert.der`

5. **Store credentials**:
   ```bash
   mkdir -p credentials
   mv fps_cert.der credentials/
   mv fps_private_key.pem credentials/
   chmod 600 credentials/*
   ```

6. **Store ASK in AWS Secrets Manager**:
   ```bash
   aws secretsmanager create-secret \
     --name fluxstudio/fairplay/ask \
     --secret-string '{"ask":"YOUR_32_BYTE_HEX_STRING_FROM_APPLE"}'
   ```

### Step 2: Set Up AWS KMS

```bash
# Create KMS key for content encryption
aws kms create-key \
  --description "FluxStudio Content Encryption Keys" \
  --key-usage ENCRYPT_DECRYPT

# Create alias
aws kms create-alias \
  --alias-name alias/fluxstudio-content-keys \
  --target-key-id <KEY_ID_FROM_ABOVE>
```

### Step 3: Run Database Migrations

```bash
# From FluxStudio root directory
psql $DATABASE_URL < database/migrations/010_drm_support.sql
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### POST `/license?contentId={uuid}`

**Request License (Client → Server)**

Headers:
```
Authorization: Bearer {jwt_token}
Content-Type: application/octet-stream
```

Body: Binary SPC (Server Playback Context) from iOS FairPlay framework

**Response:**
```
Content-Type: application/octet-stream
Body: Binary CKC (Content Key Context)
```

### GET `/health`

Health check endpoint

```json
{
  "status": "healthy",
  "service": "fairplay-license-server",
  "version": "1.0.0"
}
```

## Client Integration (iOS/macOS)

### Swift Example

```swift
import AVFoundation

class FairPlayDelegate: NSObject, AVContentKeySessionDelegate {
    func contentKeySession(
        _ session: AVContentKeySession,
        didProvide request: AVContentKeyRequest
    ) {
        guard let contentId = request.identifier as? String else { return }

        request.makeStreamingContentKeyRequestData(
            forApp: fpsCertificate,
            contentIdentifier: contentId.data(using: .utf8)!,
            options: nil
        ) { spcData, error in
            guard let spc = spcData else { return }

            // Send SPC to license server
            self.requestLicense(spc: spc, contentId: contentId) { ckc in
                request.processContentKeyResponse(
                    AVContentKeyResponse(fairPlayStreamingKeyResponseData: ckc)
                )
            }
        }
    }

    func requestLicense(spc: Data, contentId: String, completion: @escaping (Data) -> Void) {
        var request = URLRequest(url: URL(string: "https://fluxstudio.art/fps/license?contentId=\(contentId)")!)
        request.httpMethod = "POST"
        request.httpBody = spc
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let ckc = data {
                completion(ckc)
            }
        }.resume()
    }
}
```

## Security Considerations

1. **Never commit credentials**: Add `credentials/` to `.gitignore`
2. **Use AWS Secrets Manager**: Store FPS ASK securely
3. **Rotate keys regularly**: Implement 90-day key rotation
4. **Monitor license requests**: Track for abuse/anomalies
5. **Rate limiting**: Prevent license request flooding
6. **Audit logging**: Log all license issuances

## Deployment

### Docker

```bash
docker build -t fluxstudio-fps-server .
docker run -p 3002:3002 --env-file .env fluxstudio-fps-server
```

### DigitalOcean App Platform

Add to `.do/app.yaml`:

```yaml
services:
  - name: fairplay-license-server
    github:
      repo: your-org/FluxStudio
      branch: main
      deploy_on_push: true
    dockerfile_path: services/fairplay-license-server/Dockerfile
    http_port: 3002
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: FPS_ASK_SECRET_NAME
        value: fluxstudio/fairplay/ask
      - key: AWS_KMS_KEY_ID
        value: alias/fluxstudio-content-keys
```

## Monitoring

Monitor these metrics:
- License request rate
- License success/failure ratio
- Average response time
- Active concurrent streams per user
- Key rotation status

## Troubleshooting

### "Invalid SPC data"
- Check FPS certificate is correct (DER format)
- Verify private key matches certificate
- Ensure client sends proper SPC

### "User does not have access"
- Verify JWT token is valid
- Check user permissions in database
- Review access validator logic

### "KMS key generation failed"
- Verify AWS credentials
- Check KMS key policy allows service to generate keys
- Ensure IAM role has `kms:GenerateDataKey` permission

## License

Proprietary - FluxStudio DRM Infrastructure
