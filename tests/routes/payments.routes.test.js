/**
 * Payment Routes Unit Tests
 * Tests all 6 Stripe payment endpoints
 * @file tests/routes/payments.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock dependencies
const mockPaymentService = {
  handleWebhook: jest.fn(),
  createCustomer: jest.fn(),
  createProjectPaymentIntent: jest.fn(),
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
};

jest.mock('../../lib/payments', () => ({
  paymentService: mockPaymentService,
  SERVICE_PRICING: {
    foundation: {
      'show-concept': 150000,
      'visual-identity': 120000,
    },
    standard: {
      'storyboarding': 200000,
      'uniform-design': 350000,
    },
    premium: {
      'drill-design': 600000,
      'choreography': 450000,
    },
    elite: {
      'season-package': 1200000,
      'monthly-support': 200000,
    },
  },
}));

const mockQuery = jest.fn();
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// Create mock auth helper (same pattern as auth.routes.test.js)
const mockAuthHelper = {
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }),
};

// Setup express app with payment routes
function createTestApp() {
  const app = express();

  // Webhook route needs raw body, so mount it before json parser
  // But for tests we pass JSON and the route reads req.body directly
  app.use(express.json());

  const paymentRouter = require('../../routes/payments');
  paymentRouter.setAuthHelper(mockAuthHelper);

  app.use('/api/payments', paymentRouter);

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Payment Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    validToken = generateToken();
  });

  // ─── POST /api/payments/webhooks/stripe ───

  describe('POST /api/payments/webhooks/stripe', () => {
    it('should process a valid webhook and return 200', async () => {
      mockPaymentService.handleWebhook.mockResolvedValue({
        received: true,
        type: 'payment_intent.succeeded',
      });

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid-sig-123')
        .send({ id: 'evt_123', type: 'payment_intent.succeeded' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        received: true,
        type: 'payment_intent.succeeded',
      });
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        expect.anything(),
        'valid-sig-123'
      );
    });

    it('should return 400 when stripe-signature header is missing', async () => {
      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .send({ id: 'evt_123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing stripe-signature');
      expect(mockPaymentService.handleWebhook).not.toHaveBeenCalled();
    });

    it('should return 400 when handleWebhook throws (invalid signature)', async () => {
      mockPaymentService.handleWebhook.mockRejectedValue(
        new Error('Webhook signature verification failed')
      );

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'bad-sig')
        .send({ id: 'evt_123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Webhook signature verification failed');
    });

    it('should pass the raw body and signature to handleWebhook', async () => {
      mockPaymentService.handleWebhook.mockResolvedValue({
        received: true,
        type: 'customer.subscription.created',
      });

      const payload = { id: 'evt_456', type: 'customer.subscription.created' };

      await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'sig-abc')
        .send(payload);

      expect(mockPaymentService.handleWebhook).toHaveBeenCalledTimes(1);
      const [body, sig] = mockPaymentService.handleWebhook.mock.calls[0];
      expect(sig).toBe('sig-abc');
    });
  });

  // ─── POST /api/payments/create-checkout-session ───

  describe('POST /api/payments/create-checkout-session', () => {
    it('should create checkout session with existing Stripe customer', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_existing', email: 'test@example.com', name: 'Test' }],
      });

      mockPaymentService.stripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session/cs_123',
      });

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: 'price_abc' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('cs_123');
      expect(response.body.url).toBe('https://checkout.stripe.com/session/cs_123');
      expect(mockPaymentService.createCustomer).not.toHaveBeenCalled();
      expect(mockPaymentService.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          line_items: [{ price: 'price_abc', quantity: 1 }],
        })
      );
    });

    it('should create a new Stripe customer when user has none', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null, email: 'new@example.com', name: 'New User' }],
      });

      mockPaymentService.createCustomer.mockResolvedValue({ id: 'cus_new' });

      mockPaymentService.stripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_456',
        url: 'https://checkout.stripe.com/session/cs_456',
      });

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: 'price_xyz' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('cs_456');
      expect(mockPaymentService.createCustomer).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
      });
      expect(mockPaymentService.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_new' })
      );
    });

    it('should return 400 when priceId is missing', async () => {
      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Price ID is required');
    });

    it('should return 404 when user is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: 'price_abc' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .send({ priceId: 'price_abc' });

      expect(response.status).toBe(401);
    });
  });

  // ─── POST /api/payments/create-portal-session ───

  describe('POST /api/payments/create-portal-session', () => {
    it('should create a portal session successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_portal' }],
      });

      mockPaymentService.stripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/portal_123',
      });

      const response = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('https://billing.stripe.com/session/portal_123');
      expect(mockPaymentService.stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_portal' })
      );
    });

    it('should return 400 when user has no stripe_customer_id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null }],
      });

      const response = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No billing account found');
    });

    it('should return 400 when user is not found at all', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No billing account found');
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app)
        .post('/api/payments/create-portal-session')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should pass custom returnUrl to portal session', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_portal' }],
      });

      mockPaymentService.stripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/portal_456',
      });

      await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ returnUrl: 'https://fluxstudio.art/my-billing' });

      expect(mockPaymentService.stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://fluxstudio.art/my-billing',
        })
      );
    });
  });

  // ─── GET /api/payments/pricing ───

  describe('GET /api/payments/pricing', () => {
    it('should return formatted pricing for all tiers', async () => {
      const response = await request(app).get('/api/payments/pricing');

      expect(response.status).toBe(200);
      expect(response.body.pricing).toBeDefined();

      // Check all tiers are present
      expect(response.body.pricing).toHaveProperty('foundation');
      expect(response.body.pricing).toHaveProperty('standard');
      expect(response.body.pricing).toHaveProperty('premium');
      expect(response.body.pricing).toHaveProperty('elite');
    });

    it('should format each price with amount, formatted string, and currency', async () => {
      const response = await request(app).get('/api/payments/pricing');

      const showConcept = response.body.pricing.foundation['show-concept'];
      expect(showConcept.amount).toBe(150000);
      expect(showConcept.formatted).toContain('$');
      expect(showConcept.formatted).toContain('1,500');
      expect(showConcept.currency).toBe('usd');
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/api/payments/pricing');

      expect(response.status).toBe(200);
      expect(response.body.pricing).toBeDefined();
    });

    it('should include all services within each tier', async () => {
      const response = await request(app).get('/api/payments/pricing');

      expect(Object.keys(response.body.pricing.foundation)).toEqual(
        expect.arrayContaining(['show-concept', 'visual-identity'])
      );
      expect(Object.keys(response.body.pricing.premium)).toEqual(
        expect.arrayContaining(['drill-design', 'choreography'])
      );
    });
  });

  // ─── GET /api/payments/subscription ───

  describe('GET /api/payments/subscription', () => {
    it('should return active subscription details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          stripe_subscription_id: 'sub_active',
          status: 'active',
          current_period_end: '2026-03-01T00:00:00Z',
          cancelled_at: null,
          stripe_customer_id: 'cus_123',
        }],
      });

      const response = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasSubscription).toBe(true);
      expect(response.body.subscription).toEqual({
        id: 'sub_active',
        status: 'active',
        currentPeriodEnd: '2026-03-01T00:00:00Z',
        cancelledAt: null,
      });
    });

    it('should return canTrial true when user has no subscription and no trial used', async () => {
      // First query: no active subscription
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second query: no trial used
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasSubscription).toBe(false);
      expect(response.body.subscription).toBeNull();
      expect(response.body.canTrial).toBe(true);
    });

    it('should return canTrial false when user already used trial', async () => {
      // First query: no active subscription
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second query: trial was used
      mockQuery.mockResolvedValueOnce({
        rows: [{ trial_used_at: '2025-01-01T00:00:00Z' }],
      });

      const response = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasSubscription).toBe(false);
      expect(response.body.canTrial).toBe(false);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app).get('/api/payments/subscription');

      expect(response.status).toBe(401);
    });

    it('should pass the correct userId to the subscription query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.user_id = $1'),
        ['user-1']
      );
    });
  });

  // ─── POST /api/payments/create-payment-intent ───

  describe('POST /api/payments/create-payment-intent', () => {
    const validPayload = {
      projectId: 'proj-1',
      serviceTier: 'premium',
      projectType: 'drill-design',
    };

    it('should create a payment intent successfully', async () => {
      // User query
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_pi', email: 'test@example.com', name: 'Test' }],
      });
      // Project query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'My Project', organization_id: 'org-1' }],
      });

      mockPaymentService.createProjectPaymentIntent.mockResolvedValue({
        paymentIntent: { id: 'pi_123', client_secret: 'pi_123_secret' },
        pricing: { basePrice: 600000, totalPrice: 600000, currency: 'usd' },
        invoice: { id: 'inv-1', invoice_number: 'FS-202602-0001' },
      });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body.clientSecret).toBe('pi_123_secret');
      expect(response.body.paymentIntentId).toBe('pi_123');
      expect(response.body.pricing).toBeDefined();
      expect(response.body.invoice).toBeDefined();
    });

    it('should create a new Stripe customer if user has none', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null, email: 'new@example.com', name: 'New User' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'My Project', organization_id: 'org-1' }],
      });

      mockPaymentService.createCustomer.mockResolvedValue({ id: 'cus_new_pi' });
      mockPaymentService.createProjectPaymentIntent.mockResolvedValue({
        paymentIntent: { id: 'pi_456', client_secret: 'pi_456_secret' },
        pricing: { basePrice: 600000, totalPrice: 600000, currency: 'usd' },
        invoice: { id: 'inv-2', invoice_number: 'FS-202602-0002' },
      });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(mockPaymentService.createCustomer).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
      });
      expect(mockPaymentService.createProjectPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'proj-1' }),
        expect.objectContaining({ customerId: 'cus_new_pi' })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      const testCases = [
        { serviceTier: 'premium', projectType: 'drill-design' }, // missing projectId
        { projectId: 'proj-1', projectType: 'drill-design' },     // missing serviceTier
        { projectId: 'proj-1', serviceTier: 'premium' },          // missing projectType
        {},                                                         // all missing
      ];

      for (const payload of testCases) {
        const response = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      }
    });

    it('should return 404 when user is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('User not found');
    });

    it('should return 404 when project is not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_pi', email: 'test@example.com', name: 'Test' }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Project not found');
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .send(validPayload);

      expect(response.status).toBe(401);
    });

    it('should pass customizations through to createProjectPaymentIntent', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_pi', email: 'test@example.com', name: 'Test' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'My Project', organization_id: 'org-1' }],
      });

      mockPaymentService.createProjectPaymentIntent.mockResolvedValue({
        paymentIntent: { id: 'pi_789', client_secret: 'pi_789_secret' },
        pricing: { basePrice: 600000, totalPrice: 900000, currency: 'usd' },
        invoice: { id: 'inv-3', invoice_number: 'FS-202602-0003' },
      });

      await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...validPayload,
          customizations: { rushDelivery: true },
        });

      expect(mockPaymentService.createProjectPaymentIntent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          customizations: { rushDelivery: true },
        })
      );
    });
  });
});
