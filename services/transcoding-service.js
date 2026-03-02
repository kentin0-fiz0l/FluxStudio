/**
 * HLS Transcoding Service for FluxStudio
 * Handles video transcoding to HLS format with FairPlay encryption
 *
 * Features:
 * - AWS MediaConvert job submission
 * - Multi-bitrate adaptive streaming (360p, 720p, 1080p)
 * - FairPlay DRM encryption during transcode
 * - Job status monitoring and database updates
 * - Automatic content key generation via KMS
 */

const AWS = require('aws-sdk');
const { query } = require('../database/config');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { createLogger } = require('../lib/logger');
const log = createLogger('Transcoding');

// AWS SDK configuration
const mediaConvert = new AWS.MediaConvert({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT // Required: Get from AWS Console
});

const kms = new AWS.KMS({
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configuration
const CONFIG = {
  inputBucket: process.env.AWS_S3_BUCKET || 'fluxstudio-uploads',
  outputBucket: process.env.AWS_S3_OUTPUT_BUCKET || 'fluxstudio-hls-output',
  cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || 'd3example.cloudfront.net',
  iamRole: process.env.AWS_MEDIACONVERT_ROLE,
  kmsKeyId: process.env.AWS_KMS_KEY_ID || 'alias/fluxstudio-content-keys',
  jobQueue: process.env.AWS_MEDIACONVERT_QUEUE || 'Default'
};

/**
 * Generate a content encryption key using AWS KMS
 */
async function generateContentKey(contentId) {
  try {
    const params = {
      KeyId: CONFIG.kmsKeyId,
      KeySpec: 'AES_128',
      EncryptionContext: {
        contentId: contentId,
        service: 'fluxstudio-fairplay',
        timestamp: new Date().toISOString()
      }
    };

    const { Plaintext, CiphertextBlob, KeyId } = await kms.generateDataKey(params).promise();

    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(16);

    return {
      key: Plaintext, // 16-byte AES-128 key
      encryptedKey: CiphertextBlob.toString('base64'),
      iv: iv.toString('hex'),
      keyId: KeyId
    };
  } catch (error) {
    log.error('Failed to generate content key', error);
    throw new Error('Content key generation failed');
  }
}

/**
 * Store content key in database
 */
async function storeContentKey(contentId, keyData) {
  const keyId = uuidv4();

  await query(
    `INSERT INTO content_keys (id, content_id, content_key, iv, algorithm, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [keyId, contentId, keyData.encryptedKey, keyData.iv, 'AES-128']
  );

  return keyId;
}

/**
 * Create HLS transcoding job with FairPlay encryption
 */
async function createTranscodingJob({ fileId, fileName, s3Key, userId, enableDrm = false }) {
  try {
    log.info('Creating job for file', { fileId });

    // Generate content key if DRM is enabled
    let contentKey = null;
    let keyId = null;

    if (enableDrm) {
      contentKey = await generateContentKey(fileId);
      keyId = await storeContentKey(fileId, contentKey);
      log.info('Generated content key', { keyId });
    }

    const outputPrefix = `hls/${fileId}/`;
    const inputUrl = `s3://${CONFIG.inputBucket}/${s3Key}`;

    // MediaConvert job settings
    const jobSettings = {
      OutputGroups: [
        {
          Name: 'HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              SegmentLength: 6,
              MinSegmentLength: 0,
              Destination: `s3://${CONFIG.outputBucket}/${outputPrefix}`,
              SegmentControl: 'SEGMENTED_FILES',
              ManifestDurationFormat: 'INTEGER',
              StreamInfResolution: 'INCLUDE',
              ClientCache: 'ENABLED',
              CaptionLanguageSetting: 'OMIT',
              ManifestCompression: 'NONE',
              CodecSpecification: 'RFC_4281',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              TimedMetadataId3Period: 10,
              TimedMetadataId3Frame: 'PRIV',
              TimestampDeltaMilliseconds: 0
            }
          },
          Outputs: [
            // 1080p output
            {
              NameModifier: '_1080p',
              VideoDescription: {
                Width: 1920,
                Height: 1080,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    MaxBitrate: 5000000,
                    RateControlMode: 'QVBR',
                    QualityTuningLevel: 'SINGLE_PASS_HQ',
                    GopSize: 90,
                    GopSizeUnits: 'FRAMES',
                    SceneChangeDetect: 'TRANSITION_DETECTION'
                  }
                }
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 128000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000
                    }
                  }
                }
              ],
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {
                  AudioFramesPerPes: 4,
                  PcrControl: 'PCR_EVERY_PES_PACKET',
                  PmtPid: 480,
                  PrivateMetadataPid: 503,
                  VideoPid: 481
                }
              }
            },
            // 720p output
            {
              NameModifier: '_720p',
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    MaxBitrate: 3000000,
                    RateControlMode: 'QVBR',
                    QualityTuningLevel: 'SINGLE_PASS_HQ'
                  }
                }
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000
                    }
                  }
                }
              ],
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {}
              }
            },
            // 480p output
            {
              NameModifier: '_480p',
              VideoDescription: {
                Width: 854,
                Height: 480,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    MaxBitrate: 1500000,
                    RateControlMode: 'QVBR',
                    QualityTuningLevel: 'SINGLE_PASS_HQ'
                  }
                }
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 64000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000
                    }
                  }
                }
              ],
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {}
              }
            }
          ]
        }
      ],
      Inputs: [
        {
          FileInput: inputUrl,
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT'
            }
          },
          VideoSelector: {},
          TimecodeSource: 'ZEROBASED'
        }
      ]
    };

    // Add FairPlay encryption if DRM is enabled
    if (enableDrm && contentKey) {
      // Upload content key to S3 for MediaConvert
      const keyFileName = `keys/${fileId}/content_key.bin`;
      await s3.putObject({
        Bucket: CONFIG.outputBucket,
        Key: keyFileName,
        Body: contentKey.key,
        ServerSideEncryption: 'AES256'
      }).promise();

      // Add encryption settings to HLS output group
      jobSettings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.Encryption = {
        Type: 'SAMPLE_AES',
        ConstantInitializationVector: contentKey.iv,
        EncryptionMethod: 'SAMPLE_AES',
        KeyProviderSettings: {
          StaticKeySettings: {
            StaticKeyValue: contentKey.key.toString('hex'),
            KeyFormat: 'identity'
          }
        }
      };

      log.info('Enabled FairPlay encryption', { fileId });
    }

    // Create MediaConvert job
    const jobParams = {
      Role: CONFIG.iamRole,
      Settings: jobSettings,
      Queue: CONFIG.jobQueue,
      UserMetadata: {
        fileId: fileId,
        userId: userId,
        enableDrm: enableDrm.toString()
      }
    };

    const job = await mediaConvert.createJob(jobParams).promise();
    const jobId = job.Job.Id;

    log.info('MediaConvert job created', { jobId });

    // Store transcoding job in database
    const transcodingJobId = uuidv4();
    await query(
      `INSERT INTO transcoding_jobs
       (id, file_id, job_id, status, input_url, output_bucket, output_prefix,
        submitted_at, settings, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())`,
      [
        transcodingJobId,
        fileId,
        jobId,
        'submitted',
        inputUrl,
        CONFIG.outputBucket,
        outputPrefix,
        JSON.stringify({ enableDrm, bitrates: ['1080p', '720p', '480p'] })
      ]
    );

    // Update file record with transcoding info
    await query(
      `UPDATE files
       SET transcoding_status = $1,
           transcoding_job_id = $2,
           drm_protected = $3,
           content_key_id = $4,
           updated_at = NOW()
       WHERE id = $5`,
      ['processing', jobId, enableDrm, keyId, fileId]
    );

    return {
      jobId,
      transcodingJobId,
      status: 'submitted',
      outputUrl: `https://${CONFIG.cloudFrontDomain}/${outputPrefix}master.m3u8`
    };

  } catch (error) {
    log.error('Job creation failed', error);

    // Update file status to failed
    await query(
      `UPDATE files
       SET transcoding_status = $1, updated_at = NOW()
       WHERE id = $2`,
      ['failed', fileId]
    );

    throw error;
  }
}

/**
 * Check transcoding job status
 */
async function checkJobStatus(jobId) {
  try {
    const job = await mediaConvert.getJob({ Id: jobId }).promise();

    const status = job.Job.Status;
    const progress = job.Job.JobPercentComplete || 0;

    return {
      status: status.toLowerCase(),
      progress,
      createdAt: job.Job.CreatedAt,
      completedAt: job.Job.Timing?.FinishTime,
      errorMessage: job.Job.ErrorMessage,
      errorCode: job.Job.ErrorCode
    };
  } catch (error) {
    log.error('Status check failed', error);
    throw error;
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(fileId, statusData) {
  try {
    // Map MediaConvert status to our statuses
    const statusMapping = {
      'submitted': 'processing',
      'progressing': 'processing',
      'complete': 'completed',
      'canceled': 'failed',
      'error': 'failed'
    };

    const mappedStatus = statusMapping[statusData.status] || 'processing';

    // Update transcoding_jobs table
    await query(
      `UPDATE transcoding_jobs
       SET status = $1,
           progress = $2,
           completed_at = $3,
           error_message = $4,
           error_code = $5
       WHERE file_id = $6`,
      [
        statusData.status,
        statusData.progress,
        statusData.completedAt || null,
        statusData.errorMessage || null,
        statusData.errorCode || null,
        fileId
      ]
    );

    // Update files table
    const updateQuery = `
      UPDATE files
      SET transcoding_status = $1,
          updated_at = NOW()
          ${statusData.status === 'complete' ? ', hls_manifest_url = $3' : ''}
      WHERE id = $2
    `;

    const params = [mappedStatus, fileId];

    if (statusData.status === 'complete') {
      // Get output prefix from transcoding_jobs
      const result = await query(
        'SELECT output_prefix FROM transcoding_jobs WHERE file_id = $1',
        [fileId]
      );

      if (result.rows.length > 0) {
        const manifestUrl = `https://${CONFIG.cloudFrontDomain}/${result.rows[0].output_prefix}master.m3u8`;
        params.push(manifestUrl);
      }
    }

    await query(updateQuery, params);

    log.info('Updated status for file', { fileId, status: mappedStatus, progress: statusData.progress });

    return { success: true, status: mappedStatus };

  } catch (error) {
    log.error('Failed to update job status', error);
    throw error;
  }
}

/**
 * Monitor all in-progress jobs (called periodically)
 */
async function monitorJobs() {
  try {
    // Get all jobs in processing state
    const result = await query(
      `SELECT tj.id, tj.file_id, tj.job_id, tj.status
       FROM transcoding_jobs tj
       WHERE tj.status IN ('submitted', 'progressing')
       ORDER BY tj.created_at ASC
       LIMIT 50`
    );

    log.info('Checking active jobs', { count: result.rows.length });

    for (const job of result.rows) {
      try {
        const statusData = await checkJobStatus(job.job_id);
        await updateJobStatus(job.file_id, statusData);
      } catch (error) {
        log.error('Error checking job', error, { jobId: job.job_id });
      }
    }

    return { checked: result.rows.length };

  } catch (error) {
    log.error('Monitor failed', error);
    throw error;
  }
}

/**
 * Get transcoding status for a file
 */
async function getTranscodingStatus(fileId) {
  const result = await query(
    `SELECT
      f.id,
      f.name,
      f.transcoding_status,
      f.hls_manifest_url,
      f.drm_protected,
      tj.job_id,
      tj.status as job_status,
      tj.progress,
      tj.error_message,
      tj.created_at,
      tj.completed_at
     FROM files f
     LEFT JOIN transcoding_jobs tj ON f.id = tj.file_id
     WHERE f.id = $1`,
    [fileId]
  );

  if (result.rows.length === 0) {
    throw new Error('File not found');
  }

  return result.rows[0];
}

module.exports = {
  createTranscodingJob,
  checkJobStatus,
  updateJobStatus,
  monitorJobs,
  getTranscodingStatus,
  generateContentKey,
  storeContentKey
};
