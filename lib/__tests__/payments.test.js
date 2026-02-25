/**
 * PaymentService Unit Tests
 * Tests the PaymentService class in lib/payments.js
 * @file lib/__tests__/payments.test.js
 */

// Mock Stripe client methods
const mockStripeClient = {
  customers: { create: jest.fn() },
  paymentIntents: { create: jest.fn() },
  subscriptions: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  refunds: { create: jest.fn() },
  paymentMethods: { list: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('stripe', () => jest.fn(() => mockStripeClient));
jest.mock('../../database/config', () => ({ query: jest.fn() }));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-1234') }));

// Set env before requiring module
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx';

const { paymentService, SERVICE_PRICING } = require('../payments');
const { query } = require('../../database/config');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
    console.warn.mockRestore();
  });

  // ----------------------------------------------------------------
  // 1. Configuration
  // ----------------------------------------------------------------
  describe('isConfigured()', () => {
    it('should return true when Stripe is initialized', () => {
      expect(paymentService.isConfigured()).toBe(true);
    });

    it('should return false when stripe is null', () => {
      const original = paymentService.stripe;
      paymentService.stripe = null;
      expect(paymentService.isConfigured()).toBe(false);
      paymentService.stripe = original;
    });
  });

  describe('requireStripe()', () => {
    it('should return the stripe instance when configured', () => {
      expect(paymentService.requireStripe()).toBe(paymentService.stripe);
    });

    it('should throw when stripe is not configured', () => {
      const original = paymentService.stripe;
      paymentService.stripe = null;
      expect(() => paymentService.requireStripe()).toThrow(
        'Payment service not configured. STRIPE_SECRET_KEY environment variable is required.'
      );
      paymentService.stripe = original;
    });
  });

  // ----------------------------------------------------------------
  // 2. createCustomer()
  // ----------------------------------------------------------------
  describe('createCustomer()', () => {
    const userData = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+15551234567',
      userType: 'client',
    };

    it('should create a Stripe customer and update the database', async () => {
      const mockCustomer = { id: 'cus_abc123', email: userData.email };
      mockStripeClient.customers.create.mockResolvedValue(mockCustomer);
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.createCustomer(userData);

      expect(mockStripeClient.customers.create).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        metadata: { userId: userData.id, userType: userData.userType },
      });
      expect(query).toHaveBeenCalledWith(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        ['cus_abc123', 'user-1']
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should throw on Stripe API failure', async () => {
      mockStripeClient.customers.create.mockRejectedValue(new Error('Stripe error'));

      await expect(paymentService.createCustomer(userData)).rejects.toThrow(
        'Failed to create customer: Stripe error'
      );
    });

    it('should throw on database failure', async () => {
      mockStripeClient.customers.create.mockResolvedValue({ id: 'cus_abc' });
      query.mockRejectedValue(new Error('DB error'));

      await expect(paymentService.createCustomer(userData)).rejects.toThrow(
        'Failed to create customer: DB error'
      );
    });
  });

  // ----------------------------------------------------------------
  // 3. createOrganizationCustomer()
  // ----------------------------------------------------------------
  describe('createOrganizationCustomer()', () => {
    it('should create customer with billing_email', async () => {
      const orgData = {
        id: 'org-1',
        name: 'Test Org',
        billing_email: 'billing@org.com',
        contact_email: 'contact@org.com',
        contact_phone: '+15559876543',
      };
      const mockCustomer = { id: 'cus_org123' };
      mockStripeClient.customers.create.mockResolvedValue(mockCustomer);
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.createOrganizationCustomer(orgData);

      expect(mockStripeClient.customers.create).toHaveBeenCalledWith({
        email: 'billing@org.com',
        name: 'Test Org',
        phone: '+15559876543',
        metadata: { organizationId: 'org-1', type: 'organization' },
      });
      expect(query).toHaveBeenCalledWith(
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        ['cus_org123', 'org-1']
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should fall back to contact_email when billing_email is absent', async () => {
      const orgData = {
        id: 'org-2',
        name: 'No Billing Org',
        contact_email: 'fallback@org.com',
        contact_phone: '+15550000000',
      };
      mockStripeClient.customers.create.mockResolvedValue({ id: 'cus_org456' });
      query.mockResolvedValue({ rows: [] });

      await paymentService.createOrganizationCustomer(orgData);

      expect(mockStripeClient.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'fallback@org.com' })
      );
    });

    it('should throw on Stripe failure', async () => {
      mockStripeClient.customers.create.mockRejectedValue(new Error('Stripe fail'));

      await expect(
        paymentService.createOrganizationCustomer({ id: 'org-3', name: 'X' })
      ).rejects.toThrow('Failed to create organization customer: Stripe fail');
    });
  });

  // ----------------------------------------------------------------
  // 4. calculateProjectPrice()
  // ----------------------------------------------------------------
  describe('calculateProjectPrice()', () => {
    it('should return base price for a foundation tier service', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation');
      expect(result).toEqual({
        basePrice: 150000,
        customizations: 0,
        totalPrice: 150000,
        currency: 'usd',
      });
    });

    it('should return base price for a standard tier service', () => {
      const result = paymentService.calculateProjectPrice('storyboarding', 'standard');
      expect(result.basePrice).toBe(200000);
      expect(result.totalPrice).toBe(200000);
    });

    it('should return base price for a premium tier service', () => {
      const result = paymentService.calculateProjectPrice('drill-design', 'premium');
      expect(result.basePrice).toBe(600000);
    });

    it('should return base price for an elite tier service', () => {
      const result = paymentService.calculateProjectPrice('season-package', 'elite');
      expect(result.basePrice).toBe(1200000);
    });

    it('should add 50% for rush delivery', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation', {
        rushDelivery: true,
      });
      // 150000 + 75000 = 225000
      expect(result.totalPrice).toBe(225000);
      expect(result.customizations).toBe(75000);
    });

    it('should add $150 per additional revision', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation', {
        additionalRevisions: 3,
      });
      // 150000 + (3 * 15000) = 195000
      expect(result.totalPrice).toBe(195000);
      expect(result.customizations).toBe(45000);
    });

    it('should add $250 per additional deliverable', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation', {
        additionalDeliverables: ['logo', 'banner'],
      });
      // 150000 + (2 * 25000) = 200000
      expect(result.totalPrice).toBe(200000);
      expect(result.customizations).toBe(50000);
    });

    it('should add 25% for ensemble size > 100', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation', {
        ensembleSize: 150,
      });
      // 150000 + floor(150000 * 0.25) = 150000 + 37500 = 187500
      expect(result.totalPrice).toBe(187500);
      expect(result.customizations).toBe(37500);
    });

    it('should combine rush delivery with additional revisions and deliverables', () => {
      const result = paymentService.calculateProjectPrice('storyboarding', 'standard', {
        rushDelivery: true,
        additionalRevisions: 2,
        additionalDeliverables: ['extra'],
      });
      // base: 200000
      // rush: 100000
      // revisions: 30000
      // deliverables: 25000
      // total: 355000
      expect(result.totalPrice).toBe(355000);
      expect(result.customizations).toBe(155000);
    });

    it('should throw for unknown tier', () => {
      expect(() => paymentService.calculateProjectPrice('show-concept', 'unknown')).toThrow(
        'No pricing found for unknown/show-concept'
      );
    });

    it('should throw for unknown project type', () => {
      expect(() => paymentService.calculateProjectPrice('nonexistent', 'foundation')).toThrow(
        'No pricing found for foundation/nonexistent'
      );
    });

    it('should not apply ensemble multiplier for size <= 100', () => {
      const result = paymentService.calculateProjectPrice('show-concept', 'foundation', {
        ensembleSize: 100,
      });
      expect(result.totalPrice).toBe(150000);
    });
  });

  // ----------------------------------------------------------------
  // 5. createProjectPaymentIntent()
  // ----------------------------------------------------------------
  describe('createProjectPaymentIntent()', () => {
    const projectData = {
      id: 'proj-1',
      name: 'Test Project',
      organization_id: 'org-1',
      client_id: 'client-1',
      project_type: 'show-concept',
      service_tier: 'foundation',
    };

    it('should create payment intent and invoice', async () => {
      const mockPaymentIntent = { id: 'pi_abc123', amount: 150000 };
      mockStripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Mock generateInvoiceNumber query
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      // Mock createInvoice INSERT
      query.mockResolvedValueOnce({
        rows: [{ id: 'inv-1', invoice_number: 'FS-202602-0006' }],
      });

      const result = await paymentService.createProjectPaymentIntent(projectData, {
        customerId: 'cus_abc',
      });

      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith({
        amount: 150000,
        currency: 'usd',
        customer: 'cus_abc',
        description: 'FluxStudio: Test Project',
        metadata: {
          projectId: 'proj-1',
          organizationId: 'org-1',
          projectType: 'show-concept',
          serviceTier: 'foundation',
        },
        payment_method_types: ['card'],
        setup_future_usage: undefined,
      });

      expect(result.paymentIntent).toEqual(mockPaymentIntent);
      expect(result.pricing.totalPrice).toBe(150000);
      expect(result.invoice).toBeDefined();
    });

    it('should set setup_future_usage when savePaymentMethod is true', async () => {
      mockStripeClient.paymentIntents.create.mockResolvedValue({ id: 'pi_save' });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ id: 'inv-2' }] });

      await paymentService.createProjectPaymentIntent(projectData, {
        customerId: 'cus_abc',
        savePaymentMethod: true,
      });

      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ setup_future_usage: 'on_session' })
      );
    });

    it('should include customization line item when present', async () => {
      mockStripeClient.paymentIntents.create.mockResolvedValue({ id: 'pi_custom' });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ id: 'inv-3' }] });

      await paymentService.createProjectPaymentIntent(projectData, {
        customerId: 'cus_abc',
        customizations: { rushDelivery: true },
      });

      // Verify the invoice INSERT includes customization line item
      const insertCall = query.mock.calls[1];
      const lineItems = JSON.parse(insertCall[1][6]); // 7th param is line_items
      expect(lineItems).toHaveLength(2);
      expect(lineItems[1].description).toBe('Customizations and add-ons');
    });

    it('should throw on Stripe payment intent creation failure', async () => {
      mockStripeClient.paymentIntents.create.mockRejectedValue(new Error('Intent failed'));

      await expect(
        paymentService.createProjectPaymentIntent(projectData, { customerId: 'cus_abc' })
      ).rejects.toThrow('Failed to create payment intent: Intent failed');
    });
  });

  // ----------------------------------------------------------------
  // 6. createSubscription()
  // ----------------------------------------------------------------
  describe('createSubscription()', () => {
    it('should create subscription with correct parameters', async () => {
      const mockSubscription = { id: 'sub_abc123', status: 'incomplete' };
      mockStripeClient.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await paymentService.createSubscription('cus_abc', 'price_xyz', {
        metadata: { plan: 'pro' },
      });

      expect(mockStripeClient.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_abc',
        items: [{ price: 'price_xyz' }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { plan: 'pro' },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should use empty metadata when options has no metadata', async () => {
      mockStripeClient.subscriptions.create.mockResolvedValue({ id: 'sub_def' });

      await paymentService.createSubscription('cus_abc', 'price_xyz');

      expect(mockStripeClient.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      );
    });

    it('should throw on subscription creation failure', async () => {
      mockStripeClient.subscriptions.create.mockRejectedValue(new Error('Sub failed'));

      await expect(
        paymentService.createSubscription('cus_abc', 'price_xyz')
      ).rejects.toThrow('Failed to create subscription: Sub failed');
    });
  });

  // ----------------------------------------------------------------
  // 7. handleWebhook()
  // ----------------------------------------------------------------
  describe('handleWebhook()', () => {
    const payload = 'raw-body';
    const signature = 'sig_header';

    it('should dispatch payment_intent.succeeded to handlePaymentSuccess', async () => {
      const eventObj = { metadata: { projectId: 'proj-1', clientId: 'user-1' } };
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: eventObj },
      });
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.handleWebhook(payload, signature);

      expect(mockStripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_xxx'
      );
      expect(result).toEqual({ received: true, type: 'payment_intent.succeeded' });
    });

    it('should dispatch payment_intent.payment_failed', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_fail', metadata: {} } },
      });
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result.type).toBe('payment_intent.payment_failed');
    });

    it('should dispatch invoice.payment_succeeded', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_1',
            customer: 'cus_1',
            subscription: 'sub_1',
            amount_paid: 2000,
            currency: 'usd',
            lines: { data: [{ period: { end: 1700000000 } }] },
          },
        },
      });
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result.type).toBe('invoice.payment_succeeded');
    });

    it('should dispatch customer.subscription.deleted', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_del', customer: 'cus_1' } },
      });
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result.type).toBe('customer.subscription.deleted');
    });

    it('should dispatch customer.subscription.updated', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_upd',
            status: 'active',
            current_period_start: 1600000000,
            current_period_end: 1700000000,
          },
        },
      });
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result.type).toBe('customer.subscription.updated');
    });

    it('should dispatch customer.subscription.created', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_new',
            customer: 'cus_1',
            status: 'active',
            current_period_start: 1600000000,
            current_period_end: 1700000000,
          },
        },
      });
      query.mockResolvedValue({ rows: [{ id: 'user-1', email: 'u@test.com' }] });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result.type).toBe('customer.subscription.created');
    });

    it('should handle unrecognized event types gracefully', async () => {
      mockStripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      const result = await paymentService.handleWebhook(payload, signature);
      expect(result).toEqual({ received: true, type: 'some.unknown.event' });
    });

    it('should throw on invalid signature', async () => {
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(paymentService.handleWebhook(payload, 'bad_sig')).rejects.toThrow(
        'Webhook handling failed: Invalid signature'
      );
    });
  });

  // ----------------------------------------------------------------
  // 8. handleSubscriptionCreated()
  // ----------------------------------------------------------------
  describe('handleSubscriptionCreated()', () => {
    const subscription = {
      id: 'sub_created',
      customer: 'cus_100',
      status: 'active',
      current_period_start: 1600000000,
      current_period_end: 1700000000,
      trial_end: null,
    };

    it('should insert subscription and send notification when user found', async () => {
      // User lookup
      query.mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'u@test.com' }] });
      // Org lookup
      query.mockResolvedValueOnce({ rows: [] });
      // INSERT subscription
      query.mockResolvedValueOnce({ rows: [] });
      // INSERT notification
      query.mockResolvedValueOnce({ rows: [] });

      await paymentService.handleSubscriptionCreated(subscription);

      // Verify subscription INSERT
      expect(query).toHaveBeenCalledTimes(4);
      const insertCall = query.mock.calls[2];
      expect(insertCall[1]).toContain('sub_created');
      expect(insertCall[1]).toContain('cus_100');
      expect(insertCall[1]).toContain('user-1');

      // Verify notification
      const notifCall = query.mock.calls[3];
      expect(notifCall[1]).toContain('user-1');
      expect(notifCall[1]).toContain('subscription_created');
    });

    it('should insert subscription with org ID when org found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // no user
      query.mockResolvedValueOnce({ rows: [{ id: 'org-5', name: 'Org' }] }); // org
      query.mockResolvedValueOnce({ rows: [] }); // insert

      await paymentService.handleSubscriptionCreated(subscription);

      const insertCall = query.mock.calls[2];
      expect(insertCall[1][3]).toBe('org-5'); // organization_id param
    });

    it('should track trial usage when trial_end is set', async () => {
      const trialSub = { ...subscription, trial_end: 1700000000 };
      query.mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'u@test.com' }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] }); // insert
      query.mockResolvedValueOnce({ rows: [] }); // trial update
      query.mockResolvedValueOnce({ rows: [] }); // notification

      await paymentService.handleSubscriptionCreated(trialSub);

      // Should have trial update query
      const trialCall = query.mock.calls[3];
      expect(trialCall[0]).toContain('trial_used_at');
      expect(trialCall[1]).toContain('sub_created');
    });

    it('should not send notification when no user found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // no user
      query.mockResolvedValueOnce({ rows: [] }); // no org
      query.mockResolvedValueOnce({ rows: [] }); // insert

      await paymentService.handleSubscriptionCreated(subscription);

      // Only 3 calls (user lookup, org lookup, insert) - no notification
      expect(query).toHaveBeenCalledTimes(3);
    });
  });

  // ----------------------------------------------------------------
  // 9. handleSubscriptionCancelled()
  // ----------------------------------------------------------------
  describe('handleSubscriptionCancelled()', () => {
    const subscription = { id: 'sub_cancel', customer: 'cus_200' };

    it('should update status to cancelled and send notification', async () => {
      // Update subscription
      query.mockResolvedValueOnce({ rows: [] });
      // Find user
      query.mockResolvedValueOnce({ rows: [{ id: 'user-2' }] });
      // Notification
      query.mockResolvedValueOnce({ rows: [] });

      await paymentService.handleSubscriptionCancelled(subscription);

      expect(query.mock.calls[0][1]).toEqual(['cancelled', 'sub_cancel']);
      // Notification
      const notifCall = query.mock.calls[2];
      expect(notifCall[1]).toContain('user-2');
      expect(notifCall[1]).toContain('subscription_cancelled');
    });

    it('should skip notification when no user found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // update
      query.mockResolvedValueOnce({ rows: [] }); // no user

      await paymentService.handleSubscriptionCancelled(subscription);

      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  // ----------------------------------------------------------------
  // 10. handleSubscriptionUpdated()
  // ----------------------------------------------------------------
  describe('handleSubscriptionUpdated()', () => {
    it('should update subscription period in database', async () => {
      const subscription = {
        id: 'sub_upd',
        status: 'active',
        current_period_start: 1600000000,
        current_period_end: 1700000000,
      };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handleSubscriptionUpdated(subscription);

      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      expect(call[1]).toContain('active');
      expect(call[1]).toContain('sub_upd');
      expect(call[1][1]).toEqual(new Date(1600000000 * 1000));
      expect(call[1][2]).toEqual(new Date(1700000000 * 1000));
    });
  });

  // ----------------------------------------------------------------
  // 11. handleInvoicePaymentSuccess()
  // ----------------------------------------------------------------
  describe('handleInvoicePaymentSuccess()', () => {
    it('should update subscription and record payment for subscription invoice', async () => {
      const invoice = {
        id: 'inv_pay',
        customer: 'cus_300',
        subscription: 'sub_300',
        amount_paid: 200000,
        currency: 'usd',
        lines: { data: [{ period: { end: 1700000000 } }] },
      };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handleInvoicePaymentSuccess(invoice);

      // First call: update subscription
      expect(query.mock.calls[0][1]).toContain('sub_300');
      // Second call: insert payment
      expect(query.mock.calls[1][1]).toContain('inv_pay');
      expect(query.mock.calls[1][1]).toContain(2000); // amount_paid / 100
    });

    it('should only record payment when no subscription', async () => {
      const invoice = {
        id: 'inv_no_sub',
        customer: 'cus_400',
        subscription: null,
        amount_paid: 50000,
        currency: 'usd',
        lines: { data: [] },
      };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handleInvoicePaymentSuccess(invoice);

      // Only one call: insert payment (no subscription update)
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][1]).toContain('inv_no_sub');
    });
  });

  // ----------------------------------------------------------------
  // 12. handlePaymentSuccess()
  // ----------------------------------------------------------------
  describe('handlePaymentSuccess()', () => {
    it('should update project status, invoice, and send notification', async () => {
      const paymentIntent = {
        id: 'pi_success',
        metadata: { projectId: 'proj-10', clientId: 'user-10' },
      };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handlePaymentSuccess(paymentIntent);

      // Update project status
      expect(query.mock.calls[0][1]).toEqual(['active', 'proj-10']);
      // Update invoice
      expect(query.mock.calls[1][1]).toEqual(['paid', 'pi_success']);
      // Notification
      expect(query.mock.calls[2][1]).toContain('user-10');
      expect(query.mock.calls[2][1]).toContain('payment_success');
    });

    it('should do nothing when projectId is not in metadata', async () => {
      const paymentIntent = { id: 'pi_no_proj', metadata: {} };

      await paymentService.handlePaymentSuccess(paymentIntent);

      expect(query).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // 13. handlePaymentFailed()
  // ----------------------------------------------------------------
  describe('handlePaymentFailed()', () => {
    it('should update invoice to failed and send notification', async () => {
      const paymentIntent = {
        id: 'pi_fail',
        metadata: { clientId: 'user-20' },
      };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handlePaymentFailed(paymentIntent);

      // Update invoice status
      expect(query.mock.calls[0][1]).toEqual(['failed', 'pi_fail']);
      // Notification
      expect(query.mock.calls[1][1]).toContain('user-20');
      expect(query.mock.calls[1][1]).toContain('payment_failed');
    });

    it('should skip notification when no clientId in metadata', async () => {
      const paymentIntent = { id: 'pi_fail_no_client', metadata: {} };
      query.mockResolvedValue({ rows: [] });

      await paymentService.handlePaymentFailed(paymentIntent);

      // Only invoice update, no notification
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // 14. createInvoice()
  // ----------------------------------------------------------------
  describe('createInvoice()', () => {
    it('should generate invoice number and insert into database', async () => {
      // generateInvoiceNumber count query
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // INSERT query
      const mockInvoice = { id: 'inv-new', invoice_number: 'FS-202602-0003' };
      query.mockResolvedValueOnce({ rows: [mockInvoice] });

      const result = await paymentService.createInvoice({
        organizationId: 'org-1',
        clientId: 'client-1',
        projectId: 'proj-1',
        amount: 1500,
        lineItems: [{ description: 'Test Service', amount: 1500, quantity: 1 }],
        stripePaymentIntentId: 'pi_inv',
      });

      expect(result).toEqual(mockInvoice);
      // Verify INSERT params
      const insertCall = query.mock.calls[1];
      expect(insertCall[1][1]).toBe('org-1');
      expect(insertCall[1][4]).toBe(1500);
      expect(insertCall[1][7]).toBe('pi_inv');
    });

    it('should throw on database error', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        paymentService.createInvoice({
          organizationId: 'org-1',
          amount: 500,
          lineItems: [],
        })
      ).rejects.toThrow('Failed to create invoice: Insert failed');
    });
  });

  // ----------------------------------------------------------------
  // 15. generateInvoiceNumber()
  // ----------------------------------------------------------------
  describe('generateInvoiceNumber()', () => {
    it('should generate invoice number in format FS-YYYYMM-XXXX', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await paymentService.generateInvoiceNumber();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      expect(result).toBe(`FS-${year}${month}-0001`);
    });

    it('should increment the sequence number', async () => {
      query.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await paymentService.generateInvoiceNumber();

      expect(result).toMatch(/^FS-\d{6}-0043$/);
    });

    it('should pad the sequence to 4 digits', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await paymentService.generateInvoiceNumber();
      const seq = result.split('-')[2];
      expect(seq).toHaveLength(4);
    });
  });

  // ----------------------------------------------------------------
  // 16. getPaymentMethods()
  // ----------------------------------------------------------------
  describe('getPaymentMethods()', () => {
    it('should list card payment methods for a customer', async () => {
      const mockCards = [
        { id: 'pm_1', type: 'card', card: { brand: 'visa', last4: '4242' } },
        { id: 'pm_2', type: 'card', card: { brand: 'mastercard', last4: '1234' } },
      ];
      mockStripeClient.paymentMethods.list.mockResolvedValue({ data: mockCards });

      const result = await paymentService.getPaymentMethods('cus_pm');

      expect(mockStripeClient.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_pm',
        type: 'card',
      });
      expect(result).toEqual(mockCards);
    });

    it('should throw on Stripe failure', async () => {
      mockStripeClient.paymentMethods.list.mockRejectedValue(new Error('List failed'));

      await expect(paymentService.getPaymentMethods('cus_pm')).rejects.toThrow(
        'Failed to get payment methods: List failed'
      );
    });
  });

  // ----------------------------------------------------------------
  // 17. createSetupIntent()
  // ----------------------------------------------------------------
  describe('createSetupIntent()', () => {
    it('should create a setup intent for the customer', async () => {
      const mockSetupIntent = { id: 'seti_abc', client_secret: 'seti_secret' };
      mockStripeClient.setupIntents.create.mockResolvedValue(mockSetupIntent);

      const result = await paymentService.createSetupIntent('cus_setup');

      expect(mockStripeClient.setupIntents.create).toHaveBeenCalledWith({
        customer: 'cus_setup',
        payment_method_types: ['card'],
      });
      expect(result).toEqual(mockSetupIntent);
    });

    it('should throw on Stripe failure', async () => {
      mockStripeClient.setupIntents.create.mockRejectedValue(new Error('Setup failed'));

      await expect(paymentService.createSetupIntent('cus_setup')).rejects.toThrow(
        'Failed to create setup intent: Setup failed'
      );
    });
  });

  // ----------------------------------------------------------------
  // 18. processRefund()
  // ----------------------------------------------------------------
  describe('processRefund()', () => {
    it('should process a full refund when amount is null', async () => {
      const mockRefund = { id: 're_full', amount: 150000 };
      mockStripeClient.refunds.create.mockResolvedValue(mockRefund);
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.processRefund('pi_refund');

      expect(mockStripeClient.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_refund',
        amount: null,
        reason: 'requested_by_customer',
      });
      expect(query).toHaveBeenCalledWith(
        'UPDATE invoices SET status = $1 WHERE stripe_payment_intent_id = $2',
        ['refunded', 'pi_refund']
      );
      expect(result).toEqual(mockRefund);
    });

    it('should process a partial refund with specific amount', async () => {
      const mockRefund = { id: 're_partial', amount: 50000 };
      mockStripeClient.refunds.create.mockResolvedValue(mockRefund);
      query.mockResolvedValue({ rows: [] });

      const result = await paymentService.processRefund('pi_refund', 50000, 'duplicate');

      expect(mockStripeClient.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_refund',
        amount: 50000,
        reason: 'duplicate',
      });
      expect(result).toEqual(mockRefund);
    });

    it('should update invoice status to refunded', async () => {
      mockStripeClient.refunds.create.mockResolvedValue({ id: 're_upd' });
      query.mockResolvedValue({ rows: [] });

      await paymentService.processRefund('pi_inv_refund');

      expect(query).toHaveBeenCalledWith(
        'UPDATE invoices SET status = $1 WHERE stripe_payment_intent_id = $2',
        ['refunded', 'pi_inv_refund']
      );
    });

    it('should throw on Stripe refund failure', async () => {
      mockStripeClient.refunds.create.mockRejectedValue(new Error('Refund denied'));

      await expect(paymentService.processRefund('pi_fail')).rejects.toThrow(
        'Failed to process refund: Refund denied'
      );
    });
  });

  // ----------------------------------------------------------------
  // Bonus: SERVICE_PRICING export and utility methods
  // ----------------------------------------------------------------
  describe('SERVICE_PRICING export', () => {
    it('should export all four pricing tiers', () => {
      expect(Object.keys(SERVICE_PRICING)).toEqual([
        'foundation',
        'standard',
        'premium',
        'elite',
      ]);
    });
  });

  describe('getServicePricing()', () => {
    it('should return price for valid tier and type', () => {
      expect(paymentService.getServicePricing('foundation', 'show-concept')).toBe(150000);
    });

    it('should return null for invalid tier', () => {
      expect(paymentService.getServicePricing('unknown', 'show-concept')).toBeNull();
    });

    it('should return null for invalid type', () => {
      expect(paymentService.getServicePricing('foundation', 'nonexistent')).toBeNull();
    });
  });

  describe('getAllServicePricing()', () => {
    it('should return the complete pricing object', () => {
      const pricing = paymentService.getAllServicePricing();
      expect(pricing).toBe(SERVICE_PRICING);
    });
  });
});
