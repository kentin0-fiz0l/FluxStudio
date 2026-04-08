/**
 * Payments Route Integration Tests
 *
 * Tests the payment endpoints with mocked Stripe SDK and database.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

// Mock lib/payments
jest.mock('../../lib/payments', () => {
  const mockStripe = {
    checkout: {
      sessions: { create: jest.fn() }
    },
    billingPortal: {
      sessions: { create: jest.fn() }
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  };

  const mockPaymentService = {
    stripe: mockStripe,
    handleWebhook: jest.fn(),
    createCustomer: jest.fn(),
    createProjectPaymentIntent: jest.fn()
  };

  return {
    paymentService: mockPaymentService,
    SERVICE_PRICING: {
      foundation: {
        'show-concept': 150000,
        'visual-identity': 120000
      },
      standard: {
        'storyboarding': 200000,
        'uniform-design': 350000
      },
      premium: {
        'drill-design': 600000
      }
    }
  };
});

// Mock lib/auth/tokenService for auth middleware
// Mock analytics/funnelTracker (used by start-trial)
jest.mock('../../lib/analytics/funnelTracker', () => ({
  ingestEvent: jest.fn().mockResolvedValue(undefined)
}));

// Mock email service (used by start-trial)
jest.mock('../../lib/email/emailService', () => ({
  emailService: {
    sendTrialStartedEmail: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn()
}));

const { query } = require('../../database/config');
const { paymentService, SERVICE_PRICING } = require('../../lib/payments');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

// Helper: build express app with payment routes
function createApp() {
  const app = express();
  app.use(express.json());
  const paymentRoutes = require('../../routes/payments');
  // Use a simple auth helper that skips the real middleware's trial expiry DB check.
  // This prevents the auth middleware from consuming mock query calls.
  paymentRoutes.setAuthHelper({
    authenticateToken: (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
      } catch {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
      }
    }
  });
  app.use('/api/payments', paymentRoutes);
  return app;
}

describe('Payments Integration Tests', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
  });

  beforeEach(() => {
    // Reset call history and mockResolvedValueOnce queues, but keep implementations
    query.mockReset();
    paymentService.handleWebhook.mockReset();
    paymentService.createCustomer.mockReset();
    paymentService.createProjectPaymentIntent.mockReset();
    paymentService.stripe.checkout.sessions.create.mockReset();
    paymentService.stripe.billingPortal.sessions.create.mockReset();
  });

  // =========================================================================
  // GET /api/payments/pricing
  // =========================================================================
  describe('GET /api/payments/pricing', () => {
    it('should return formatted pricing without authentication', async () => {
      const res = await request(app)
        .get('/api/payments/pricing')
        .expect(200);

      expect(res.body.pricing).toBeDefined();
      expect(res.body.pricing.foundation).toBeDefined();
      expect(res.body.pricing.foundation['show-concept']).toBeDefined();
      expect(res.body.pricing.foundation['show-concept'].amount).toBe(150000);
      expect(res.body.pricing.foundation['show-concept'].currency).toBe('usd');
      expect(res.body.pricing.foundation['show-concept'].formatted).toContain('$');
    });
  });

  // =========================================================================
  // GET /api/payments/subscription
  // =========================================================================
  describe('GET /api/payments/subscription', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/payments/subscription')
        .expect(401);
    });

    it('should return no subscription when none exists', async () => {
      // Query 1: trial check from users table
      query.mockResolvedValueOnce({ rows: [{ plan_id: 'free', trial_ends_at: null }] });
      // Query 2: subscription check
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(false);
      expect(res.body.subscription).toBeNull();
      expect(res.body.canTrial).toBe(true);
    });

    it('should return active subscription when one exists', async () => {
      // Query 1: trial check from users table
      query.mockResolvedValueOnce({ rows: [{ plan_id: 'pro', trial_ends_at: null }] });
      // Query 2: active subscription found
      query.mockResolvedValueOnce({
        rows: [{
          stripe_subscription_id: 'sub_abc123',
          stripe_customer_id: 'cus_xyz',
          status: 'active',
          current_period_end: '2025-12-31T00:00:00Z',
          cancelled_at: null
        }]
      });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(true);
      expect(res.body.subscription.id).toBe('sub_abc123');
      expect(res.body.subscription.status).toBe('active');
    });

    it('should return canTrial:false for user who used trial', async () => {
      // Query 1: trial check — user has expired trial_ends_at (trial was used)
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', trial_ends_at: '2025-06-01T00:00:00Z' }]
      });
      // Query 2: no active subscription
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(false);
      expect(res.body.subscription).toBeNull();
      expect(res.body.canTrial).toBe(false);
    });

    it('should return cancelled subscription details', async () => {
      // Query 1: trial check from users table
      query.mockResolvedValueOnce({ rows: [{ plan_id: 'pro', trial_ends_at: null }] });
      // Query 2: subscription with cancellation
      query.mockResolvedValueOnce({
        rows: [{
          stripe_subscription_id: 'sub_cancelled_456',
          stripe_customer_id: 'cus_xyz',
          status: 'active',
          current_period_end: '2025-12-31T00:00:00Z',
          cancelled_at: '2025-11-15T00:00:00Z'
        }]
      });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(true);
      expect(res.body.subscription.id).toBe('sub_cancelled_456');
      expect(res.body.subscription.cancelledAt).toBe('2025-11-15T00:00:00Z');
      expect(res.body.subscription.currentPeriodEnd).toBe('2025-12-31T00:00:00Z');
    });

    it('should handle database errors gracefully', async () => {
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get subscription status');
    });
  });

  // =========================================================================
  // POST /api/payments/create-checkout-session
  // =========================================================================
  describe('POST /api/payments/create-checkout-session', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/payments/create-checkout-session')
        .send({ priceId: 'price_123' })
        .expect(401);
    });

    it('should return 400 when priceId is missing', async () => {
      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when user not found in database', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_123' })
        .expect(404);

      expect(res.body.error).toBe('User not found');
    });

    it('should create checkout session for user with existing stripe customer', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_existing', email: 'test@example.com', name: 'Test' }]
      });

      paymentService.stripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_123' })
        .expect(200);

      expect(res.body.sessionId).toBe('cs_test_123');
      expect(res.body.url).toContain('checkout.stripe.com');
      expect(paymentService.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          line_items: [{ price: 'price_123', quantity: 1 }]
        })
      );
    });

    it('should create new Stripe customer if none exists', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null, email: 'test@example.com', name: 'Test User' }]
      });

      paymentService.createCustomer.mockResolvedValueOnce({ id: 'cus_new_123' });
      paymentService.stripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_123' })
        .expect(200);

      expect(paymentService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
      expect(res.body.sessionId).toBe('cs_test_456');
    });

    it('should handle Stripe errors', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_existing', email: 'test@example.com', name: 'Test' }]
      });

      paymentService.stripe.checkout.sessions.create.mockRejectedValueOnce(
        new Error('Stripe rate limit exceeded')
      );

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_test_123' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create checkout session');
    });
  });

  // =========================================================================
  // POST /api/payments/webhooks/stripe
  // =========================================================================
  describe('POST /api/payments/webhooks/stripe', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);

      expect(res.body.error).toBe('Missing stripe-signature header');
    });

    it('should process valid webhook events', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'payment_intent.succeeded'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'test_signature_abc')
        .send({ type: 'payment_intent.succeeded' })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.type).toBe('payment_intent.succeeded');
      expect(paymentService.handleWebhook).toHaveBeenCalled();
    });

    it('should return 400 for invalid webhook signatures', async () => {
      paymentService.handleWebhook.mockRejectedValueOnce(
        new Error('Invalid signature')
      );

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'invalid_sig')
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Webhook verification failed');
    });

    it('should handle subscription webhook events', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'customer.subscription.created'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send({ type: 'customer.subscription.created' })
        .expect(200);

      expect(res.body.type).toBe('customer.subscription.created');
    });

    it('should pass payload and signature to handleWebhook', async () => {
      const testPayload = { type: 'checkout.session.completed', data: { object: { id: 'cs_123' } } };
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'checkout.session.completed'
      });

      await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'sig_test_abc')
        .send(testPayload)
        .expect(200);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        expect.anything(),
        'sig_test_abc'
      );
    });

    it('should handle checkout.session.completed event', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'checkout.session.completed'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send({ type: 'checkout.session.completed' })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.type).toBe('checkout.session.completed');
    });

    it('should handle customer.subscription.updated event', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'customer.subscription.updated'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send({ type: 'customer.subscription.updated' })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.type).toBe('customer.subscription.updated');
    });

    it('should handle customer.subscription.deleted event', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'customer.subscription.deleted'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send({ type: 'customer.subscription.deleted' })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.type).toBe('customer.subscription.deleted');
    });

    it('should handle invoice.payment_succeeded event', async () => {
      paymentService.handleWebhook.mockResolvedValueOnce({
        received: true,
        type: 'invoice.payment_succeeded'
      });

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send({ type: 'invoice.payment_succeeded' })
        .expect(200);

      expect(res.body.received).toBe(true);
      expect(res.body.type).toBe('invoice.payment_succeeded');
    });
  });

  // =========================================================================
  // POST /api/payments/create-portal-session
  // =========================================================================
  describe('POST /api/payments/create-portal-session', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/payments/create-portal-session')
        .send({})
        .expect(401);
    });

    it('should return 400 when no billing account found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No billing account found');
    });

    it('should return 400 when user has no stripe customer id', async () => {
      query.mockResolvedValueOnce({ rows: [{ stripe_customer_id: null }] });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No billing account found');
    });

    it('should create billing portal session for valid customer', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_portal_123' }]
      });

      paymentService.stripe.billingPortal.sessions.create.mockResolvedValueOnce({
        url: 'https://billing.stripe.com/session/test'
      });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ returnUrl: 'https://fluxstudio.art/billing' })
        .expect(200);

      expect(res.body.url).toBe('https://billing.stripe.com/session/test');
    });

    it('should handle Stripe portal errors', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_portal_123' }]
      });

      paymentService.stripe.billingPortal.sessions.create.mockRejectedValueOnce(
        new Error('Stripe error')
      );

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ returnUrl: 'https://example.com/billing' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create billing portal session');
    });
  });

  // =========================================================================
  // POST /api/payments/create-payment-intent
  // =========================================================================
  describe('POST /api/payments/create-payment-intent', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/payments/create-payment-intent')
        .send({ projectId: 'proj_1', serviceTier: 'standard', projectType: 'storyboarding' })
        .expect(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'proj_1' })
        .expect(400);

      expect(res.body.error).toContain('required');
    });

    it('should return 404 when user not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'proj_1', serviceTier: 'standard', projectType: 'storyboarding' })
        .expect(404);

      expect(res.body.error).toBe('User not found');
    });

    it('should return 404 when project not found', async () => {
      // First query: user found
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_123', email: 'test@example.com', name: 'Test' }]
      });
      // Second query: project not found
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'proj_nonexistent', serviceTier: 'standard', projectType: 'storyboarding' })
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });

    it('should create payment intent for valid request', async () => {
      // User query
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_123', email: 'test@example.com', name: 'Test' }]
      });
      // Project query
      query.mockResolvedValueOnce({
        rows: [{ id: 'proj_1', name: 'My Project', organization_id: 'org_1' }]
      });

      paymentService.createProjectPaymentIntent.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_123', client_secret: 'pi_123_secret_abc' },
        pricing: { totalPrice: 200000, basePrice: 200000, customizations: 0, currency: 'usd' },
        invoice: { id: 'inv_1', invoice_number: 'FS-202501-0001' }
      });

      const res = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'proj_1', serviceTier: 'standard', projectType: 'storyboarding' })
        .expect(200);

      expect(res.body.clientSecret).toBe('pi_123_secret_abc');
      expect(res.body.paymentIntentId).toBe('pi_123');
      expect(res.body.pricing).toBeDefined();
      expect(res.body.invoice).toBeDefined();
    });

    it('should create Stripe customer if user has none', async () => {
      // User without stripe customer
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null, email: 'new@example.com', name: 'New User' }]
      });
      // Project query
      query.mockResolvedValueOnce({
        rows: [{ id: 'proj_1', name: 'My Project', organization_id: 'org_1' }]
      });

      paymentService.createCustomer.mockResolvedValueOnce({ id: 'cus_new' });
      paymentService.createProjectPaymentIntent.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_new', client_secret: 'pi_new_secret' },
        pricing: { totalPrice: 200000, basePrice: 200000, customizations: 0, currency: 'usd' },
        invoice: { id: 'inv_new' }
      });

      const res = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'proj_1', serviceTier: 'standard', projectType: 'storyboarding' })
        .expect(200);

      expect(paymentService.createCustomer).toHaveBeenCalled();
      expect(res.body.paymentIntentId).toBe('pi_new');
    });
  });

  // =========================================================================
  // POST /api/payments/start-trial
  // =========================================================================
  describe('POST /api/payments/start-trial', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/payments/start-trial')
        .send({})
        .expect(401);
    });

    it('should start a 14-day trial for eligible user', async () => {
      // Query 1: SELECT plan_id, trial_ends_at FROM users
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', trial_ends_at: null }]
      });
      // Query 2: SELECT trial_used_at FROM subscriptions (no prior trial)
      query.mockResolvedValueOnce({ rows: [] });
      // Query 3: UPDATE users SET plan_id, trial_ends_at
      query.mockResolvedValueOnce({ rowCount: 1 });
      // Query 4: INSERT INTO subscriptions
      query.mockResolvedValueOnce({ rowCount: 1 });
      // Query 5: SELECT email, name for trial email
      query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com', name: 'Test User' }]
      });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.trial.plan).toBe('pro');
      expect(res.body.trial.daysRemaining).toBe(14);
      expect(res.body.trial.trialEndsAt).toBeDefined();

      // Verify the trial_ends_at is ~14 days from now
      const trialEnd = new Date(res.body.trial.trialEndsAt);
      const daysDiff = (trialEnd - new Date()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(13);
      expect(daysDiff).toBeLessThanOrEqual(14.1);
    });

    it('should return 400 if user already has an active subscription (pro)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', trial_ends_at: null }]
      });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toContain('already have an active subscription');
      expect(res.body.code).toBe('PAYMENT_ALREADY_SUBSCRIBED');
    });

    it('should return 400 if user already has a team plan', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'team', trial_ends_at: null }]
      });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.code).toBe('PAYMENT_ALREADY_SUBSCRIBED');
    });

    it('should return 400 if user already used their free trial (via users.trial_ends_at)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', trial_ends_at: '2025-03-01T00:00:00Z' }]
      });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toContain('already used your free trial');
      expect(res.body.code).toBe('PAYMENT_TRIAL_USED');
    });

    it('should return 400 if user already used trial (via subscriptions table)', async () => {
      // User: free plan, no trial_ends_at on users table
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', trial_ends_at: null }]
      });
      // Subscriptions table check: trial_used_at found
      query.mockResolvedValueOnce({
        rows: [{ trial_used_at: '2025-02-15T00:00:00Z' }]
      });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.code).toBe('PAYMENT_TRIAL_USED');
    });

    it('should return 404 when user not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expect(res.body.error).toBe('User not found');
      expect(res.body.code).toBe('PAYMENT_USER_NOT_FOUND');
    });

    it('should handle database errors gracefully', async () => {
      query.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app)
        .post('/api/payments/start-trial')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(500);

      expect(res.body.error).toBe('Failed to start trial');
      expect(res.body.code).toBe('PAYMENT_TRIAL_ERROR');
    });
  });

  // =========================================================================
  // POST /api/payments/create-checkout-session — Trial support
  // =========================================================================
  describe('POST /api/payments/create-checkout-session — trial support', () => {
    it('should include subscription_data.trial_period_days when withTrial is set and user is eligible', async () => {
      // User lookup
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_trial', email: 'trial@example.com', name: 'Trial User' }]
      });
      // Trial eligibility check
      query.mockResolvedValueOnce({
        rows: [{ trial_ends_at: null }]
      });

      paymentService.stripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_trial_123',
        url: 'https://checkout.stripe.com/pay/cs_trial_123'
      });

      // Note: metadata values must be strings (Zod schema: z.record(z.string()))
      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          priceId: 'price_pro_monthly',
          mode: 'subscription',
          metadata: { withTrial: 'true' }
        })
        .expect(200);

      expect(res.body.sessionId).toBe('cs_trial_123');

      // Verify trial_period_days was passed to Stripe
      expect(paymentService.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: { trial_period_days: 14 }
        })
      );
    });

    it('should NOT include trial_period_days when user already used a trial', async () => {
      // User lookup
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_used', email: 'used@example.com', name: 'Used User' }]
      });
      // Trial eligibility check — already has trial_ends_at
      query.mockResolvedValueOnce({
        rows: [{ trial_ends_at: '2025-06-01T00:00:00Z' }]
      });

      paymentService.stripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_no_trial',
        url: 'https://checkout.stripe.com/pay/cs_no_trial'
      });

      await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          priceId: 'price_pro_monthly',
          mode: 'subscription',
          metadata: { withTrial: 'true' }
        })
        .expect(200);

      // subscription_data should NOT have been included
      const createCall = paymentService.stripe.checkout.sessions.create.mock.calls[0][0];
      expect(createCall.subscription_data).toBeUndefined();
    });

    it('should include planId in checkout session metadata', async () => {
      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_meta', email: 'meta@example.com', name: 'Meta User' }]
      });

      paymentService.stripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_meta_plan',
        url: 'https://checkout.stripe.com/pay/cs_meta_plan'
      });

      await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_pro_monthly' })
        .expect(200);

      const createCall = paymentService.stripe.checkout.sessions.create.mock.calls[0][0];
      expect(createCall.metadata).toBeDefined();
      expect(createCall.metadata.userId).toBe('test-user-123');
      expect(createCall.metadata.planId).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/payments/subscription — Active trial status
  // =========================================================================
  describe('GET /api/payments/subscription — trial status', () => {
    it('should return trial status when user has active trial but no subscription', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

      // First query: trial check from users table
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', trial_ends_at: futureDate }]
      });
      // Second query: subscription check — no active subscription
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(true);
      expect(res.body.subscription.status).toBe('trialing');
      expect(res.body.subscription.plan).toBe('pro');
      expect(res.body.subscription.trialEndsAt).toBe(futureDate);
      expect(res.body.subscription.daysRemaining).toBeGreaterThan(0);
      expect(res.body.subscription.daysRemaining).toBeLessThanOrEqual(7);
      expect(res.body.canTrial).toBe(false);
    });

    it('should return expired trial as no subscription with canTrial false', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // yesterday

      // First query: trial check — expired
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', trial_ends_at: pastDate }]
      });
      // Second query: no active subscription
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Expired trial should not count as active
      expect(res.body.hasSubscription).toBe(false);
      expect(res.body.canTrial).toBe(false);
    });
  });
});
