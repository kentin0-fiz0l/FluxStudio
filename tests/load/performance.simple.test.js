/**
 * Simplified Load Testing Suite for FluxStudio Sprint 10
 * Tests basic endpoints without requiring database setup
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

const AUTH_SERVER_URL = 'http://localhost:3001';
const MESSAGING_SERVER_URL = 'http://localhost:3004';

class SimpleLoadTester {
  constructor() {
    this.results = {
      endpoints: [],
      health: [],
      performance: []
    };
  }

  async testBasicEndpoints() {
    console.log('🎯 Testing Basic Production Endpoints...\n');

    const endpoints = [
      { url: `${AUTH_SERVER_URL}/health`, method: 'GET', name: 'Auth Health' },
      { url: `${MESSAGING_SERVER_URL}/health`, method: 'GET', name: 'Messaging Health' },
      { url: `${AUTH_SERVER_URL}/api/files`, method: 'GET', name: 'Files Endpoint' },
      { url: `${MESSAGING_SERVER_URL}/api/conversations`, method: 'GET', name: 'Conversations Endpoint' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`   Testing: ${endpoint.name}`);

      const testResults = await this.testEndpoint(endpoint);
      results.push({
        ...endpoint,
        ...testResults
      });

      const status = testResults.success ? '✅' : '❌';
      console.log(`   ${status} ${endpoint.name}: ${testResults.status} (${testResults.responseTime}ms)`);
    }

    this.results.endpoints = results;
    console.log('');
  }

  async testEndpoint(endpoint) {
    const startTime = Date.now();

    try {
      const response = await request(endpoint.url.replace(/\/[^/]*$/, ''))
        [endpoint.method.toLowerCase()](endpoint.url.split('/').slice(-1)[0] || '');

      return {
        success: response.status < 500,
        status: response.status,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testConcurrentLoad(concurrency = 5, duration = 10000) {
    console.log(`🚀 Testing Concurrent Load: ${concurrency} concurrent requests for ${duration/1000}s\n`);

    const results = [];
    const startTime = Date.now();
    const endTime = startTime + duration;

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.loadWorker(i, endTime));
    }

    const workerResults = await Promise.all(workers);

    // Aggregate results
    workerResults.forEach(workerResult => {
      results.push(...workerResult);
    });

    const successfulRequests = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const totalTime = Date.now() - startTime;
    const requestsPerSecond = (results.length / totalTime) * 1000;

    this.results.performance = {
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      duration: totalTime,
      concurrency
    };

    console.log(`   ✓ Completed: ${successfulRequests}/${results.length} successful requests`);
    console.log(`   ✓ Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   ✓ Throughput: ${Math.round(requestsPerSecond * 100) / 100} req/sec`);
    console.log(`   ✓ Duration: ${Math.round(totalTime/1000)}s\n`);
  }

  async loadWorker(workerId, endTime) {
    const results = [];
    const endpoints = [
      `${AUTH_SERVER_URL}/health`,
      `${MESSAGING_SERVER_URL}/health`
    ];

    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const startTime = Date.now();

      try {
        const response = await request(endpoint.split('://')[1].split('/')[0])
          .get('/' + endpoint.split('/').slice(3).join('/'));

        results.push({
          workerId,
          endpoint,
          success: response.status < 500,
          status: response.status,
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          workerId,
          endpoint,
          success: false,
          status: 0,
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async testMemoryAndCPU() {
    console.log('🧠 Testing Memory and CPU Usage...\n');

    const samples = [];
    const sampleCount = 10;
    const interval = 1000; // 1 second

    for (let i = 0; i < sampleCount; i++) {
      const memory = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      samples.push({
        timestamp: Date.now(),
        memory: {
          heapUsed: memory.heapUsed,
          heapTotal: memory.heapTotal,
          external: memory.external,
          rss: memory.rss
        },
        cpu: cpuUsage
      });

      if (i < sampleCount - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    const avgHeapUsed = samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / samples.length;
    const avgRSS = samples.reduce((sum, s) => sum + s.memory.rss, 0) / samples.length;

    this.results.health = {
      samples: samples.length,
      avgHeapUsed: Math.round(avgHeapUsed),
      avgRSS: Math.round(avgRSS),
      heapUtilization: Math.round((avgHeapUsed / samples[0].memory.heapTotal) * 100),
      samples
    };

    console.log(`   ✓ Memory samples: ${samples.length}`);
    console.log(`   ✓ Avg Heap Used: ${Math.round(avgHeapUsed / 1024 / 1024)}MB`);
    console.log(`   ✓ Avg RSS: ${Math.round(avgRSS / 1024 / 1024)}MB`);
    console.log(`   ✓ Heap Utilization: ${Math.round((avgHeapUsed / samples[0].memory.heapTotal) * 100)}%\n`);
  }

  printSummary() {
    console.log('📊 SIMPLIFIED LOAD TEST SUMMARY');
    console.log('==========================================\n');

    if (this.results.endpoints.length > 0) {
      console.log('🎯 Endpoint Tests:');
      const successful = this.results.endpoints.filter(e => e.success).length;
      console.log(`   Tests: ${successful}/${this.results.endpoints.length} successful`);

      this.results.endpoints.forEach(endpoint => {
        const status = endpoint.success ? '✅' : '❌';
        console.log(`   ${status} ${endpoint.name}: ${endpoint.status} (${endpoint.responseTime}ms)`);
      });
      console.log('');
    }

    if (this.results.performance) {
      console.log('🚀 Performance Test:');
      console.log(`   Requests: ${this.results.performance.successfulRequests}/${this.results.performance.totalRequests}`);
      console.log(`   Avg Response Time: ${this.results.performance.avgResponseTime}ms`);
      console.log(`   Throughput: ${this.results.performance.requestsPerSecond} req/sec`);
      console.log(`   Concurrency: ${this.results.performance.concurrency}\n`);
    }

    if (this.results.health) {
      console.log('🧠 System Health:');
      console.log(`   Avg Heap Used: ${Math.round(this.results.health.avgHeapUsed / 1024 / 1024)}MB`);
      console.log(`   Avg RSS: ${Math.round(this.results.health.avgRSS / 1024 / 1024)}MB`);
      console.log(`   Heap Utilization: ${this.results.health.heapUtilization}%\n`);
    }
  }

  async saveResults() {
    const resultsPath = path.join(__dirname, 'simple-load-test-results.json');
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now(),
      results: this.results,
      summary: {
        endpointsWorking: this.results.endpoints.filter(e => e.success).length,
        totalEndpoints: this.results.endpoints.length,
        performanceScore: this.results.performance ? Math.round(1000 / this.results.performance.avgResponseTime * 100) / 100 : 0
      }
    };

    fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}\n`);
  }
}

// Run simple load tests if this file is executed directly
if (require.main === module) {
  async function runSimpleLoadTests() {
    const tester = new SimpleLoadTester();

    try {
      console.log('🚀 Starting FluxStudio Sprint 10 Simple Load Testing...\n');

      // Run basic tests
      await tester.testBasicEndpoints();
      await tester.testConcurrentLoad(3, 5000); // 3 concurrent for 5 seconds
      await tester.testMemoryAndCPU();

      tester.printSummary();
      await tester.saveResults();

      console.log('✅ Simple Load Testing Complete!');
      process.exit(0);

    } catch (error) {
      console.error('❌ Simple load testing failed:', error.message);
      process.exit(1);
    }
  }

  runSimpleLoadTests();
}

module.exports = SimpleLoadTester;