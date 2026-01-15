/**
 * Sprint 9 Integration Test Suite
 * Tests all major features implemented in Sprint 9:
 * - Performance monitoring and alerting
 * - Enhanced file upload with security scanning
 * - Database performance monitoring
 * - Real-time WebSocket metrics streaming
 * - Message threading and search
 */

const request = require('supertest');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { io } = require('socket.io-client');

// Test configuration (unified backend consolidates all services on 3001)
const AUTH_SERVER_URL = process.env.UNIFIED_BACKEND_URL || 'http://localhost:3001';
const MESSAGING_SERVER_URL = process.env.UNIFIED_BACKEND_URL || 'http://localhost:3001';
const WS_PERFORMANCE_URL = 'ws://localhost:3001/performance';
const WS_FILES_URL = 'ws://localhost:3001/files';

describe('Sprint 9 Integration Tests', function() {
  this.timeout(30000); // 30 second timeout for integration tests

  let authToken;
  let testUser;
  let performanceSocket;
  let filesSocket;

  before(async function() {
    console.log('🚀 Starting Sprint 9 Integration Test Suite...\n');

    // Wait for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  after(async function() {
    // Cleanup WebSocket connections
    if (performanceSocket) performanceSocket.disconnect();
    if (filesSocket) filesSocket.disconnect();

    console.log('\n✅ Sprint 9 Integration Tests Complete');
  });

  describe('🔐 Authentication & Setup', function() {
    it('should create test user and authenticate', async function() {
      const userData = {
        name: 'Integration Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      // Create test user
      const signupResponse = await request(AUTH_SERVER_URL)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(signupResponse.body).to.have.property('token');
      expect(signupResponse.body.user).to.have.property('email', userData.email);

      authToken = signupResponse.body.token;
      testUser = signupResponse.body.user;

      console.log(`   ✓ Created test user: ${testUser.email}`);
    });

    it('should authenticate and get user profile', async function() {
      const response = await request(AUTH_SERVER_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).to.have.property('id', testUser.id);
      console.log(`   ✓ Authenticated user: ${response.body.user.name}`);
    });
  });

  describe('📊 Performance Monitoring System', function() {
    it('should establish WebSocket connection to performance dashboard', function(done) {
      performanceSocket = io(`${AUTH_SERVER_URL}/performance`, {
        transports: ['websocket'],
        timeout: 5000
      });

      performanceSocket.on('connect', () => {
        console.log('   ✓ Connected to performance WebSocket');
        done();
      });

      performanceSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should receive real-time system metrics', function(done) {
      performanceSocket.on('system_metrics', (metrics) => {
        expect(metrics).to.be.an('object');
        expect(metrics).to.have.property('timestamp');
        expect(metrics).to.have.property('cpu_usage');
        expect(metrics).to.have.property('memory_usage');
        expect(metrics).to.have.property('database_connections');
        expect(metrics).to.have.property('database_query_time');

        console.log(`   ✓ Received metrics: CPU ${metrics.cpu_usage}%, Memory ${metrics.memory_usage}%`);
        done();
      });

      // Request metrics
      performanceSocket.emit('request_metrics');
    });

    it('should track API response times', async function() {
      const startTime = Date.now();

      await request(AUTH_SERVER_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).to.be.below(1000); // Should respond within 1 second

      console.log(`   ✓ API response time: ${responseTime}ms`);
    });
  });

  describe('🔒 Enhanced File Upload System', function() {
    let uploadSession;

    it('should establish WebSocket connection for file uploads', function(done) {
      filesSocket = io(`${AUTH_SERVER_URL}/files`, {
        transports: ['websocket'],
        timeout: 5000
      });

      filesSocket.on('connect', () => {
        console.log('   ✓ Connected to file upload WebSocket');
        done();
      });

      filesSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should create test file for upload', function() {
      const testFilePath = path.join(__dirname, 'test-upload.txt');
      const testContent = 'This is a test file for integration testing.\nCreated at: ' + new Date().toISOString();

      fs.writeFileSync(testFilePath, testContent);
      expect(fs.existsSync(testFilePath)).to.be.true;

      console.log('   ✓ Created test file for upload');
    });

    it('should upload file with progress tracking', function(done) {
      const testFilePath = path.join(__dirname, 'test-upload.txt');
      let progressReceived = false;

      // Listen for upload progress
      filesSocket.on('upload_progress', (progress) => {
        progressReceived = true;
        uploadSession = progress;

        expect(progress).to.have.property('uploadId');
        expect(progress).to.have.property('filename', 'test-upload.txt');
        expect(progress).to.have.property('progress');
        expect(progress).to.have.property('stage');
        expect(progress).to.have.property('securityStatus');

        console.log(`   ✓ Upload progress: ${progress.progress}% - ${progress.stage}`);

        if (progress.status === 'completed') {
          expect(progressReceived).to.be.true;
          done();
        }
      });

      // Perform file upload
      request(AUTH_SERVER_URL)
        .post('/api/files/upload-enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .field('socketId', filesSocket.id)
        .field('userId', testUser.id)
        .attach('file', testFilePath)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.status).to.equal(200);
        });
    });

    it('should complete security scan', function(done) {
      filesSocket.on('file_scan_complete', (scanResult) => {
        expect(scanResult).to.have.property('fileId');
        expect(scanResult).to.have.property('uploadId', uploadSession.uploadId);
        expect(scanResult.scanResult).to.have.property('status');
        expect(scanResult.scanResult).to.have.property('threats');
        expect(scanResult.scanResult).to.have.property('scanDuration');

        console.log(`   ✓ Security scan complete: ${scanResult.scanResult.status}`);
        console.log(`   ✓ Scan duration: ${scanResult.scanResult.scanDuration}ms`);

        done();
      });
    });

    it('should list uploaded files', async function() {
      const response = await request(AUTH_SERVER_URL)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body.length).to.be.at.least(1);

      const uploadedFile = response.body.find(f => f.original_name === 'test-upload.txt');
      expect(uploadedFile).to.exist;
      expect(uploadedFile).to.have.property('security_status');

      console.log(`   ✓ Listed ${response.body.length} files, security status: ${uploadedFile.security_status}`);
    });

    after(function() {
      // Cleanup test file
      const testFilePath = path.join(__dirname, 'test-upload.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('💬 Message Threading System', function() {
    let conversationId;
    let parentMessageId;

    it('should create test conversation', async function() {
      const conversationData = {
        name: 'Integration Test Conversation',
        description: 'Test conversation for threading',
        type: 'group'
      };

      const response = await request(MESSAGING_SERVER_URL)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData)
        .expect(201);

      expect(response.body).to.have.property('id');
      conversationId = response.body.id;

      console.log(`   ✓ Created conversation: ${conversationId}`);
    });

    it('should send parent message', async function() {
      const messageData = {
        content: 'This is a parent message for threading test',
        conversation_id: conversationId
      };

      const response = await request(MESSAGING_SERVER_URL)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body).to.have.property('id');
      parentMessageId = response.body.id;

      console.log(`   ✓ Sent parent message: ${parentMessageId}`);
    });

    it('should send threaded reply', async function() {
      const replyData = {
        content: 'This is a threaded reply to the parent message',
        conversation_id: conversationId,
        reply_to_id: parentMessageId
      };

      const response = await request(MESSAGING_SERVER_URL)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(replyData)
        .expect(201);

      expect(response.body).to.have.property('reply_to_id', parentMessageId);

      console.log(`   ✓ Sent threaded reply: ${response.body.id}`);
    });

    it('should retrieve message thread', async function() {
      const response = await request(MESSAGING_SERVER_URL)
        .get(`/api/messages/${parentMessageId}/thread`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body.length).to.be.at.least(2); // Parent + reply

      const parentMsg = response.body.find(m => m.id === parentMessageId);
      const replyMsg = response.body.find(m => m.reply_to_id === parentMessageId);

      expect(parentMsg).to.exist;
      expect(replyMsg).to.exist;

      console.log(`   ✓ Retrieved thread with ${response.body.length} messages`);
    });
  });

  describe('🔍 Full-Text Search System', function() {
    it('should search messages by content', async function() {
      const searchQuery = 'threading test';

      const response = await request(MESSAGING_SERVER_URL)
        .get('/api/search/messages')
        .query({ q: searchQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body.length).to.be.at.least(1);

      const foundMessage = response.body[0];
      expect(foundMessage).to.have.property('content');
      expect(foundMessage.content.toLowerCase()).to.include('threading');

      console.log(`   ✓ Found ${response.body.length} messages for "${searchQuery}"`);
    });

    it('should search conversations', async function() {
      const searchQuery = 'Integration Test';

      const response = await request(MESSAGING_SERVER_URL)
        .get('/api/search/conversations')
        .query({ q: searchQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body.length).to.be.at.least(1);

      const foundConversation = response.body[0];
      expect(foundConversation).to.have.property('name');
      expect(foundConversation.name).to.include('Integration Test');

      console.log(`   ✓ Found ${response.body.length} conversations for "${searchQuery}"`);
    });
  });

  describe('📈 Database Performance Monitoring', function() {
    it('should track database connection pool metrics', function(done) {
      performanceSocket.on('database_metrics', (dbMetrics) => {
        expect(dbMetrics).to.be.an('array');

        if (dbMetrics.length > 0) {
          const metric = dbMetrics[0];
          expect(metric).to.have.property('table_name');
          expect(metric).to.have.property('size_mb');
          expect(metric).to.have.property('query_count');
        }

        console.log(`   ✓ Received database metrics for ${dbMetrics.length} tables`);
        done();
      });

      performanceSocket.emit('request_database_metrics');
    });

    it('should monitor slow queries', async function() {
      // Trigger some database operations to generate metrics
      await request(MESSAGING_SERVER_URL)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(AUTH_SERVER_URL)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check if metrics are being tracked
      const metricsResponse = await performanceSocket.emitWithAck('get_slow_queries');
      expect(metricsResponse).to.be.an('object');

      console.log('   ✓ Slow query monitoring active');
    });
  });

  describe('🏥 System Health Checks', function() {
    it('should verify auth service health', async function() {
      const response = await request(AUTH_SERVER_URL)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('uptime');
      expect(response.body).to.have.property('timestamp');

      console.log(`   ✓ Auth service healthy - uptime: ${Math.round(response.body.uptime)}s`);
    });

    it('should verify messaging service health', async function() {
      const response = await request(MESSAGING_SERVER_URL)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('uptime');

      console.log(`   ✓ Messaging service healthy - uptime: ${Math.round(response.body.uptime)}s`);
    });

    it('should verify WebSocket connectivity', function() {
      expect(performanceSocket.connected).to.be.true;
      expect(filesSocket.connected).to.be.true;

      console.log('   ✓ All WebSocket connections active');
    });
  });

  describe('🔒 Security Validation', function() {
    it('should reject unauthorized requests', async function() {
      await request(AUTH_SERVER_URL)
        .get('/api/auth/me')
        .expect(401);

      console.log('   ✓ Unauthorized access properly rejected');
    });

    it('should validate file upload security', async function() {
      // Test malicious filename
      const testFilePath = path.join(__dirname, 'test-malicious.txt');
      fs.writeFileSync(testFilePath, '<script>alert("xss")</script>');

      const response = await request(AUTH_SERVER_URL)
        .post('/api/files/upload-enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .field('socketId', filesSocket.id)
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body).to.have.property('securityStatus');

      // Cleanup
      fs.unlinkSync(testFilePath);

      console.log(`   ✓ File security validation active: ${response.body.securityStatus}`);
    });

    it('should enforce rate limiting', async function() {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(AUTH_SERVER_URL)
            .post('/api/auth/login')
            .send({ email: 'invalid@test.com', password: 'wrong' })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).to.be.at.least(1);
      console.log(`   ✓ Rate limiting active - ${rateLimitedResponses.length} requests blocked`);
    });
  });

  describe('📊 Performance Benchmarks', function() {
    it('should meet API response time benchmarks', async function() {
      const endpoints = [
        '/api/auth/me',
        '/api/files',
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();

        await request(AUTH_SERVER_URL)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const responseTime = Date.now() - startTime;
        expect(responseTime).to.be.below(500); // 500ms threshold

        console.log(`   ✓ ${endpoint}: ${responseTime}ms`);
      }
    });

    it('should handle concurrent file uploads', async function() {
      this.timeout(15000);

      const uploadPromises = [];
      for (let i = 0; i < 3; i++) {
        const testFilePath = path.join(__dirname, `concurrent-test-${i}.txt`);
        fs.writeFileSync(testFilePath, `Concurrent test file ${i}\n${Date.now()}`);

        uploadPromises.push(
          request(AUTH_SERVER_URL)
            .post('/api/files/upload-enhanced')
            .set('Authorization', `Bearer ${authToken}`)
            .field('socketId', filesSocket.id)
            .attach('file', testFilePath)
        );
      }

      const results = await Promise.all(uploadPromises);

      results.forEach((result, index) => {
        expect(result.status).to.equal(200);

        // Cleanup
        const testFilePath = path.join(__dirname, `concurrent-test-${index}.txt`);
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      });

      console.log(`   ✓ Handled ${results.length} concurrent uploads successfully`);
    });
  });
});

// Helper function for WebSocket testing
function waitForSocketEvent(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeout);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}