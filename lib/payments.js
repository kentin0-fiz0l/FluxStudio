const Stripe = require('stripe');
const { query } = require('../database/config');
const { v4: uuidv4 } = require('uuid');

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Service tier pricing (in cents)
const SERVICE_PRICING = {
  foundation: {
    'show-concept': 150000, // $1,500
    'visual-identity': 120000, // $1,200
    'theme-development': 100000, // $1,000
  },
  standard: {
    'storyboarding': 200000, // $2,000
    'uniform-design': 350000, // $3,500
    'props-scenic': 300000, // $3,000
    'backdrop-design': 150000, // $1,500
    'design-consultation': 25000, // $250/hour
    'show-analysis': 150000, // $1,500
  },
  premium: {
    'drill-design': 600000, // $6,000
    'choreography': 450000, // $4,500
    'formation-design': 300000, // $3,000
    'staging-coordination': 500000, // $5,000
    'visual-coaching': 30000, // $300/hour
    'staff-training': 35000, // $350/hour
  },
  elite: {
    'season-package': 1200000, // $12,000
    'monthly-support': 200000, // $2,000/month
    'competition-prep': 400000, // $4,000
    'mid-season-redesign': 350000, // $3,500
  }
};

class PaymentService {
  constructor() {
    this.stripe = stripe;
  }

  // Create customer
  async createCustomer(userData) {
    try {
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        metadata: {
          userId: userData.id,
          userType: userData.userType
        }
      });

      // Update user with Stripe customer ID
      await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userData.id]
      );

      return customer;
    } catch (error) {
      console.error('Create customer error:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  // Create organization customer
  async createOrganizationCustomer(orgData) {
    try {
      const customer = await this.stripe.customers.create({
        email: orgData.billing_email || orgData.contact_email,
        name: orgData.name,
        phone: orgData.contact_phone,
        metadata: {
          organizationId: orgData.id,
          type: 'organization'
        }
      });

      // Update organization with Stripe customer ID
      await query(
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, orgData.id]
      );

      return customer;
    } catch (error) {
      console.error('Create organization customer error:', error);
      throw new Error(`Failed to create organization customer: ${error.message}`);
    }
  }

  // Calculate project pricing
  calculateProjectPrice(projectType, serviceTier, customizations = {}) {
    const basePrice = SERVICE_PRICING[serviceTier]?.[projectType];
    if (!basePrice) {
      throw new Error(`No pricing found for ${serviceTier}/${projectType}`);
    }

    let totalPrice = basePrice;

    // Add customization costs
    if (customizations.rushDelivery) {
      totalPrice += Math.floor(basePrice * 0.5); // 50% rush fee
    }

    if (customizations.additionalRevisions) {
      totalPrice += customizations.additionalRevisions * 15000; // $150 per additional revision
    }

    if (customizations.additionalDeliverables) {
      totalPrice += customizations.additionalDeliverables.length * 25000; // $250 per additional deliverable
    }

    // Ensemble size multiplier
    if (customizations.ensembleSize) {
      if (customizations.ensembleSize > 100) {
        totalPrice += Math.floor(basePrice * 0.25); // 25% for large ensembles
      } else if (customizations.ensembleSize > 200) {
        totalPrice += Math.floor(basePrice * 0.5); // 50% for very large ensembles
      }
    }

    return {
      basePrice,
      customizations: totalPrice - basePrice,
      totalPrice,
      currency: 'usd'
    };
  }

  // Create payment intent for project
  async createProjectPaymentIntent(projectData, paymentOptions = {}) {
    try {
      const pricing = this.calculateProjectPrice(
        projectData.project_type,
        projectData.service_tier,
        paymentOptions.customizations
      );

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: pricing.totalPrice,
        currency: pricing.currency,
        customer: paymentOptions.customerId,
        description: `FluxStudio: ${projectData.name}`,
        metadata: {
          projectId: projectData.id,
          organizationId: projectData.organization_id,
          projectType: projectData.project_type,
          serviceTier: projectData.service_tier
        },
        payment_method_types: ['card'],
        setup_future_usage: paymentOptions.savePaymentMethod ? 'on_session' : undefined
      });

      // Create invoice record
      const invoice = await this.createInvoice({
        organizationId: projectData.organization_id,
        projectId: projectData.id,
        clientId: projectData.client_id,
        amount: pricing.totalPrice / 100, // Convert cents to dollars
        lineItems: [
          {
            description: `${projectData.name} - ${projectData.project_type}`,
            amount: pricing.basePrice / 100,
            quantity: 1
          },
          ...(pricing.customizations > 0 ? [{
            description: 'Customizations and add-ons',
            amount: pricing.customizations / 100,
            quantity: 1
          }] : [])
        ],
        stripePaymentIntentId: paymentIntent.id
      });

      return {
        paymentIntent,
        invoice,
        pricing
      };
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Create subscription for ongoing services
  async createSubscription(customerId, priceId, options = {}) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: options.metadata || {}
      });

      return subscription;
    } catch (error) {
      console.error('Create subscription error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Process webhook events
  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSuccess(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error(`Webhook handling failed: ${error.message}`);
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntent) {
    try {
      const projectId = paymentIntent.metadata.projectId;

      if (projectId) {
        // Update project status to active
        await query(
          'UPDATE projects SET status = $1 WHERE id = $2',
          ['active', projectId]
        );

        // Update invoice status
        await query(
          'UPDATE invoices SET status = $1, paid_at = NOW() WHERE stripe_payment_intent_id = $2',
          ['paid', paymentIntent.id]
        );

        // Create notification for project start
        await this.createNotification({
          userId: paymentIntent.metadata.clientId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: 'Your project payment has been processed and work will begin shortly.',
          data: { projectId, paymentIntentId: paymentIntent.id }
        });
      }
    } catch (error) {
      console.error('Handle payment success error:', error);
    }
  }

  // Handle failed payment
  async handlePaymentFailed(paymentIntent) {
    try {
      // Update invoice status
      await query(
        'UPDATE invoices SET status = $1 WHERE stripe_payment_intent_id = $2',
        ['failed', paymentIntent.id]
      );

      // Create notification for payment failure
      if (paymentIntent.metadata.clientId) {
        await this.createNotification({
          userId: paymentIntent.metadata.clientId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'There was an issue processing your payment. Please try again or contact support.',
          data: { paymentIntentId: paymentIntent.id }
        });
      }
    } catch (error) {
      console.error('Handle payment failed error:', error);
    }
  }

  // Create invoice
  async createInvoice(invoiceData) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber();

      const invoice = await query(`
        INSERT INTO invoices (
          invoice_number, organization_id, client_id, project_id,
          amount, total_amount, line_items, stripe_payment_intent_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        invoiceNumber,
        invoiceData.organizationId,
        invoiceData.clientId,
        invoiceData.projectId,
        invoiceData.amount,
        invoiceData.amount, // For now, no tax
        JSON.stringify(invoiceData.lineItems),
        invoiceData.stripePaymentIntentId
      ]);

      return invoice.rows[0];
    } catch (error) {
      console.error('Create invoice error:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  // Generate unique invoice number
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const countResult = await query(`
      SELECT COUNT(*) FROM invoices
      WHERE invoice_number LIKE $1
    `, [`FS-${year}${month}-%`]);

    const count = parseInt(countResult.rows[0].count) + 1;
    const sequence = String(count).padStart(4, '0');

    return `FS-${year}${month}-${sequence}`;
  }

  // Create notification
  async createNotification(notificationData) {
    try {
      await query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {})
      ]);
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }

  // Get customer payment methods
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  // Create setup intent for saving payment method
  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card']
      });

      return setupIntent;
    } catch (error) {
      console.error('Create setup intent error:', error);
      throw new Error(`Failed to create setup intent: ${error.message}`);
    }
  }

  // Process refund
  async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount, // If null, refunds full amount
        reason: reason
      });

      // Update invoice status
      await query(
        'UPDATE invoices SET status = $1 WHERE stripe_payment_intent_id = $2',
        ['refunded', paymentIntentId]
      );

      return refund;
    } catch (error) {
      console.error('Process refund error:', error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  // Get pricing for service
  getServicePricing(serviceTier, projectType) {
    return SERVICE_PRICING[serviceTier]?.[projectType] || null;
  }

  // Get all service pricing
  getAllServicePricing() {
    return SERVICE_PRICING;
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = {
  paymentService,
  SERVICE_PRICING
};