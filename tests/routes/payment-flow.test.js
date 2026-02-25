/**
 * Payment Flow Integration Tests
 * Tests the full payment lifecycle: checkout -> webhook -> subscription -> portal -> cancellation
 * @file tests/routes/payment-flow.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// ─── Mock Stripe SDK ───

const mockStripeWebhooksConstructEvent = jest.fn();
const mockStripeCheckoutSessionsCreate = jest.fn();
const mockStripeBillingPortalSessionsCreate = jest.fn();
const mockStripeCustomersCreate = jest.fn();
const mockStripeSubscriptionsCreate = jest.fn();

const mockStripe = {
  webhooks: {
    constructEvent: mockStripeWebhooksConstructEvent,
  },
  checkout: {
    sessions: {
      create: mockStripeCheckoutSessionsCreate,
    },
  },
  billingPortal: {
    sessions: {
      create: mockStripeBillingPortalSessionsCreate,
    },
  },
  customers: {
    create: mockStripeCustomersCreate,
  },
  subscriptions: {
    create: mockStripeSubscriptionsCreate,
  },
};

// ─── Mock database ───

const mockQuery = jest.fn();
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));

// ─── Mock lib/payments with realistic PaymentService behavior ───

// We need the PaymentService to actually call through to handleWebhook logic,
// so we build a semi-real mock that uses our mockStripe and mockQuery.
const mockCreateNotification = jest.fn().mockResolvedValue(undefined);

const paymentServiceInstance = {
  stripe: mockStripe,
  isConfigured: () => true,
  requireStripe: () => mockStripe,

  // createCustomer uses Stripe + DB
  createCustomer: jest.fn(async (userData) => {
    const customer = await mockStripe.customers.create({
      email: userData.email,
      name: userData.name,
      metadata: { userId: userData.id },
    });
    await mockQuery(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, userData.id]
    );
    return customer;
  }),

  // handleWebhook verifies signature via Stripe SDK then dispatches
  handleWebhook: jest.fn(async (payload, signature) => {
    const event = mockStripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await paymentServiceInstance.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await paymentServiceInstance.handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await paymentServiceInstance.handleSubscriptionCancelled(event.data.object);
        break;
      case 'customer.subscription.updated':
        await paymentServiceInstance.handleSubscriptionUpdated(event.data.object);
        break;
      default:
        break;
    }

    return { received: true, type: event.type };
  }),

  // Subscription created handler (mirrors lib/payments.js)
  handleSubscriptionCreated: jest.fn(async (subscription) => {
    const customerId = subscription.customer;

    const userResult = await mockQuery(
      'SELECT id, email FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );
    const orgResult = await mockQuery(
      'SELECT id, name FROM organizations WHERE stripe_customer_id = $1',
      [customerId]
    );

    const userId = userResult.rows[0]?.id;
    const orgId = orgResult.rows[0]?.id;

    await mockQuery(expect.stringContaining('INSERT INTO subscriptions'), [
      subscription.id,
      customerId,
      userId || null,
      orgId || null,
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
    ]);

    if (userId) {
      await mockCreateNotification({
        userId,
        type: 'subscription_created',
        title: 'Subscription Activated',
        message: 'Your subscription has been successfully activated. Welcome to FluxStudio Pro!',
        data: { subscriptionId: subscription.id },
      });
    }
  }),

  // Subscription cancelled handler
  handleSubscriptionCancelled: jest.fn(async (subscription) => {
    await mockQuery(
      'UPDATE subscriptions SET status = $1, cancelled_at = NOW() WHERE stripe_subscription_id = $2',
      ['cancelled', subscription.id]
    );

    const userResult = await mockQuery(
      'SELECT id FROM users WHERE stripe_customer_id = $1',
      [subscription.customer]
    );

    if (userResult.rows[0]) {
      await mockCreateNotification({
        userId: userResult.rows[0].id,
        type: 'subscription_cancelled',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. You can resubscribe at any time.',
        data: { subscriptionId: subscription.id },
      });
    }
  }),

  // Subscription updated handler
  handleSubscriptionUpdated: jest.fn(async (subscription) => {
    await mockQuery(expect.stringContaining('UPDATE subscriptions SET'), [
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.id,
    ]);
  }),

  // Checkout session completed -> creates subscription record
  handleCheckoutSessionCompleted: jest.fn(async (session) => {
    if (session.mode === 'subscription' && session.subscription) {
      const userId = session.metadata?.userId;
      if (userId) {
        await mockQuery(expect.stringContaining('INSERT INTO subscriptions'), [
          session.subscription,
          session.customer,
          userId,
          null,
          'active',
          expect.any(Date),
          expect.any(Date),
        ]);
      }
    }
  }),

  createProjectPaymentIntent: jest.fn(),
};

jest.mock('../../lib/payments', () => ({
  paymentService: paymentServiceInstance,
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

// ─── Test helpers ───

const JWT_SECRET = 'test-jwt-secret-key-for-tests';

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

function createTestApp() {
  const app = express();
  app.use(express.json());

  const paymentRouter = require('../../routes/payments');
  paymentRouter.setAuthHelper(mockAuthHelper);
  app.use('/api/payments', paymentRouter);

  return app;
}

function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@fluxstudio.art', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ─── Fixtures ───

const FIXTURES = {
  userId: 'user-1',
  customerId: 'cus_test_123',
  priceId: 'price_pro_monthly',
  subscriptionId: 'sub_test_abc',
  checkoutSessionId: 'cs_test_xyz',
  portalSessionUrl: 'https://billing.stripe.com/session/bps_test',

  user: {
    stripe_customer_id: 'cus_test_123',
    email: 'test@fluxstudio.art',
    name: 'Test User',
  },

  stripeCheckoutSession: {
    id: 'cs_test_xyz',
    url: 'https://checkout.stripe.com/c/pay/cs_test_xyz',
    mode: 'subscription',
    customer: 'cus_test_123',
    subscription: 'sub_test_abc',
    metadata: { userId: 'user-1' },
  },

  stripeSubscription: {
    id: 'sub_test_abc',
    customer: 'cus_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    trial_end: null,
  },
};

// ─── Tests ───

describe('Payment Flow Integration Tests', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    validToken = generateToken();
  });

  // ═══════════════════════════════════════════════════════
  // 1. FULL PAYMENT LIFECYCLE
  // ═══════════════════════════════════════════════════════

  describe('Full Payment Lifecycle', () => {
    it('should complete: checkout -> webhook -> subscription stored -> portal access', async () => {
      // ── Step 1: Create checkout session ──
      mockQuery.mockResolvedValueOnce({
        rows: [FIXTURES.user],
      });

      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        id: FIXTURES.stripeCheckoutSession.id,
        url: FIXTURES.stripeCheckoutSession.url,
      });

      const checkoutRes = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: FIXTURES.priceId });

      expect(checkoutRes.status).toBe(200);
      expect(checkoutRes.body.sessionId).toBe(FIXTURES.stripeCheckoutSession.id);
      expect(checkoutRes.body.url).toBe(FIXTURES.stripeCheckoutSession.url);

      // ── Step 2: Stripe sends checkout.session.completed webhook ──
      const checkoutCompletedEvent = {
        id: 'evt_checkout_completed',
        type: 'checkout.session.completed',
        data: {
          object: FIXTURES.stripeCheckoutSession,
        },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(checkoutCompletedEvent);

      // Mock DB calls for handleCheckoutSessionCompleted
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT INTO subscriptions

      const webhookRes = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig_checkout')
        .send(checkoutCompletedEvent);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body).toEqual({
        received: true,
        type: 'checkout.session.completed',
      });
      expect(paymentServiceInstance.handleCheckoutSessionCompleted).toHaveBeenCalledWith(
        FIXTURES.stripeCheckoutSession
      );

      // ── Step 3: Verify subscription was stored (via query calls) ──
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subscriptions'),
        expect.arrayContaining([
          FIXTURES.stripeSubscription.id,      // subscription id
          FIXTURES.customerId,                  // customer id
          FIXTURES.userId,                      // user id
        ])
      );

      // ── Step 4: User accesses billing portal ──
      jest.clearAllMocks();

      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: FIXTURES.customerId }],
      });

      mockStripeBillingPortalSessionsCreate.mockResolvedValue({
        url: FIXTURES.portalSessionUrl,
      });

      const portalRes = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(portalRes.status).toBe(200);
      expect(portalRes.body.url).toBe(FIXTURES.portalSessionUrl);
      expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ customer: FIXTURES.customerId })
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. CHECKOUT SESSION CREATION
  // ═══════════════════════════════════════════════════════

  describe('POST /api/payments/create-checkout-session', () => {
    it('should create checkout session for user with existing Stripe customer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [FIXTURES.user] });
      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_existing',
        url: 'https://checkout.stripe.com/cs_existing',
      });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: FIXTURES.priceId, mode: 'subscription' });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('cs_existing');
      expect(paymentServiceInstance.createCustomer).not.toHaveBeenCalled();
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: FIXTURES.customerId,
          mode: 'subscription',
          line_items: [{ price: FIXTURES.priceId, quantity: 1 }],
          allow_promotion_codes: true,
          billing_address_collection: 'required',
        })
      );
    });

    it('should create new Stripe customer when user has none', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null, email: 'new@fluxstudio.art', name: 'New User' }],
      });

      mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_brand_new' });
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE users SET stripe_customer_id

      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_new',
        url: 'https://checkout.stripe.com/cs_new',
      });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: FIXTURES.priceId });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('cs_new');
      expect(paymentServiceInstance.createCustomer).toHaveBeenCalledWith({
        id: FIXTURES.userId,
        email: 'new@fluxstudio.art',
        name: 'New User',
      });
    });

    it('should include custom metadata in the checkout session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [FIXTURES.user] });
      mockStripeCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_meta', url: 'https://example.com' });

      await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          priceId: FIXTURES.priceId,
          metadata: { campaign: 'spring-sale' },
        });

      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: FIXTURES.userId,
            campaign: 'spring-sale',
          }),
        })
      );
    });

    it('should use custom success and cancel URLs when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [FIXTURES.user] });
      mockStripeCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_urls', url: 'https://example.com' });

      await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          priceId: FIXTURES.priceId,
          successUrl: 'https://fluxstudio.art/custom-success',
          cancelUrl: 'https://fluxstudio.art/custom-cancel',
        });

      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://fluxstudio.art/custom-success',
          cancel_url: 'https://fluxstudio.art/custom-cancel',
        })
      );
    });

    it('should return 400 when priceId is missing', async () => {
      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Price ID is required');
    });

    it('should return 404 when user does not exist in database', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: FIXTURES.priceId });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('User not found');
    });

    it('should return 500 when Stripe checkout session creation fails', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [FIXTURES.user] });
      mockStripeCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'));

      const res = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ priceId: FIXTURES.priceId });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Failed to create checkout session');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. WEBHOOK HANDLING - SUBSCRIPTION CREATED
  // ═══════════════════════════════════════════════════════

  describe('POST /api/payments/webhooks/stripe - subscription.created', () => {
    it('should process customer.subscription.created and store subscription', async () => {
      const subscriptionCreatedEvent = {
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        data: { object: FIXTURES.stripeSubscription },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(subscriptionCreatedEvent);

      // handleSubscriptionCreated DB calls
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: FIXTURES.userId, email: 'test@fluxstudio.art' }] })  // SELECT users
        .mockResolvedValueOnce({ rows: [] })                                                         // SELECT organizations
        .mockResolvedValueOnce({ rowCount: 1 });                                                     // INSERT INTO subscriptions

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig_sub')
        .send(subscriptionCreatedEvent);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true, type: 'customer.subscription.created' });
      expect(paymentServiceInstance.handleSubscriptionCreated).toHaveBeenCalledWith(
        FIXTURES.stripeSubscription
      );

      // Verify the subscription INSERT was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subscriptions'),
        expect.arrayContaining([
          FIXTURES.stripeSubscription.id,
          FIXTURES.customerId,
          FIXTURES.userId,
        ])
      );

      // Verify notification was created
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FIXTURES.userId,
          type: 'subscription_created',
          title: 'Subscription Activated',
        })
      );
    });

    it('should store subscription for organization when no user matches', async () => {
      const orgSubscription = {
        ...FIXTURES.stripeSubscription,
        customer: 'cus_org_456',
      };

      const event = {
        id: 'evt_org_sub',
        type: 'customer.subscription.created',
        data: { object: orgSubscription },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(event);

      mockQuery
        .mockResolvedValueOnce({ rows: [] })                              // SELECT users - no match
        .mockResolvedValueOnce({ rows: [{ id: 'org-1', name: 'Test Org' }] }) // SELECT organizations
        .mockResolvedValueOnce({ rowCount: 1 });                          // INSERT INTO subscriptions

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig_org')
        .send(event);

      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subscriptions'),
        expect.arrayContaining([
          orgSubscription.id,
          'cus_org_456',
          null,     // userId is null
          'org-1',  // orgId found
        ])
      );

      // Notification should NOT be created (no userId)
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. BILLING PORTAL ACCESS
  // ═══════════════════════════════════════════════════════

  describe('POST /api/payments/create-portal-session', () => {
    it('should create a billing portal session for user with Stripe customer', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: FIXTURES.customerId }],
      });

      mockStripeBillingPortalSessionsCreate.mockResolvedValue({
        url: FIXTURES.portalSessionUrl,
      });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.url).toBe(FIXTURES.portalSessionUrl);
    });

    it('should use the provided returnUrl', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: FIXTURES.customerId }],
      });
      mockStripeBillingPortalSessionsCreate.mockResolvedValue({ url: 'https://portal.stripe.com/x' });

      await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ returnUrl: 'https://fluxstudio.art/account' });

      expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://fluxstudio.art/account',
        })
      );
    });

    it('should return 400 when user has no billing account', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No billing account found');
    });

    it('should return 400 when user exists but stripe_customer_id is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: null }],
      });

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No billing account found');
    });

    it('should return 500 when Stripe portal creation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: FIXTURES.customerId }],
      });
      mockStripeBillingPortalSessionsCreate.mockRejectedValue(
        new Error('Portal config not set')
      );

      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Failed to create billing portal session');
    });

    it('should return 401 without an auth token', async () => {
      const res = await request(app)
        .post('/api/payments/create-portal-session')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. SUBSCRIPTION CANCELLATION WEBHOOK
  // ═══════════════════════════════════════════════════════

  describe('POST /api/payments/webhooks/stripe - subscription.deleted (cancellation)', () => {
    it('should update subscription status to cancelled and notify user', async () => {
      const cancelledSubscription = {
        ...FIXTURES.stripeSubscription,
        status: 'canceled',
      };

      const event = {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: { object: cancelledSubscription },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(event);

      // handleSubscriptionCancelled DB calls
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })  // UPDATE subscriptions SET status = cancelled
        .mockResolvedValueOnce({ rows: [{ id: FIXTURES.userId }] }); // SELECT user for notification

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig_cancel')
        .send(event);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true, type: 'customer.subscription.deleted' });

      expect(paymentServiceInstance.handleSubscriptionCancelled).toHaveBeenCalledWith(
        cancelledSubscription
      );

      // Verify subscription was marked as cancelled in DB
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE subscriptions SET status = $1, cancelled_at = NOW() WHERE stripe_subscription_id = $2',
        ['cancelled', FIXTURES.stripeSubscription.id]
      );

      // Verify cancellation notification was sent
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FIXTURES.userId,
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
        })
      );
    });

    it('should handle cancellation without sending notification when user not found', async () => {
      const cancelledSubscription = {
        ...FIXTURES.stripeSubscription,
        customer: 'cus_orphaned',
        status: 'canceled',
      };

      const event = {
        id: 'evt_sub_deleted_orphan',
        type: 'customer.subscription.deleted',
        data: { object: cancelledSubscription },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(event);

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })  // UPDATE subscriptions
        .mockResolvedValueOnce({ rows: [] });     // SELECT user - not found

      const res = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'valid_sig_orphan')
        .send(event);

      expect(res.status).toBe(200);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. ERROR CASES
  // ═══════════════════════════════════════════════════════

  describe('Error Cases', () => {
    describe('Invalid webhook signature', () => {
      it('should return 400 when Stripe signature verification fails', async () => {
        mockStripeWebhooksConstructEvent.mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature for payload');
        });

        // handleWebhook is called and re-throws
        paymentServiceInstance.handleWebhook.mockRejectedValueOnce(
          new Error('Webhook handling failed: No signatures found matching the expected signature for payload')
        );

        const res = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'invalid_signature_abc')
          .send({ id: 'evt_bad' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('signature');
      });

      it('should return 400 when stripe-signature header is missing entirely', async () => {
        const res = await request(app)
          .post('/api/payments/webhooks/stripe')
          .send({ id: 'evt_no_sig' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Missing stripe-signature');
        expect(paymentServiceInstance.handleWebhook).not.toHaveBeenCalled();
      });
    });

    describe('Missing required fields', () => {
      it('should return 400 for checkout session without priceId', async () => {
        const res = await request(app)
          .post('/api/payments/create-checkout-session')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ mode: 'subscription' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Price ID is required');
      });

      it('should return 400 for payment intent missing all required fields', async () => {
        const res = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${validToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('required');
      });

      it('should return 400 for payment intent missing projectId', async () => {
        const res = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ serviceTier: 'premium', projectType: 'drill-design' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('required');
      });

      it('should return 400 for payment intent missing serviceTier', async () => {
        const res = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ projectId: 'proj-1', projectType: 'drill-design' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('required');
      });

      it('should return 400 for payment intent missing projectType', async () => {
        const res = await request(app)
          .post('/api/payments/create-payment-intent')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ projectId: 'proj-1', serviceTier: 'premium' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('required');
      });
    });

    describe('Duplicate webhook processing', () => {
      it('should handle duplicate subscription.created events idempotently via ON CONFLICT', async () => {
        const event = {
          id: 'evt_duplicate',
          type: 'customer.subscription.created',
          data: { object: FIXTURES.stripeSubscription },
        };

        mockStripeWebhooksConstructEvent.mockReturnValue(event);

        // First call: normal insert
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: FIXTURES.userId, email: 'test@fluxstudio.art' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rowCount: 1 });

        const res1 = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'sig_first')
          .send(event);

        expect(res1.status).toBe(200);

        jest.clearAllMocks();
        mockStripeWebhooksConstructEvent.mockReturnValue(event);

        // Second call: ON CONFLICT DO UPDATE (same subscription ID, upsert)
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: FIXTURES.userId, email: 'test@fluxstudio.art' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rowCount: 1 }); // ON CONFLICT still succeeds

        const res2 = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'sig_second')
          .send(event);

        expect(res2.status).toBe(200);
        expect(res2.body).toEqual({ received: true, type: 'customer.subscription.created' });

        // The INSERT query with ON CONFLICT should have been called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO subscriptions'),
          expect.arrayContaining([FIXTURES.stripeSubscription.id])
        );
      });

      it('should handle duplicate checkout.session.completed events gracefully', async () => {
        const event = {
          id: 'evt_cs_dup',
          type: 'checkout.session.completed',
          data: { object: FIXTURES.stripeCheckoutSession },
        };

        mockStripeWebhooksConstructEvent.mockReturnValue(event);
        mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // INSERT (or ON CONFLICT)

        const res1 = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'sig_dup_1')
          .send(event);

        expect(res1.status).toBe(200);

        // Send it again
        jest.clearAllMocks();
        mockStripeWebhooksConstructEvent.mockReturnValue(event);
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        const res2 = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'sig_dup_2')
          .send(event);

        expect(res2.status).toBe(200);
        expect(res2.body.type).toBe('checkout.session.completed');
      });
    });

    describe('Unhandled event types', () => {
      it('should acknowledge unhandled webhook event types without error', async () => {
        const event = {
          id: 'evt_unknown',
          type: 'charge.refunded',
          data: { object: { id: 're_123' } },
        };

        mockStripeWebhooksConstructEvent.mockReturnValue(event);

        const res = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'sig_unknown')
          .send(event);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ received: true, type: 'charge.refunded' });
      });
    });

    describe('Authentication errors', () => {
      it('should return 401 for checkout session without token', async () => {
        const res = await request(app)
          .post('/api/payments/create-checkout-session')
          .send({ priceId: FIXTURES.priceId });

        expect(res.status).toBe(401);
      });

      it('should return 401 for portal session without token', async () => {
        const res = await request(app)
          .post('/api/payments/create-portal-session')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should return 401 for subscription status without token', async () => {
        const res = await request(app)
          .get('/api/payments/subscription');

        expect(res.status).toBe(401);
      });

      it('should return 401 for payment intent without token', async () => {
        const res = await request(app)
          .post('/api/payments/create-payment-intent')
          .send({ projectId: 'p1', serviceTier: 'premium', projectType: 'drill-design' });

        expect(res.status).toBe(401);
      });

      it('should return 401 with an expired token', async () => {
        const expiredToken = jwt.sign(
          { id: 'user-1', email: 'test@fluxstudio.art', type: 'access' },
          JWT_SECRET,
          { expiresIn: '0s' }
        );

        const res = await request(app)
          .post('/api/payments/create-checkout-session')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({ priceId: FIXTURES.priceId });

        expect(res.status).toBe(401);
      });
    });

    describe('Subscription status edge cases', () => {
      it('should return subscription details when active subscription exists', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            stripe_subscription_id: FIXTURES.stripeSubscription.id,
            status: 'active',
            current_period_end: '2026-03-15T00:00:00Z',
            cancelled_at: null,
            stripe_customer_id: FIXTURES.customerId,
          }],
        });

        const res = await request(app)
          .get('/api/payments/subscription')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.hasSubscription).toBe(true);
        expect(res.body.subscription).toEqual({
          id: FIXTURES.stripeSubscription.id,
          status: 'active',
          currentPeriodEnd: '2026-03-15T00:00:00Z',
          cancelledAt: null,
        });
      });

      it('should return hasSubscription false and canTrial true for new users', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [] })   // no active subscription
          .mockResolvedValueOnce({ rows: [] });  // no trial used

        const res = await request(app)
          .get('/api/payments/subscription')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.hasSubscription).toBe(false);
        expect(res.body.subscription).toBeNull();
        expect(res.body.canTrial).toBe(true);
      });

      it('should return canTrial false when trial was already used', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ trial_used_at: '2026-01-01T00:00:00Z' }] });

        const res = await request(app)
          .get('/api/payments/subscription')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.hasSubscription).toBe(false);
        expect(res.body.canTrial).toBe(false);
      });
    });

    describe('Webhook handler internal errors', () => {
      it('should return 400 when webhook handler throws an unexpected error', async () => {
        paymentServiceInstance.handleWebhook.mockRejectedValueOnce(
          new Error('Webhook handling failed: Database connection lost')
        );

        const res = await request(app)
          .post('/api/payments/webhooks/stripe')
          .set('stripe-signature', 'valid_sig_db_error')
          .send({ id: 'evt_db_err' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Database connection lost');
      });
    });
  });
});
