import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import ws from 'k6/ws';

// Custom metrics
const errorRate = new Rate('errors');
const wsConnections = new Counter('ws_connections');
const messagesReceived = new Counter('messages_received');
const messagesSent = new Counter('messages_sent');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 30 },   // Ramp up to 30 concurrent connections
    { duration: '3m', target: 30 },   // Stay at 30 connections
    { duration: '1m', target: 60 },   // Ramp up to 60 connections
    { duration: '3m', target: 60 },   // Stay at 60 connections
    { duration: '1m', target: 100 },  // Spike to 100 connections
    { duration: '2m', target: 100 },  // Hold spike
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    'ws_session_duration': ['p(95)<60000'], // WebSocket sessions should last
    'ws_connecting': ['p(95)<500'],         // Connection establishment < 500ms
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://fluxstudio.art';
const WS_URL = 'wss://fluxstudio.art';

// Generate random test data
function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a test user and get auth token
function getAuthToken() {
  const payload = JSON.stringify({
    email: `test_ws_${randomString(8)}@example.com`,
    password: 'TestPassword123!',
    name: `WS Test User`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/signup`, payload, params);

  if (res.status === 201) {
    const body = JSON.parse(res.body);
    return body.token;
  }

  return null;
}

// Test WebSocket connection and messaging
function testWebSocketMessaging(token, duration = 30) {
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${token}`;

  const response = ws.connect(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }, function (socket) {
    wsConnections.add(1);

    socket.on('open', () => {
      console.log('WebSocket connected');

      // Send initial handshake
      socket.send('40');

      // Send a ping every 5 seconds
      socket.setInterval(() => {
        socket.send('2');
      }, 5000);
    });

    socket.on('message', (data) => {
      messagesReceived.add(1);

      // Handle different Socket.IO message types
      if (data.startsWith('0')) {
        // Connection successful
        console.log('Socket.IO connected');
      } else if (data.startsWith('40')) {
        // Namespace connected
        console.log('Namespace connected');

        // Send join room message
        const joinMessage = JSON.stringify({
          type: 'join',
          room: `project_${randomString(8)}`,
          userId: randomString(10),
        });
        socket.send(`42${joinMessage}`);
        messagesSent.add(1);
      } else if (data.startsWith('42')) {
        // Regular message
        try {
          const message = JSON.parse(data.substring(2));
          console.log('Received message:', message);
        } catch (e) {
          // Not JSON, that's okay
        }
      } else if (data === '3') {
        // Pong received
        console.log('Pong received');
      }
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e.error());
      errorRate.add(1);
    });

    // Simulate real-time collaboration events
    let messageCount = 0;
    const messageInterval = socket.setInterval(() => {
      if (messageCount >= 10) {
        socket.close();
        return;
      }

      // Send different types of messages
      const messageTypes = [
        {
          type: 'cursor_move',
          x: Math.floor(Math.random() * 1920),
          y: Math.floor(Math.random() * 1080),
          userId: randomString(10),
        },
        {
          type: 'element_update',
          elementId: randomString(12),
          changes: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: Math.random() * 200 + 50,
            height: Math.random() * 200 + 50,
          },
        },
        {
          type: 'text_edit',
          elementId: randomString(12),
          content: `Text ${randomString(20)}`,
        },
        {
          type: 'chat_message',
          message: `Test message ${randomString(15)}`,
          userId: randomString(10),
        },
      ];

      const message = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      socket.send(`42${JSON.stringify(message)}`);
      messagesSent.add(1);
      messageCount++;
    }, 3000);

    // Keep connection alive for specified duration
    socket.setTimeout(() => {
      console.log('Closing WebSocket connection');
      socket.close();
    }, duration * 1000);
  });

  check(response, {
    'WebSocket connected': (r) => r && r.status === 101,
  });
}

// Test messaging REST API
function testMessagingAPI(token) {
  const channelId = `channel_${randomString(10)}`;

  // Create a channel
  const createChannelPayload = JSON.stringify({
    name: `Test Channel ${randomString(8)}`,
    type: 'project',
    members: ['user1', 'user2'],
  });

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const createRes = http.post(`${BASE_URL}/api/messaging/channels`, createChannelPayload, params);

  const createSuccess = check(createRes, {
    'create channel status is 201': (r) => r.status === 201,
    'create channel duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!createSuccess);

  if (createSuccess && createRes.body) {
    const channel = JSON.parse(createRes.body);
    const actualChannelId = channel.channelId || channelId;

    sleep(0.5);

    // Send a message to the channel
    const messagePayload = JSON.stringify({
      content: `Load test message ${randomString(20)}`,
      type: 'text',
    });

    const sendRes = http.post(
      `${BASE_URL}/api/messaging/channels/${actualChannelId}/messages`,
      messagePayload,
      params
    );

    const sendSuccess = check(sendRes, {
      'send message status is 201': (r) => r.status === 201,
      'send message duration < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!sendSuccess);

    sleep(0.5);

    // Get channel messages
    const getRes = http.get(
      `${BASE_URL}/api/messaging/channels/${actualChannelId}/messages?limit=20`,
      params
    );

    const getSuccess = check(getRes, {
      'get messages status is 200': (r) => r.status === 200,
      'get messages returns array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).messages);
        } catch (e) {
          return false;
        }
      },
      'get messages duration < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!getSuccess);

    sleep(0.5);

    // Mark messages as read
    const readPayload = JSON.stringify({
      messageIds: ['msg1', 'msg2', 'msg3'],
    });

    const readRes = http.post(
      `${BASE_URL}/api/messaging/channels/${actualChannelId}/read`,
      readPayload,
      params
    );

    const readSuccess = check(readRes, {
      'mark read status is 200': (r) => r.status === 200,
      'mark read duration < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!readSuccess);
  }
}

// Test presence API
function testPresenceAPI(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Update user presence
  const presencePayload = JSON.stringify({
    status: 'online',
    activity: 'Working on design',
  });

  const updateRes = http.post(`${BASE_URL}/api/messaging/presence`, presencePayload, params);

  const updateSuccess = check(updateRes, {
    'update presence status is 200': (r) => r.status === 200,
    'update presence duration < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!updateSuccess);

  sleep(1);

  // Get team presence
  const getRes = http.get(`${BASE_URL}/api/messaging/presence/team`, params);

  const getSuccess = check(getRes, {
    'get presence status is 200': (r) => r.status === 200,
    'get presence returns data': (r) => {
      try {
        return JSON.parse(r.body).users !== undefined;
      } catch (e) {
        return false;
      }
    },
    'get presence duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!getSuccess);
}

// Main test scenario
export default function () {
  // Get auth token
  const token = getAuthToken();
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }

  // Scenario 1: Long-lived WebSocket connection (50% of users)
  if (Math.random() < 0.5) {
    testWebSocketMessaging(token, 30);
    sleep(2);
  }

  // Scenario 2: REST API messaging only (30% of users)
  else if (Math.random() < 0.8) {
    testMessagingAPI(token);
    sleep(1);
    testPresenceAPI(token);
    sleep(2);
  }

  // Scenario 3: Mixed - WebSocket + REST API (20% of users)
  else {
    // Start WebSocket in background
    testWebSocketMessaging(token, 20);

    // Use REST API while WebSocket is active
    sleep(2);
    testMessagingAPI(token);
    sleep(2);
    testPresenceAPI(token);
    sleep(3);
  }

  sleep(1);
}

// Handle setup
export function setup() {
  console.log('Starting real-time features load test...');
  console.log(`HTTP Target: ${BASE_URL}`);
  console.log(`WebSocket Target: ${WS_URL}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    throw new Error('Service is not healthy');
  }

  console.log('Health check passed. Beginning real-time load test...');
}

// Handle teardown
export function teardown(data) {
  console.log('Real-time features load test completed.');
  console.log('Check metrics for WebSocket connections and message throughput.');
}
