/**
 * Payment Routes
 * FluxStudio User Adoption Roadmap - Phase 2
 *
 * Routes:
 * - POST /api/payments/webhooks/stripe - Stripe webhook endpoint
 * - POST /api/payments/create-checkout-session - Create checkout session
 * - POST /api/payments/create-portal-session - Customer billing portal
 * - GET  /api/payments/pricing - Get service pricing
 * - GET  /api/payments/subscription - Get user subscription status
 */

const express = require('express');
const router = express.Router();
const { paymentService, SERVICE_PRICING } = require('../lib/payments');
const { query } = require('../database/config');
const { zodValidate } = require('../middleware/zodValidate');
const { createCheckoutSessionSchema, createPortalSessionSchema } = require('../lib/schemas/payments');
const { createLogger } = require('../lib/logger');
const log = createLogger('Payments');
const { ingestEvent } = require('../lib/analytics/funnelTracker');

// Store auth helper for protected routes
let authHelper = null;

// Initialize auth helper (called by server-unified.js)
router.setAuthHelper = (helper) => {
  authHelper = helper;
};

// Lazy authentication middleware
const requireAuth = (req, res, next) => {
  if (!authHelper || !authHelper.authenticateToken) {
    return res.status(500).json({ success: false, error: 'Auth system not initialized', code: 'AUTH_NOT_INITIALIZED' });
  }
  return authHelper.authenticateToken(req, res, next);
};

/**
 * Stripe Webhook Endpoint
 * POST /api/payments/webhooks/stripe
 *
 * IMPORTANT: This endpoint must receive raw body, not JSON parsed
 * Configure express.raw() middleware BEFORE this route in server-unified.js
 */
router.post('/webhooks/stripe', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      log.error('Webhook error: Missing stripe-signature header');
      return res.status(400).json({ success: false, error: 'Missing stripe-signature header', code: 'PAYMENT_MISSING_SIGNATURE' });
    }

    // The body should be the raw buffer for signature verification
    const payload = req.body;

    const result = await paymentService.handleWebhook(payload, signature);

    log.info('Stripe webhook processed', { type: result.type });
    // Always return 200 after signature verification passes
    // (even if event processing had errors, retrying won't help)
    res.status(200).json(result);
  } catch (error) {
    log.error('Webhook processing error', error);
    // Return 400 for signature verification failures so Stripe retries with correct signature
    // Return 400 for missing config so we don't silently swallow events
    res.status(400).json({ success: false, error: 'Webhook verification failed', code: 'PAYMENT_WEBHOOK_ERROR' });
  }
});

/**
 * Create Checkout Session
 * POST /api/payments/create-checkout-session
 */
router.post('/create-checkout-session', requireAuth, zodValidate(createCheckoutSessionSchema), async (req, res) => {
  try {
    const { priceId, mode = 'subscription', successUrl, cancelUrl, metadata = {} } = req.body;
    const userId = req.user.id;

    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Price ID is required', code: 'PAYMENT_MISSING_PRICE_ID' });
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    const userResult = await query(
      'SELECT stripe_customer_id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'PAYMENT_USER_NOT_FOUND' });
    }

    const user = userResult.rows[0];

    if (user.stripe_customer_id) {
      stripeCustomerId = user.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await paymentService.createCustomer({
        id: userId,
        email: user.email,
        name: user.name
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await paymentService.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: mode, // 'subscription' or 'payment'
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.FRONTEND_URL || 'https://fluxstudio.art'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'https://fluxstudio.art'}/checkout/cancel`,
      metadata: {
        userId,
        ...metadata
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    log.error('Create checkout session error', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session', code: 'PAYMENT_CHECKOUT_ERROR' });
  }
});

/**
 * Create Customer Portal Session
 * POST /api/payments/create-portal-session
 */
router.post('/create-portal-session', requireAuth, zodValidate(createPortalSessionSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { returnUrl } = req.body;

    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(400).json({ success: false, error: 'No billing account found', code: 'PAYMENT_NO_BILLING_ACCOUNT' });
    }

    const session = await paymentService.stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://fluxstudio.art'}/settings/billing`
    });

    res.json({ url: session.url });
  } catch (error) {
    log.error('Create portal session error', error);
    res.status(500).json({ success: false, error: 'Failed to create billing portal session', code: 'PAYMENT_PORTAL_ERROR' });
  }
});

/**
 * Get Service Pricing
 * GET /api/payments/pricing
 */
router.get('/pricing', (_req, res) => {
  try {
    // Format pricing for frontend
    const formattedPricing = {};

    for (const [tier, services] of Object.entries(SERVICE_PRICING)) {
      formattedPricing[tier] = {};
      for (const [service, priceInCents] of Object.entries(services)) {
        formattedPricing[tier][service] = {
          amount: priceInCents,
          formatted: `$${(priceInCents / 100).toLocaleString()}`,
          currency: 'usd'
        };
      }
    }

    res.json({ pricing: formattedPricing });
  } catch (error) {
    log.error('Get pricing error', error);
    res.status(500).json({ success: false, error: 'Failed to get pricing', code: 'PAYMENT_PRICING_ERROR' });
  }
});

/**
 * Get User Subscription Status
 * GET /api/payments/subscription
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check for active trial first
    const trialResult = await query(
      'SELECT plan_id, trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

    const userRow = trialResult.rows[0];
    const hasActiveTrial = userRow?.trial_ends_at && new Date(userRow.trial_ends_at) > new Date();

    // Check for active subscription
    const subResult = await query(`
      SELECT s.*, u.stripe_customer_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subResult.rows.length === 0 && !hasActiveTrial) {
      // Check if user has already used a free trial
      const canTrial = !userRow?.trial_ends_at;

      return res.json({
        hasSubscription: false,
        subscription: null,
        canTrial,
      });
    }

    // Return trial info if on active trial
    if (hasActiveTrial && subResult.rows.length === 0) {
      const daysRemaining = Math.ceil((new Date(userRow.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
      return res.json({
        hasSubscription: true,
        subscription: {
          status: 'trialing',
          plan: 'pro',
          trialEndsAt: userRow.trial_ends_at,
          daysRemaining,
        },
        canTrial: false,
      });
    }

    const subscription = subResult.rows[0];

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.stripe_subscription_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelledAt: subscription.cancelled_at
      }
    });
  } catch (error) {
    log.error('Get subscription error', error);
    res.status(500).json({ success: false, error: 'Failed to get subscription status', code: 'PAYMENT_SUBSCRIPTION_ERROR' });
  }
});

/**
 * Create Payment Intent for Project
 * POST /api/payments/create-payment-intent
 */
router.post('/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { projectId, serviceTier, projectType, customizations = {} } = req.body;
    const userId = req.user.id;

    if (!projectId || !serviceTier || !projectType) {
      return res.status(400).json({ success: false, error: 'Project ID, service tier, and project type are required', code: 'PAYMENT_MISSING_FIELDS' });
    }

    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'PAYMENT_USER_NOT_FOUND' });
    }

    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;

    // Create customer if needed
    if (!customerId) {
      const customer = await paymentService.createCustomer({
        id: userId,
        email: user.email,
        name: user.name
      });
      customerId = customer.id;
    }

    // Get project details
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found', code: 'PAYMENT_PROJECT_NOT_FOUND' });
    }

    const project = projectResult.rows[0];

    // Create payment intent
    const result = await paymentService.createProjectPaymentIntent(
      {
        id: projectId,
        name: project.name,
        organization_id: project.organization_id,
        client_id: userId,
        project_type: projectType,
        service_tier: serviceTier
      },
      {
        customerId,
        customizations
      }
    );

    res.json({
      clientSecret: result.paymentIntent.client_secret,
      paymentIntentId: result.paymentIntent.id,
      pricing: result.pricing,
      invoice: result.invoice
    });
  } catch (error) {
    log.error('Create payment intent error', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create payment intent', code: 'PAYMENT_INTENT_ERROR' });
  }
});

/**
 * Start 14-Day Pro Trial
 * POST /api/payments/start-trial
 *
 * No credit card required. Server-managed trial.
 * Sets plan_id = 'pro' and trial_ends_at = NOW() + 14 days.
 */
router.post('/start-trial', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already used a trial
    const userResult = await query(
      'SELECT plan_id, trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'PAYMENT_USER_NOT_FOUND' });
    }

    const user = userResult.rows[0];

    // Don't allow trial if user already has a paid plan
    if (user.plan_id === 'pro' || user.plan_id === 'team') {
      return res.status(400).json({ success: false, error: 'You already have an active subscription', code: 'PAYMENT_ALREADY_SUBSCRIBED' });
    }

    // Don't allow trial if user already had one
    if (user.trial_ends_at) {
      return res.status(400).json({ success: false, error: 'You have already used your free trial', code: 'PAYMENT_TRIAL_USED' });
    }

    // Also check subscriptions table for previous trial usage
    const trialCheck = await query(
      'SELECT trial_used_at FROM subscriptions WHERE user_id = $1 AND trial_used_at IS NOT NULL LIMIT 1',
      [userId]
    );

    if (trialCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You have already used your free trial', code: 'PAYMENT_TRIAL_USED' });
    }

    // Set trial: 14 days from now
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET plan_id = $1, trial_ends_at = $2 WHERE id = $3',
      ['pro', trialEndsAt.toISOString(), userId]
    );

    // Create subscription record for tracking
    try {
      await query(
        `INSERT INTO subscriptions (user_id, plan_id, status, trial_used_at, current_period_end, created_at)
         VALUES ($1, (SELECT id FROM subscription_plans WHERE slug = 'pro' LIMIT 1), 'trialing', NOW(), $2, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, trialEndsAt.toISOString()]
      );
    } catch {
      // subscription_plans table may not exist; trial still works via users.trial_ends_at
    }

    // Send trial-started email (non-blocking)
    try {
      const { emailService } = require('../lib/email/emailService');
      const userInfo = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
      if (userInfo.rows.length > 0) {
        emailService.sendTrialStartedEmail(userInfo.rows[0].email, userInfo.rows[0].name || 'there').catch(() => {});
      }
    } catch {
      // Email service may not be available
    }

    // Phase 5: Track trial_started funnel event server-side
    ingestEvent(userId, 'trial_started', {
      source: 'api',
    }, { ipAddress: req.ip, userAgent: req.get('user-agent') }).catch(() => {});

    log.info('Trial started', { userId, trialEndsAt: trialEndsAt.toISOString() });

    res.json({
      success: true,
      trial: {
        plan: 'pro',
        trialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: 14,
      },
    });
  } catch (error) {
    log.error('Start trial error', error);
    res.status(500).json({ success: false, error: 'Failed to start trial', code: 'PAYMENT_TRIAL_ERROR' });
  }
});

module.exports = router;
