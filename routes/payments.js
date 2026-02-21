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

// Store auth helper for protected routes
let authHelper = null;

// Initialize auth helper (called by server-unified.js)
router.setAuthHelper = (helper) => {
  authHelper = helper;
};

// Lazy authentication middleware
const requireAuth = (req, res, next) => {
  if (!authHelper || !authHelper.authenticateToken) {
    return res.status(500).json({ message: 'Auth system not initialized' });
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
      console.error('Webhook error: Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // The body should be the raw buffer for signature verification
    const payload = req.body;

    const result = await paymentService.handleWebhook(payload, signature);

    console.log(`Stripe webhook processed: ${result.type}`);
    res.json(result);
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    // Return 400 for invalid webhooks so Stripe doesn't retry
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create Checkout Session
 * POST /api/payments/create-checkout-session
 */
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { priceId, mode = 'subscription', successUrl, cancelUrl, metadata = {} } = req.body;
    const userId = req.user.id;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    const userResult = await query(
      'SELECT stripe_customer_id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
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
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Create Customer Portal Session
 * POST /api/payments/create-portal-session
 */
router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { returnUrl } = req.body;

    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await paymentService.stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://fluxstudio.art'}/settings/billing`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
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
    console.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

/**
 * Get User Subscription Status
 * GET /api/payments/subscription
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check for active subscription
    const subResult = await query(`
      SELECT s.*, u.stripe_customer_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subResult.rows.length === 0) {
      // Check if user has already used a free trial
      const trialCheck = await query(
        `SELECT trial_used_at FROM subscriptions
         WHERE user_id = $1 AND trial_used_at IS NOT NULL
         LIMIT 1`,
        [userId]
      );

      return res.json({
        hasSubscription: false,
        subscription: null,
        canTrial: trialCheck.rows.length === 0
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
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
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
      return res.status(400).json({ error: 'Project ID, service tier, and project type are required' });
    }

    // Get user's Stripe customer ID
    const userResult = await query(
      'SELECT stripe_customer_id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
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
      return res.status(404).json({ error: 'Project not found' });
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
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

module.exports = router;
