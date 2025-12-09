# AWS FairPlay Infrastructure Setup Guide

Complete guide for configuring AWS services required for FluxStudio's HLS transcoding and FairPlay DRM system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [S3 Bucket Setup](#s3-bucket-setup)
3. [AWS KMS Configuration](#aws-kms-configuration)
4. [AWS Secrets Manager](#aws-secrets-manager)
5. [AWS MediaConvert](#aws-mediaconvert)
6. [IAM Roles and Policies](#iam-roles-and-policies)
7. [CloudFront Distribution](#cloudfront-distribution)
8. [Environment Variables](#environment-variables)
9. [Testing the Setup](#testing-the-setup)

---

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured (`aws configure`)
- Apple FairPlay Streaming credentials (see [FairPlay License Server README](../services/fairplay-license-server/README.md))
- FluxStudio deployed and running

---

## S3 Bucket Setup

### 1. Create S3 Buckets

You need two S3 buckets:
1. **Input Bucket**: For original uploaded files
2. **Output Bucket**: For HLS-transcoded segments and manifests

```bash
# Input bucket (if not already exists)
aws s3 mb s3://fluxstudio-uploads --region us-east-1

# Output bucket for HLS content
aws s3 mb s3://fluxstudio-hls-output --region us-east-1
```

### 2. Configure CORS for Output Bucket

```bash
cat > cors-config.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://fluxstudio.art", "https://*.fluxstudio.art"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket fluxstudio-hls-output \
  --cors-configuration file://cors-config.json
```

### 3. Enable Versioning (Recommended)

```bash
aws s3api put-bucket-versioning \
  --bucket fluxstudio-hls-output \
  --versioning-configuration Status=Enabled
```

---

## AWS KMS Configuration

AWS KMS manages content encryption keys for FairPlay DRM.

### 1. Create KMS Key

```bash
aws kms create-key \
  --description "FluxStudio Content Encryption Keys for FairPlay DRM" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --multi-region false \
  --region us-east-1 \
  --output json > kms-key.json

# Extract Key ID
KMS_KEY_ID=$(cat kms-key.json | jq -r '.KeyMetadata.KeyId')
echo "KMS Key ID: $KMS_KEY_ID"
```

### 2. Create Key Alias

```bash
aws kms create-alias \
  --alias-name alias/fluxstudio-content-keys \
  --target-key-id $KMS_KEY_ID
```

### 3. Update Key Policy (Grant Access to Services)

```bash
cat > kms-key-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow FluxStudio Services",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:role/fluxstudio-media-role"
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow MediaConvert",
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Replace YOUR_ACCOUNT_ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i '' "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" kms-key-policy.json

aws kms put-key-policy \
  --key-id $KMS_KEY_ID \
  --policy-name default \
  --policy file://kms-key-policy.json
```

### 4. Enable Automatic Key Rotation (Recommended)

```bash
aws kms enable-key-rotation --key-id $KMS_KEY_ID
```

---

## AWS Secrets Manager

Store Apple FairPlay Application Secret Key (ASK) securely.

### 1. Store FPS ASK

```bash
# Replace with your actual 32-byte hex ASK from Apple
FPS_ASK="your_32_byte_hex_string_from_apple"

aws secretsmanager create-secret \
  --name fluxstudio/fairplay/ask \
  --description "Apple FairPlay Application Secret Key" \
  --secret-string "{\"ask\":\"$FPS_ASK\"}" \
  --region us-east-1
```

### 2. Verify Secret

```bash
aws secretsmanager get-secret-value \
  --secret-id fluxstudio/fairplay/ask \
  --query SecretString \
  --output text | jq '.'
```

### 3. Grant Access to FairPlay License Server

This will be handled by the IAM role created later.

---

## AWS MediaConvert

AWS MediaConvert handles video transcoding to HLS format.

### 1. Get MediaConvert Endpoint

Each AWS account has a unique MediaConvert endpoint:

```bash
aws mediaconvert describe-endpoints \
  --region us-east-1 \
  --query 'Endpoints[0].Url' \
  --output text

# Example output: https://abc123def.mediaconvert.us-east-1.amazonaws.com
```

Save this endpoint - you'll need it for environment variables.

### 2. Create MediaConvert IAM Role

```bash
cat > mediaconvert-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name MediaConvertRole \
  --assume-role-policy-document file://mediaconvert-trust-policy.json

# Attach necessary permissions
aws iam attach-role-policy \
  --role-name MediaConvertRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name MediaConvertRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### 3. Create MediaConvert Queue (Optional)

```bash
aws mediaconvert create-queue \
  --name fluxstudio-hls-queue \
  --description "FluxStudio HLS transcoding queue" \
  --region us-east-1
```

---

## IAM Roles and Policies

### 1. Create FluxStudio Service Role

```bash
cat > fluxstudio-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name fluxstudio-media-role \
  --assume-role-policy-document file://fluxstudio-trust-policy.json
```

### 2. Create Custom Policy for FluxStudio

```bash
cat > fluxstudio-media-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::fluxstudio-uploads/*",
        "arn:aws:s3:::fluxstudio-hls-output/*",
        "arn:aws:s3:::fluxstudio-uploads",
        "arn:aws:s3:::fluxstudio-hls-output"
      ]
    },
    {
      "Sid": "MediaConvertAccess",
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs",
        "mediaconvert:CancelJob",
        "mediaconvert:DescribeEndpoints"
      ],
      "Resource": "*"
    },
    {
      "Sid": "KMSAccess",
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:$ACCOUNT_ID:key/*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:$ACCOUNT_ID:secret:fluxstudio/*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::$ACCOUNT_ID:role/MediaConvertRole"
    }
  ]
}
EOF

# Replace account ID
sed -i '' "s/\$ACCOUNT_ID/$ACCOUNT_ID/g" fluxstudio-media-policy.json

# Create policy
aws iam create-policy \
  --policy-name FluxStudioMediaPolicy \
  --policy-document file://fluxstudio-media-policy.json \
  --description "FluxStudio media transcoding and DRM permissions"

# Attach to role
aws iam attach-role-policy \
  --role-name fluxstudio-media-role \
  --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/FluxStudioMediaPolicy
```

---

## CloudFront Distribution

CloudFront serves HLS content with low latency and HTTPS.

### 1. Create CloudFront Distribution

```bash
cat > cloudfront-config.json <<EOF
{
  "CallerReference": "fluxstudio-hls-$(date +%s)",
  "Comment": "FluxStudio HLS Content Delivery",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-fluxstudio-hls-output",
        "DomainName": "fluxstudio-hls-output.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-fluxstudio-hls-output",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### 2. Get CloudFront Domain

```bash
aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Comment==`FluxStudio HLS Content Delivery`].DomainName' \
  --output text
```

Save this domain for environment variables.

---

## Environment Variables

Update your `.env.production` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# S3 Buckets
AWS_S3_BUCKET=fluxstudio-uploads
AWS_S3_OUTPUT_BUCKET=fluxstudio-hls-output

# CloudFront
CLOUDFRONT_DOMAIN=d3abc123xyz.cloudfront.net

# AWS MediaConvert
AWS_MEDIACONVERT_ENDPOINT=https://abc123def.mediaconvert.us-east-1.amazonaws.com
AWS_MEDIACONVERT_ROLE=arn:aws:iam::123456789012:role/MediaConvertRole
AWS_MEDIACONVERT_QUEUE=Default

# AWS KMS
AWS_KMS_KEY_ID=alias/fluxstudio-content-keys

# FairPlay License Server
FAIRPLAY_LICENSE_SERVER_URL=https://fluxstudio.art/fps
FPS_ASK_SECRET_NAME=fluxstudio/fairplay/ask
FPS_CERTIFICATE_PATH=./services/fairplay-license-server/credentials/fps_cert.der
FPS_PRIVATE_KEY_PATH=./services/fairplay-license-server/credentials/fps_private_key.pem
```

---

## Testing the Setup

### 1. Test KMS Key Generation

```bash
node -e "
const AWS = require('aws-sdk');
const kms = new AWS.KMS({ region: 'us-east-1' });

kms.generateDataKey({
  KeyId: 'alias/fluxstudio-content-keys',
  KeySpec: 'AES_128'
}, (err, data) => {
  if (err) console.error('Error:', err);
  else console.log('✅ KMS key generation successful');
});
"
```

### 2. Test Secrets Manager Access

```bash
node -e "
const AWS = require('aws-sdk');
const secrets = new AWS.SecretsManager({ region: 'us-east-1' });

secrets.getSecretValue({
  SecretId: 'fluxstudio/fairplay/ask'
}, (err, data) => {
  if (err) console.error('Error:', err);
  else console.log('✅ Secrets Manager access successful');
});
"
```

### 3. Test S3 Upload

```bash
echo "test" > test-file.txt

aws s3 cp test-file.txt s3://fluxstudio-uploads/test/ && \
aws s3 cp test-file.txt s3://fluxstudio-hls-output/test/ && \
echo "✅ S3 upload successful"

# Cleanup
aws s3 rm s3://fluxstudio-uploads/test/test-file.txt
aws s3 rm s3://fluxstudio-hls-output/test/test-file.txt
rm test-file.txt
```

### 4. Test MediaConvert Job (Sample)

```bash
node -e "
const AWS = require('aws-sdk');
const mediaConvert = new AWS.MediaConvert({
  region: 'us-east-1',
  endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT
});

mediaConvert.describeEndpoints({}, (err, data) => {
  if (err) console.error('Error:', err);
  else console.log('✅ MediaConvert endpoint accessible');
});
"
```

---

## Cost Estimates

Based on 1000 minutes of video transcoded monthly:

- **AWS MediaConvert**: ~$30/month (HD quality, 3 outputs)
- **S3 Storage (1TB)**: ~$23/month
- **CloudFront (100GB transfer)**: ~$8.50/month
- **KMS**: $1/month (per key)
- **Secrets Manager**: $0.40/month (per secret)

**Total**: ~$63/month for moderate usage

---

## Troubleshooting

### MediaConvert Job Fails

1. Check IAM role has S3 access
2. Verify input file exists and is accessible
3. Check MediaConvert service quotas in AWS Console

### KMS Encryption Errors

1. Verify key policy allows your IAM role
2. Check key is in correct region
3. Ensure key rotation hasn't caused issues

### CloudFront 403 Errors

1. Check S3 bucket permissions
2. Verify CloudFront OAI (Origin Access Identity)
3. Check CORS configuration

---

## Security Best Practices

1. **Rotate AWS credentials** every 90 days
2. **Enable CloudTrail** for API audit logging
3. **Use IAM roles** instead of access keys where possible
4. **Enable S3 bucket logging**
5. **Set up CloudWatch alarms** for unusual activity
6. **Restrict KMS key access** to minimum required services
7. **Enable MFA** for AWS Console access

---

## Next Steps

1. [Deploy FairPlay License Server](../services/fairplay-license-server/README.md)
2. [Run Database Migration](../database/migrations/010_drm_support.sql)
3. [Configure Frontend Video Player](../src/components/media/SecureVideoPlayer.tsx)
4. [Test End-to-End Workflow](#end-to-end-test)

---

## Support

For issues with AWS setup:
- AWS Support: https://console.aws.amazon.com/support
- FluxStudio Issues: https://github.com/your-org/fluxstudio/issues
- Apple FPS Support: https://developer.apple.com/contact/

---

**Last Updated**: $(date +%Y-%m-%d)
**Version**: 1.0.0
