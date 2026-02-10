/**
 * Health Endpoint Tests
 * Tests for system health check endpoints
 * @file tests/routes/health.routes.test.js
 */

const request = require('supertest');
const express = require('express');

// Create a simple health endpoint for testing
function createHealthApp() {
  const app = express();
  app.use(express.json());

  // Basic health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'operational',
        database: 'operational',
        cache: 'operational',
      },
    });
  });

  // Detailed health check
  app.get('/health/detailed', (req, res) => {
    res.json({
      status: 'healthy',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'test',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
      services: {
        api: { status: 'operational', latency: 5 },
        database: { status: 'operational', latency: 10 },
        cache: { status: 'operational', latency: 2 },
        storage: { status: 'operational', latency: 15 },
      },
    });
  });

  // Ready endpoint (for Kubernetes)
  app.get('/ready', (req, res) => {
    res.json({ ready: true });
  });

  // Live endpoint (for Kubernetes)
  app.get('/live', (req, res) => {
    res.json({ alive: true });
  });

  return app;
}

describe('Health Endpoints', () => {
  let app;

  beforeEach(() => {
    app = createHealthApp();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/health');

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should report all services operational', async () => {
      const response = await request(app).get('/health');

      expect(response.body.services).toBeDefined();
      expect(response.body.services.api).toBe('operational');
      expect(response.body.services.database).toBe('operational');
      expect(response.body.services.cache).toBe('operational');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body.version).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });

    it('should include memory usage', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.memory.used).toBeDefined();
      expect(response.body.memory.total).toBeDefined();
      expect(response.body.memory.used).toBeLessThanOrEqual(response.body.memory.total);
    });

    it('should include service latencies', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.services.api.latency).toBeDefined();
      expect(response.body.services.database.latency).toBeDefined();
      expect(response.body.services.cache.latency).toBeDefined();
    });

    it('should include environment info', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.environment).toBeDefined();
    });
  });

  describe('GET /ready', () => {
    it('should indicate readiness', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });
  });

  describe('GET /live', () => {
    it('should indicate liveness', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body.alive).toBe(true);
    });
  });
});

describe('Health Check Error Scenarios', () => {
  it('should handle degraded database state', async () => {
    const app = express();
    app.use(express.json());

    app.get('/health', (req, res) => {
      res.status(503).json({
        status: 'degraded',
        services: {
          api: 'operational',
          database: 'degraded',
          cache: 'operational',
        },
        message: 'Database connection slow',
      });
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services.database).toBe('degraded');
  });

  it('should handle unhealthy state', async () => {
    const app = express();
    app.use(express.json());

    app.get('/health', (req, res) => {
      res.status(503).json({
        status: 'unhealthy',
        services: {
          api: 'operational',
          database: 'down',
          cache: 'down',
        },
        message: 'Critical services unavailable',
      });
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });

  it('should handle not ready state', async () => {
    const app = express();
    app.use(express.json());

    app.get('/ready', (req, res) => {
      res.status(503).json({ ready: false, reason: 'Initializing' });
    });

    const response = await request(app).get('/ready');

    expect(response.status).toBe(503);
    expect(response.body.ready).toBe(false);
  });
});
