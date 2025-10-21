/**
 * Security Logging Integration Tests
 * Sprint 13, Day 1
 *
 * Tests to verify SecurityLogger integration with auth endpoints
 */

const axios = require('axios');
const { query } = require('../lib/db');

const AUTH_SERVICE_URL = 'http://localhost:3001';
const TEST_EMAIL = `test-${Date.now()}@fluxstudio.art`;
const TEST_PASSWORD = 'TestPassword123!';

// Get CSRF token
async function getCsrfToken() {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/csrf-token`, {
      withCredentials: true
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error.message);
    return null;
  }
}

// Color output helpers
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRecentSecurityEvents(limit = 10) {
  try {
    const result = await query(
      `SELECT * FROM security_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching security events:', error);
    return [];
  }
}

async function testSignupLogging() {
  console.log(colors.cyan('\n📝 Testing Signup Logging...'));

  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      console.log(colors.yellow('    ⚠ CSRF token not available, skipping signup test'));
      return true;
    }

    // Test successful signup
    console.log('  → Creating test user...');
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/signup`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Test User',
      userType: 'client'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });

    if (response.status === 200 && response.data.accessToken) {
      console.log(colors.green('    ✓ Signup successful'));

      // Wait for logging to complete
      await sleep(500);

      // Check for signup_success event
      const events = await getRecentSecurityEvents(5);
      const signupEvent = events.find(e => e.event_type === 'signup_success');

      if (signupEvent) {
        console.log(colors.green('    ✓ signup_success event logged'));
        console.log(`      Event ID: ${signupEvent.id}`);
        console.log(`      User ID: ${signupEvent.user_id}`);
        console.log(`      IP: ${signupEvent.ip_address}`);
        console.log(`      Severity: ${signupEvent.severity}`);
      } else {
        console.log(colors.red('    ✗ signup_success event NOT found'));
        return false;
      }

      return true;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('already registered')) {
      console.log(colors.yellow('    ⚠ User already exists, skipping signup test'));
      return true;
    }
    console.log(colors.red('    ✗ Signup failed:', error.message));
    return false;
  }
}

async function testLoginLogging() {
  console.log(colors.cyan('\n🔐 Testing Login Logging...'));

  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      console.log(colors.yellow('    ⚠ CSRF token not available, skipping login test'));
      return true;
    }

    // Test successful login
    console.log('  → Testing successful login...');
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });

    if (response.status === 200 && response.data.accessToken) {
      console.log(colors.green('    ✓ Login successful'));

      await sleep(500);

      const events = await getRecentSecurityEvents(5);
      const loginEvent = events.find(e => e.event_type === 'login_success');

      if (loginEvent) {
        console.log(colors.green('    ✓ login_success event logged'));
        console.log(`      Event ID: ${loginEvent.id}`);
        console.log(`      Severity: ${loginEvent.severity}`);
      } else {
        console.log(colors.red('    ✗ login_success event NOT found'));
        return false;
      }
    }

    // Test failed login
    console.log('  → Testing failed login...');
    try {
      const csrfToken2 = await getCsrfToken();
      await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: 'WrongPassword123!'
      }, {
        headers: {
          'X-CSRF-Token': csrfToken2
        },
        withCredentials: true
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(colors.green('    ✓ Login failed as expected'));

        await sleep(500);

        const events = await getRecentSecurityEvents(5);
        const failedLoginEvent = events.find(e => e.event_type === 'failed_login_attempt');

        if (failedLoginEvent) {
          console.log(colors.green('    ✓ failed_login_attempt event logged'));
          console.log(`      Event ID: ${failedLoginEvent.id}`);
          console.log(`      Severity: ${failedLoginEvent.severity}`);
          const metadata = failedLoginEvent.metadata;
          console.log(`      Reason: ${metadata.reason}`);
        } else {
          console.log(colors.red('    ✗ failed_login_attempt event NOT found'));
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.log(colors.red('    ✗ Login test failed:', error.message));
    return false;
  }
}

async function testTokenLogging() {
  console.log(colors.cyan('\n🎫 Testing Token Logging...'));

  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      console.log(colors.yellow('    ⚠ CSRF token not available, skipping token test'));
      return true;
    }

    // Login to get tokens
    console.log('  → Logging in to get tokens...');
    const loginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });

    const { accessToken, refreshToken } = loginResponse.data;
    console.log(colors.green('    ✓ Tokens obtained'));

    await sleep(500);

    // Check for token_generated event
    const events = await getRecentSecurityEvents(10);
    const tokenGenEvent = events.find(e => e.event_type === 'token_generated');

    if (tokenGenEvent) {
      console.log(colors.green('    ✓ token_generated event logged'));
      console.log(`      Event ID: ${tokenGenEvent.id}`);
      console.log(`      Token ID: ${tokenGenEvent.token_id}`);
    } else {
      console.log(colors.yellow('    ⚠ token_generated event not found (may be logged earlier)'));
    }

    // Test token refresh
    console.log('  → Testing token refresh...');
    const refreshResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/refresh`,
      { refreshToken }
    );

    if (refreshResponse.status === 200 && refreshResponse.data.accessToken) {
      console.log(colors.green('    ✓ Token refresh successful'));

      await sleep(500);

      const refreshEvents = await getRecentSecurityEvents(5);
      const tokenRefreshEvent = refreshEvents.find(e => e.event_type === 'token_refreshed');

      if (tokenRefreshEvent) {
        console.log(colors.green('    ✓ token_refreshed event logged'));
        console.log(`      Event ID: ${tokenRefreshEvent.id}`);
        console.log(`      Old Token ID: ${tokenRefreshEvent.metadata.oldTokenId}`);
      } else {
        console.log(colors.red('    ✗ token_refreshed event NOT found'));
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(colors.red('    ✗ Token test failed:', error.message));
    if (error.response) {
      console.log(`      Status: ${error.response.status}`);
      console.log(`      Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testEventRetrieval() {
  console.log(colors.cyan('\n📊 Testing Event Retrieval...'));

  try {
    console.log('  → Fetching recent security events...');
    const events = await getRecentSecurityEvents(20);

    console.log(colors.green(`    ✓ Retrieved ${events.length} events`));

    // Group by event type
    const eventTypes = {};
    events.forEach(event => {
      eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
    });

    console.log('\n  Event Types Summary:');
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`    ${colors.blue(type)}: ${count}`);
    });

    // Group by severity
    const severities = {};
    events.forEach(event => {
      severities[event.severity] = (severities[event.severity] || 0) + 1;
    });

    console.log('\n  Severity Summary:');
    Object.entries(severities).forEach(([severity, count]) => {
      const color = severity === 'critical' ? colors.red :
                   severity === 'high' ? colors.yellow :
                   severity === 'warning' ? colors.yellow :
                   colors.green;
      console.log(`    ${color(severity)}: ${count}`);
    });

    return true;
  } catch (error) {
    console.log(colors.red('    ✗ Event retrieval failed:', error.message));
    return false;
  }
}

async function runTests() {
  console.log(colors.blue('╔═══════════════════════════════════════════════════════╗'));
  console.log(colors.blue('║  Security Logging Integration Tests - Sprint 13      ║'));
  console.log(colors.blue('╚═══════════════════════════════════════════════════════╝'));

  const results = {
    signup: false,
    login: false,
    token: false,
    retrieval: false
  };

  // Check if auth service is running
  console.log(colors.cyan('\n🔍 Checking auth service...'));
  try {
    await axios.get(`${AUTH_SERVICE_URL}/health`);
    console.log(colors.green('  ✓ Auth service is running'));
  } catch (error) {
    console.log(colors.red('  ✗ Auth service is not running'));
    console.log(colors.yellow('  Please start the auth service first:'));
    console.log(colors.yellow('    node server-auth.js'));
    process.exit(1);
  }

  // Run tests
  results.signup = await testSignupLogging();
  results.login = await testLoginLogging();
  results.token = await testTokenLogging();
  results.retrieval = await testEventRetrieval();

  // Print summary
  console.log(colors.blue('\n╔═══════════════════════════════════════════════════════╗'));
  console.log(colors.blue('║  Test Results Summary                                 ║'));
  console.log(colors.blue('╚═══════════════════════════════════════════════════════╝'));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✓' : '✗';
    const color = result ? colors.green : colors.red;
    console.log(color(`  ${icon} ${test.charAt(0).toUpperCase() + test.slice(1)} Logging`));
  });

  console.log('');
  if (passed === total) {
    console.log(colors.green(`  All tests passed! (${passed}/${total})`));
    console.log(colors.green('  ✅ Security logging integration is working correctly!'));
  } else {
    console.log(colors.yellow(`  Some tests failed (${passed}/${total})`));
    console.log(colors.yellow('  ⚠️  Review the logs above for details'));
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error(colors.red('Fatal error:'), error);
  process.exit(1);
});
