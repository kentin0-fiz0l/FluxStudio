/**
 * Load Testing Suite for FluxStudio Sprint 10 Production
 * Enhanced performance testing with production optimizations
 * Tests system performance, scaling, and monitoring under various load conditions
 */

const request = require('supertest');
const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const AUTH_SERVER_URL = 'http://localhost:3001';
const MESSAGING_SERVER_URL = 'http://localhost:3004';

class LoadTester {
  constructor() {
    this.results = {
      auth: [],
      files: [],
      messaging: [],
      websockets: [],
      organizations: [],
      production: [],
      scaling: [],
      memory: []
    };
    this.authToken = null;
    this.testUsers = [];
    this.performanceMetrics = {
      cpuUsage: [],
      memoryUsage: [],
      responseLatency: [],
      throughput: []
    };
  }

  async setup() {
    console.log('🔧 Setting up load test environment...\n');

    // Create test user for load testing
    const userData = {
      name: 'Load Test User',
      email: `loadtest-${Date.now()}@example.com`,
      password: 'LoadTest123!'
    };

    const signupResponse = await request(AUTH_SERVER_URL)
      .post('/api/auth/signup')
      .send(userData);

    if (signupResponse.status !== 201) {
      throw new Error('Failed to create test user');
    }

    this.authToken = signupResponse.body.token;
    console.log('✓ Test user created and authenticated\n');
  }

  async testAuthenticationLoad(concurrency = 10, requests = 100) {
    console.log(`🔐 Testing Authentication Load: ${concurrency} concurrent, ${requests} total requests`);

    const startTime = Date.now();
    const promises = [];
    const requestsPerWorker = Math.floor(requests / concurrency);

    for (let worker = 0; worker < concurrency; worker++) {
      promises.push(this.authWorker(requestsPerWorker, worker));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Aggregate results
    const allResponses = results.flat();
    const successfulRequests = allResponses.filter(r => r.success).length;
    const avgResponseTime = allResponses.reduce((sum, r) => sum + r.responseTime, 0) / allResponses.length;
    const requestsPerSecond = (successfulRequests / totalTime) * 1000;

    this.results.auth = {
      totalRequests: allResponses.length,
      successfulRequests,
      failedRequests: allResponses.length - successfulRequests,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond),
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulRequests}/${allResponses.length} successful`);
    console.log(`   ✓ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   ✓ Requests/sec: ${Math.round(requestsPerSecond)}\n`);
  }

  async authWorker(requests, workerId) {
    const results = [];

    for (let i = 0; i < requests; i++) {
      const startTime = Date.now();
      try {
        const response = await request(AUTH_SERVER_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${this.authToken}`);

        results.push({
          success: response.status === 200,
          responseTime: Date.now() - startTime,
          status: response.status
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return results;
  }

  async testFileUploadLoad(concurrency = 5, files = 20) {
    console.log(`📁 Testing File Upload Load: ${concurrency} concurrent, ${files} total files`);

    // Create test files
    const testFiles = [];
    for (let i = 0; i < files; i++) {
      const filePath = path.join(__dirname, `load-test-${i}.txt`);
      const content = `Load test file ${i}\nCreated: ${new Date().toISOString()}\nSize: ${'x'.repeat(1000)}`;
      fs.writeFileSync(filePath, content);
      testFiles.push(filePath);
    }

    const startTime = Date.now();
    const promises = [];
    const filesPerWorker = Math.floor(files / concurrency);

    for (let worker = 0; worker < concurrency; worker++) {
      const workerFiles = testFiles.slice(worker * filesPerWorker, (worker + 1) * filesPerWorker);
      promises.push(this.fileUploadWorker(workerFiles, worker));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Cleanup test files
    testFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Aggregate results
    const allResponses = results.flat();
    const successfulUploads = allResponses.filter(r => r.success).length;
    const avgUploadTime = allResponses.reduce((sum, r) => sum + r.uploadTime, 0) / allResponses.length;
    const uploadsPerSecond = (successfulUploads / totalTime) * 1000;

    this.results.files = {
      totalUploads: allResponses.length,
      successfulUploads,
      failedUploads: allResponses.length - successfulUploads,
      avgUploadTime: Math.round(avgUploadTime),
      uploadsPerSecond: Math.round(uploadsPerSecond * 100) / 100,
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulUploads}/${allResponses.length} successful uploads`);
    console.log(`   ✓ Avg Upload Time: ${Math.round(avgUploadTime)}ms`);
    console.log(`   ✓ Uploads/sec: ${Math.round(uploadsPerSecond * 100) / 100}\n`);
  }

  async fileUploadWorker(filePaths, workerId) {
    const results = [];

    for (const filePath of filePaths) {
      const startTime = Date.now();
      try {
        const response = await request(AUTH_SERVER_URL)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${this.authToken}`)
          .attach('file', filePath);

        results.push({
          success: response.status === 200,
          uploadTime: Date.now() - startTime,
          status: response.status,
          fileSize: fs.statSync(filePath).size
        });
      } catch (error) {
        results.push({
          success: false,
          uploadTime: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return results;
  }

  async testMessagingLoad(concurrency = 8, messages = 100) {
    console.log(`💬 Testing Messaging Load: ${concurrency} concurrent, ${messages} total messages`);

    // Create test conversation
    const conversationResponse = await request(MESSAGING_SERVER_URL)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${this.authToken}`)
      .send({
        name: 'Load Test Conversation',
        description: 'Conversation for load testing',
        type: 'group'
      });

    if (conversationResponse.status !== 201) {
      throw new Error('Failed to create test conversation');
    }

    const conversationId = conversationResponse.body.id;

    const startTime = Date.now();
    const promises = [];
    const messagesPerWorker = Math.floor(messages / concurrency);

    for (let worker = 0; worker < concurrency; worker++) {
      promises.push(this.messagingWorker(conversationId, messagesPerWorker, worker));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Aggregate results
    const allResponses = results.flat();
    const successfulMessages = allResponses.filter(r => r.success).length;
    const avgResponseTime = allResponses.reduce((sum, r) => sum + r.responseTime, 0) / allResponses.length;
    const messagesPerSecond = (successfulMessages / totalTime) * 1000;

    this.results.messaging = {
      totalMessages: allResponses.length,
      successfulMessages,
      failedMessages: allResponses.length - successfulMessages,
      avgResponseTime: Math.round(avgResponseTime),
      messagesPerSecond: Math.round(messagesPerSecond),
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulMessages}/${allResponses.length} successful messages`);
    console.log(`   ✓ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   ✓ Messages/sec: ${Math.round(messagesPerSecond)}\n`);
  }

  async messagingWorker(conversationId, messageCount, workerId) {
    const results = [];

    for (let i = 0; i < messageCount; i++) {
      const startTime = Date.now();
      try {
        const response = await request(MESSAGING_SERVER_URL)
          .post('/api/messages')
          .set('Authorization', `Bearer ${this.authToken}`)
          .send({
            content: `Load test message ${i} from worker ${workerId} at ${new Date().toISOString()}`,
            conversation_id: conversationId
          });

        results.push({
          success: response.status === 201,
          responseTime: Date.now() - startTime,
          status: response.status
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return results;
  }

  async testWebSocketLoad(connections = 20, duration = 30000) {
    console.log(`🔌 Testing WebSocket Load: ${connections} concurrent connections for ${duration/1000}s`);

    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < connections; i++) {
      promises.push(this.webSocketWorker(i, duration));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Aggregate results
    const successfulConnections = results.filter(r => r.success).length;
    const totalMessages = results.reduce((sum, r) => sum + r.messagesReceived, 0);
    const avgLatency = results.reduce((sum, r) => sum + r.avgLatency, 0) / results.length;

    this.results.websockets = {
      totalConnections: results.length,
      successfulConnections,
      failedConnections: results.length - successfulConnections,
      totalMessages,
      avgLatency: Math.round(avgLatency),
      messagesPerSecond: Math.round((totalMessages / totalTime) * 1000),
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulConnections}/${results.length} successful connections`);
    console.log(`   ✓ Total Messages: ${totalMessages}`);
    console.log(`   ✓ Avg Latency: ${Math.round(avgLatency)}ms\n`);
  }

  async webSocketWorker(workerId, duration) {
    return new Promise((resolve) => {
      let messagesReceived = 0;
      let latencies = [];
      let connected = false;

      const socket = io(`${AUTH_SERVER_URL}/performance`, {
        transports: ['websocket']
      });

      socket.on('connect', () => {
        connected = true;
      });

      socket.on('system_metrics', (data) => {
        const latency = Date.now() - new Date(data.timestamp).getTime();
        latencies.push(latency);
        messagesReceived++;
      });

      // Request metrics periodically
      const metricsInterval = setInterval(() => {
        if (connected) {
          socket.emit('request_metrics');
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(metricsInterval);
        socket.disconnect();

        const avgLatency = latencies.length > 0
          ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
          : 0;

        resolve({
          success: connected && messagesReceived > 0,
          messagesReceived,
          avgLatency,
          workerId
        });
      }, duration);
    });
  }

  async testDatabaseLoad(concurrency = 10, queries = 200) {
    console.log(`🗄️ Testing Database Load: ${concurrency} concurrent, ${queries} total queries`);

    const startTime = Date.now();
    const promises = [];
    const queriesPerWorker = Math.floor(queries / concurrency);

    for (let worker = 0; worker < concurrency; worker++) {
      promises.push(this.databaseWorker(queriesPerWorker, worker));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Aggregate results
    const allResponses = results.flat();
    const successfulQueries = allResponses.filter(r => r.success).length;
    const avgQueryTime = allResponses.reduce((sum, r) => sum + r.queryTime, 0) / allResponses.length;
    const queriesPerSecond = (successfulQueries / totalTime) * 1000;

    this.results.database = {
      totalQueries: allResponses.length,
      successfulQueries,
      failedQueries: allResponses.length - successfulQueries,
      avgQueryTime: Math.round(avgQueryTime),
      queriesPerSecond: Math.round(queriesPerSecond),
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulQueries}/${allResponses.length} successful queries`);
    console.log(`   ✓ Avg Query Time: ${Math.round(avgQueryTime)}ms`);
    console.log(`   ✓ Queries/sec: ${Math.round(queriesPerSecond)}\n`);
  }

  async databaseWorker(queryCount, workerId) {
    const results = [];

    const endpoints = [
      '/api/auth/me',
      '/api/files',
      '/api/conversations'
    ];

    for (let i = 0; i < queryCount; i++) {
      const endpoint = endpoints[i % endpoints.length];
      const startTime = Date.now();

      try {
        const serverUrl = endpoint.includes('/conversations') ? MESSAGING_SERVER_URL : AUTH_SERVER_URL;
        const response = await request(serverUrl)
          .get(endpoint)
          .set('Authorization', `Bearer ${this.authToken}`);

        results.push({
          success: response.status === 200,
          queryTime: Date.now() - startTime,
          endpoint,
          status: response.status
        });
      } catch (error) {
        results.push({
          success: false,
          queryTime: Date.now() - startTime,
          endpoint,
          error: error.message
        });
      }
    }

    return results;
  }

  async testOrganizationsLoad(concurrency = 8, requests = 120) {
    console.log(`🏢 Testing Organizations API Load: ${concurrency} concurrent, ${requests} total requests`);

    const startTime = Date.now();
    const promises = [];
    const requestsPerWorker = Math.floor(requests / concurrency);

    for (let worker = 0; worker < concurrency; worker++) {
      promises.push(this.organizationsWorker(requestsPerWorker, worker));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const allResponses = results.flat();
    const successfulRequests = allResponses.filter(r => r.success).length;
    const avgResponseTime = allResponses.reduce((sum, r) => sum + r.responseTime, 0) / allResponses.length;
    const requestsPerSecond = (successfulRequests / totalTime) * 1000;

    this.results.organizations = {
      totalRequests: allResponses.length,
      successfulRequests,
      failedRequests: allResponses.length - successfulRequests,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond),
      totalTime
    };

    console.log(`   ✓ Completed: ${successfulRequests}/${allResponses.length} successful`);
    console.log(`   ✓ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   ✓ Requests/sec: ${Math.round(requestsPerSecond)}\n`);
  }

  async organizationsWorker(requests, workerId) {
    const results = [];

    for (let i = 0; i < requests; i++) {
      const startTime = Date.now();
      try {
        const response = await request(AUTH_SERVER_URL)
          .get('/api/organizations')
          .set('Authorization', `Bearer ${this.authToken}`);

        results.push({
          success: response.status === 200,
          responseTime: Date.now() - startTime,
          status: response.status
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return results;
  }

  async testProductionScaling(stages = 3) {
    console.log(`🚀 Testing Production Scaling: ${stages} stages with increasing load`);

    const scalingResults = [];
    const baseConcurrency = 5;
    const baseRequests = 50;

    for (let stage = 1; stage <= stages; stage++) {
      const concurrency = baseConcurrency * stage;
      const requests = baseRequests * stage;

      console.log(`   Stage ${stage}: ${concurrency} concurrent, ${requests} requests`);

      const stageStart = Date.now();
      const promises = [];
      const requestsPerWorker = Math.floor(requests / concurrency);

      for (let worker = 0; worker < concurrency; worker++) {
        promises.push(this.scalingWorker(requestsPerWorker, worker, stage));
      }

      const results = await Promise.all(promises);
      const stageTime = Date.now() - stageStart;

      const allResponses = results.flat();
      const successfulRequests = allResponses.filter(r => r.success).length;
      const avgResponseTime = allResponses.reduce((sum, r) => sum + r.responseTime, 0) / allResponses.length;
      const requestsPerSecond = (successfulRequests / stageTime) * 1000;

      scalingResults.push({
        stage,
        concurrency,
        totalRequests: allResponses.length,
        successfulRequests,
        avgResponseTime: Math.round(avgResponseTime),
        requestsPerSecond: Math.round(requestsPerSecond),
        stageTime
      });

      console.log(`     ✓ Stage ${stage}: ${successfulRequests}/${allResponses.length} successful, ${Math.round(avgResponseTime)}ms avg, ${Math.round(requestsPerSecond)} req/sec`);
    }

    this.results.scaling = scalingResults;
    console.log(`   ✓ Scaling test complete: ${stages} stages\n`);
  }

  async scalingWorker(requests, workerId, stage) {
    const results = [];

    const endpoints = [
      '/api/auth/me',
      '/api/organizations',
      '/api/conversations'
    ];

    for (let i = 0; i < requests; i++) {
      const endpoint = endpoints[i % endpoints.length];
      const startTime = Date.now();

      try {
        const serverUrl = endpoint.includes('/conversations') ? MESSAGING_SERVER_URL : AUTH_SERVER_URL;
        const response = await request(serverUrl)
          .get(endpoint)
          .set('Authorization', `Bearer ${this.authToken}`);

        results.push({
          success: response.status === 200,
          responseTime: Date.now() - startTime,
          endpoint,
          status: response.status,
          stage
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: Date.now() - startTime,
          endpoint,
          error: error.message,
          stage
        });
      }
    }

    return results;
  }

  async testMemoryLeak(duration = 60000, samplingInterval = 5000) {
    console.log(`🧠 Testing Memory Leak Detection: ${duration/1000}s duration, ${samplingInterval/1000}s sampling`);

    const memoryResults = [];
    const startTime = Date.now();
    let sampleCount = 0;

    const memoryTest = setInterval(async () => {
      try {
        const response = await request(AUTH_SERVER_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${this.authToken}`);

        if (response.body && response.body.memory) {
          memoryResults.push({
            timestamp: Date.now(),
            memory: response.body.memory,
            sampleNumber: ++sampleCount
          });
        }
      } catch (error) {
        console.log(`     Memory sample failed: ${error.message}`);
      }
    }, samplingInterval);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(memoryTest);

    const totalTime = Date.now() - startTime;
    const memoryGrowth = memoryResults.length > 1
      ? memoryResults[memoryResults.length - 1].memory - memoryResults[0].memory
      : 0;

    this.results.memory = {
      duration: totalTime,
      samples: memoryResults.length,
      memoryGrowth,
      avgMemory: memoryResults.length > 0
        ? Math.round(memoryResults.reduce((sum, r) => sum + r.memory, 0) / memoryResults.length)
        : 0,
      samples: memoryResults
    };

    console.log(`   ✓ Memory test complete: ${memoryResults.length} samples, ${memoryGrowth} bytes growth`);
    console.log(`   ✓ Avg Memory: ${this.results.memory.avgMemory} bytes\n`);
  }

  async testProductionEndpoints() {
    console.log(`🎯 Testing Production Endpoints: Critical path validation`);

    const endpoints = [
      { path: '/health', method: 'GET', server: AUTH_SERVER_URL, auth: false },
      { path: '/api/auth/me', method: 'GET', server: AUTH_SERVER_URL, auth: true },
      { path: '/api/organizations', method: 'GET', server: AUTH_SERVER_URL, auth: true },
      { path: '/api/conversations', method: 'GET', server: MESSAGING_SERVER_URL, auth: true },
      { path: '/api/files', method: 'GET', server: AUTH_SERVER_URL, auth: true }
    ];

    const endpointResults = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();

      try {
        let req = request(endpoint.server)[endpoint.method.toLowerCase()](endpoint.path);

        if (endpoint.auth) {
          req = req.set('Authorization', `Bearer ${this.authToken}`);
        }

        const response = await req;
        const responseTime = Date.now() - startTime;

        endpointResults.push({
          path: endpoint.path,
          method: endpoint.method,
          success: response.status >= 200 && response.status < 300,
          status: response.status,
          responseTime,
          server: endpoint.server
        });

        console.log(`   ✓ ${endpoint.method} ${endpoint.path}: ${response.status} (${responseTime}ms)`);
      } catch (error) {
        const responseTime = Date.now() - startTime;

        endpointResults.push({
          path: endpoint.path,
          method: endpoint.method,
          success: false,
          status: 0,
          responseTime,
          error: error.message,
          server: endpoint.server
        });

        console.log(`   ❌ ${endpoint.method} ${endpoint.path}: ERROR (${responseTime}ms) - ${error.message}`);
      }
    }

    const successfulEndpoints = endpointResults.filter(r => r.success).length;
    const avgResponseTime = endpointResults.reduce((sum, r) => sum + r.responseTime, 0) / endpointResults.length;

    this.results.production = {
      totalEndpoints: endpointResults.length,
      successfulEndpoints,
      failedEndpoints: endpointResults.length - successfulEndpoints,
      avgResponseTime: Math.round(avgResponseTime),
      endpoints: endpointResults
    };

    console.log(`   ✓ Production endpoints: ${successfulEndpoints}/${endpointResults.length} successful`);
    console.log(`   ✓ Avg Response Time: ${Math.round(avgResponseTime)}ms\n`);
  }

  printSummary() {
    console.log('📊 LOAD TEST SUMMARY');
    console.log('==========================================\n');

    if (this.results.auth) {
      console.log('🔐 Authentication:');
      console.log(`   Requests: ${this.results.auth.successfulRequests}/${this.results.auth.totalRequests}`);
      console.log(`   Avg Response Time: ${this.results.auth.avgResponseTime}ms`);
      console.log(`   Throughput: ${this.results.auth.requestsPerSecond} req/sec\n`);
    }

    if (this.results.files) {
      console.log('📁 File Uploads:');
      console.log(`   Uploads: ${this.results.files.successfulUploads}/${this.results.files.totalUploads}`);
      console.log(`   Avg Upload Time: ${this.results.files.avgUploadTime}ms`);
      console.log(`   Throughput: ${this.results.files.uploadsPerSecond} uploads/sec\n`);
    }

    if (this.results.messaging) {
      console.log('💬 Messaging:');
      console.log(`   Messages: ${this.results.messaging.successfulMessages}/${this.results.messaging.totalMessages}`);
      console.log(`   Avg Response Time: ${this.results.messaging.avgResponseTime}ms`);
      console.log(`   Throughput: ${this.results.messaging.messagesPerSecond} msg/sec\n`);
    }

    if (this.results.websockets) {
      console.log('🔌 WebSockets:');
      console.log(`   Connections: ${this.results.websockets.successfulConnections}/${this.results.websockets.totalConnections}`);
      console.log(`   Messages: ${this.results.websockets.totalMessages}`);
      console.log(`   Avg Latency: ${this.results.websockets.avgLatency}ms\n`);
    }

    if (this.results.database) {
      console.log('🗄️ Database:');
      console.log(`   Queries: ${this.results.database.successfulQueries}/${this.results.database.totalQueries}`);
      console.log(`   Avg Query Time: ${this.results.database.avgQueryTime}ms`);
      console.log(`   Throughput: ${this.results.database.queriesPerSecond} queries/sec\n`);
    }

    if (this.results.organizations) {
      console.log('🏢 Organizations API:');
      console.log(`   Requests: ${this.results.organizations.successfulRequests}/${this.results.organizations.totalRequests}`);
      console.log(`   Avg Response Time: ${this.results.organizations.avgResponseTime}ms`);
      console.log(`   Throughput: ${this.results.organizations.requestsPerSecond} req/sec\n`);
    }

    if (this.results.scaling && this.results.scaling.length > 0) {
      console.log('🚀 Production Scaling:');
      this.results.scaling.forEach(stage => {
        console.log(`   Stage ${stage.stage}: ${stage.successfulRequests}/${stage.totalRequests} (${stage.avgResponseTime}ms, ${stage.requestsPerSecond} req/sec)`);
      });
      console.log('');
    }

    if (this.results.memory) {
      console.log('🧠 Memory Analysis:');
      console.log(`   Duration: ${Math.round(this.results.memory.duration/1000)}s`);
      console.log(`   Samples: ${this.results.memory.samples}`);
      console.log(`   Memory Growth: ${this.results.memory.memoryGrowth} bytes`);
      console.log(`   Avg Memory: ${this.results.memory.avgMemory} bytes\n`);
    }

    if (this.results.production) {
      console.log('🎯 Production Endpoints:');
      console.log(`   Endpoints: ${this.results.production.successfulEndpoints}/${this.results.production.totalEndpoints} successful`);
      console.log(`   Avg Response Time: ${this.results.production.avgResponseTime}ms\n`);
    }
  }

  async saveResults() {
    const resultsPath = path.join(__dirname, 'load-test-results.json');
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now(),
      results: this.results
    };

    fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}\n`);
  }
}

// Run load tests if this file is executed directly
if (require.main === module) {
  async function runLoadTests() {
    const tester = new LoadTester();

    try {
      await tester.setup();

      console.log('🚀 Starting FluxStudio Sprint 10 Production Load Testing...\n');

      // Core system tests
      await tester.testProductionEndpoints();
      await tester.testAuthenticationLoad(10, 100);
      await tester.testOrganizationsLoad(8, 120);
      await tester.testFileUploadLoad(3, 15);
      await tester.testMessagingLoad(5, 50);
      await tester.testDatabaseLoad(8, 160);

      // Advanced production tests
      await tester.testWebSocketLoad(10, 15000);
      await tester.testProductionScaling(3);
      await tester.testMemoryLeak(30000, 3000); // 30s test with 3s sampling

      tester.printSummary();
      await tester.saveResults();

      console.log('✅ Sprint 10 Production Load Testing Complete!');
      console.log('📄 Detailed results saved to load-test-results.json');
      process.exit(0);

    } catch (error) {
      console.error('❌ Load testing failed:', error.message);
      process.exit(1);
    }
  }

  runLoadTests();
}

module.exports = LoadTester;