# FluxStudio Production Configuration Guide

This guide covers the configuration required for email service and Stripe payment webhooks in production.

## Email Service Configuration

The email service (`lib/email/emailService.js`) supports both SMTP and SendGrid. Configure one of the following options in your DigitalOcean App Platform environment.

### Option 1: SendGrid (Recommended)

```env
SENDGRID_API_KEY=SG.your_api_key_here
SMTP_FROM=noreply@fluxstudio.art
SMTP_FROM_NAME=FluxStudio
FRONTEND_URL=https://fluxstudio.art
```

### Option 2: Generic SMTP

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM=noreply@fluxstudio.art
SMTP_FROM_NAME=FluxStudio
SMTP_SECURE=false
FRONTEND_URL=https://fluxstudio.art
```

### Email Templates

The email service provides the following transactional emails:
- **Verification Email**: Sent on user registration
- **Password Reset Email**: Sent on forgot password request
- **Welcome Email**: Sent after email verification

### Verification

After configuring, verify email is working:
1. Register a new user
2. Check for verification email arrival
3. Click forgot password and verify reset email arrives
4. Complete password reset flow

---

## Stripe Webhook Configuration

The payment system (`routes/payments.js`) requires Stripe webhooks to handle subscription events.

### Step 1: Configure Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL: `https://fluxstudio.art/api/payments/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### Step 2: Add Environment Variable

Add to your DigitalOcean App Platform environment:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

### Step 3: Test Webhooks

Using Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3001/api/payments/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

### Step 4: Verify Production

Check DigitalOcean logs after a real transaction:
```
Stripe webhook processed: payment_intent.succeeded
```

---

## Activities Table Migration

The activities table is required for the activity feed feature. The migration exists at:
`database/migrations/103_activities_table.sql`

### Run Migration in Production

Connect to your production database and run:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'activities'
);

-- If false, run the migration
\i database/migrations/103_activities_table.sql
```

Or use the migration runner:

```bash
cd /path/to/fluxstudio
DATABASE_URL=your_production_url node database/migrations/run-migrations.js
```

---

## Environment Variables Summary

### Required for Email

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key (if using SendGrid) | `SG.xxx` |
| `SMTP_HOST` | SMTP server host (if using SMTP) | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASS` | SMTP password | `your_password` |
| `SMTP_FROM` | From email address | `noreply@fluxstudio.art` |
| `SMTP_FROM_NAME` | From display name | `FluxStudio` |
| `FRONTEND_URL` | Frontend URL for email links | `https://fluxstudio.art` |

### Required for Payments

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxx` |

---

## Troubleshooting

### Email Not Sending

1. Check if `SENDGRID_API_KEY` or SMTP vars are set
2. Check logs for "Email service not configured" warning
3. Verify SendGrid API key has "Mail Send" permission

### Webhooks Failing

1. Check Stripe Dashboard > Webhooks for failed events
2. Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret
3. Ensure the endpoint is receiving raw body (not JSON-parsed)

### Activities Not Showing

1. Verify `activities` table exists in database
2. Check for errors in server logs related to activity queries
3. Ensure `activityLogger` is being imported in route files
