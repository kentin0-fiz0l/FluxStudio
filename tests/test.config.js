/**
 * Test Configuration for FluxStudio Sprint 9
 * Centralized configuration for all test suites
 */

module.exports = {
  // Server endpoints
  servers: {
    auth: {
      url: 'http://localhost:3001',
      healthEndpoint: '/health',
      websocket: 'ws://localhost:3001'
    },
    messaging: {
      url: 'http://localhost:3004',
      healthEndpoint: '/health',
      websocket: 'ws://localhost:3004'
    }
  },

  // Test timeouts (milliseconds)
  timeouts: {
    unit: 5000,
    integration: 30000,
    load: 60000,
    websocket: 10000
  },

  // Load test parameters
  load: {
    auth: {
      concurrency: 10,
      requests: 100
    },
    files: {
      concurrency: 5,
      files: 20
    },
    messaging: {
      concurrency: 8,
      messages: 100
    },
    websockets: {
      connections: 20,
      duration: 30000
    },
    database: {
      concurrency: 10,
      queries: 200
    }
  },

  // Performance thresholds
  performance: {
    api: {
      maxResponseTime: 500,
      minThroughput: 50
    },
    fileUpload: {
      maxUploadTime: 5000,
      minThroughput: 2
    },
    messaging: {
      maxResponseTime: 300,
      minThroughput: 100
    },
    websocket: {
      maxLatency: 100,
      minConnectionRate: 0.95
    },
    database: {
      maxQueryTime: 100,
      minThroughput: 200
    }
  },

  // Security test parameters
  security: {
    rateLimiting: {
      requests: 10,
      windowMs: 15000
    },
    fileUpload: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['txt', 'jpg', 'png', 'pdf', 'doc'],
      blockedTypes: ['exe', 'bat', 'sh', 'js']
    },
    authentication: {
      passwordMinLength: 8,
      tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Test data
  testData: {
    users: {
      valid: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      },
      invalid: {
        weakPassword: 'test',
        invalidEmail: 'invalid-email',
        longName: 'a'.repeat(256)
      }
    },
    conversations: {
      valid: {
        name: 'Test Conversation',
        description: 'Test conversation for integration testing',
        type: 'group'
      }
    },
    messages: {
      valid: {
        content: 'This is a test message',
        type: 'text'
      },
      large: {
        content: 'x'.repeat(10000), // 10KB message
        type: 'text'
      }
    },
    files: {
      text: {
        name: 'test.txt',
        content: 'This is a test file for upload testing.\nCreated at: {{timestamp}}',
        mimeType: 'text/plain'
      },
      image: {
        name: 'test.jpg',
        size: 1024 * 100, // 100KB
        mimeType: 'image/jpeg'
      },
      large: {
        name: 'large-file.txt',
        size: 1024 * 1024 * 10, // 10MB
        mimeType: 'text/plain'
      }
    }
  },

  // Environment-specific overrides
  environments: {
    development: {
      timeouts: {
        integration: 60000
      },
      load: {
        auth: { concurrency: 5, requests: 50 },
        files: { concurrency: 3, files: 10 }
      }
    },
    production: {
      timeouts: {
        integration: 30000
      },
      performance: {
        api: { maxResponseTime: 200 },
        database: { maxQueryTime: 50 }
      }
    }
  },

  // Test utilities
  utils: {
    generateTestUser: (suffix = '') => ({
      name: `Test User ${suffix}`,
      email: `test-${Date.now()}${suffix}@example.com`,
      password: 'TestPassword123!'
    }),

    generateTestFile: (name, size = 1024) => ({
      name: name || `test-${Date.now()}.txt`,
      content: 'x'.repeat(size),
      timestamp: new Date().toISOString()
    }),

    waitForWebSocket: (socket, event, timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for ${event}`));
        }, timeout);

        socket.once(event, (data) => {
          clearTimeout(timer);
          resolve(data);
        });
      });
    },

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    retry: async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
};