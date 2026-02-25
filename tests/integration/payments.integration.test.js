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
  // The payments route uses a lazy auth helper; set it up
  const { authenticateToken } = require('../../lib/auth/middleware');
  paymentRoutes.setAuthHelper({ authenticateToken });
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
      query.mockResolvedValueOnce({ rows: [] }); // subscription query
      query.mockResolvedValueOnce({ rows: [] }); // trial check query

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasSubscription).toBe(false);
      expect(res.body.subscription).toBeNull();
      expect(res.body.canTrial).toBe(true);
    });

    it('should return active subscription when one exists', async () => {
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

      expect(res.body.error).toBe('Price ID is required');
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

      expect(res.body.error).toBe('Invalid signature');
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
});
