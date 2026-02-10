import type { HelpArticle } from './index';

export const billingPayments: HelpArticle = {
  id: 'billing-payments',
  slug: 'billing-payments',
  title: 'Billing & Payments',
  summary: 'Manage your subscription, payment methods, and invoices',
  category: 'Billing',
  categoryId: 'billing',
  keywords: ['billing', 'payment', 'subscription', 'invoice', 'cancel', 'upgrade', 'plan', 'pricing'],
  relatedArticles: ['account-management', 'settings-preferences', 'troubleshooting'],
  lastUpdated: '2025-02-01',
  readingTime: 5,
  content: `
# Billing & Payments

Manage your FluxStudio subscription and payment information.

## Plans & Pricing

### Free Plan
Perfect for individuals:
- Up to 3 projects
- 1 GB storage
- Basic collaboration
- Community support

### Pro Plan ($12/month)
Great for professionals:
- Unlimited projects
- 100 GB storage
- Advanced collaboration
- Priority support
- Custom branding

### Team Plan ($25/user/month)
For growing teams:
- Everything in Pro
- Team management
- Advanced permissions
- Analytics dashboard
- SSO integration

### Enterprise
Custom solutions:
- Unlimited everything
- Custom contracts
- Dedicated support
- On-premises option
- SLA guarantees

## Managing Your Subscription

### Upgrading Your Plan
1. Go to Settings > Billing
2. Click "Upgrade Plan"
3. Choose your new plan
4. Confirm payment
5. Changes apply immediately

**Pro-rated billing:**
- Pay only for remaining time
- Credit from current plan
- Seamless transition

### Downgrading Your Plan
1. Go to Settings > Billing
2. Click "Change Plan"
3. Select a lower tier
4. Acknowledge limitations
5. Changes apply at renewal

**Before downgrading:**
- Check storage limits
- Review feature restrictions
- Export important data
- Notify team members

### Canceling Your Subscription
1. Go to Settings > Billing
2. Click "Cancel Subscription"
3. Choose a reason (helps us improve)
4. Confirm cancellation
5. Access continues until end of period

## Payment Methods

### Adding a Payment Method
1. Go to Settings > Billing
2. Click "Payment Methods"
3. Click "Add Payment Method"
4. Enter card details
5. Verify if required

**Accepted methods:**
- Visa, Mastercard, Amex
- PayPal
- Bank transfer (Enterprise)

### Updating Payment Method
1. Go to Settings > Billing
2. Click "Payment Methods"
3. Click "Edit" on existing method
4. Update details
5. Save changes

### Removing a Payment Method
1. Must have another method on file
2. Click "Remove"
3. Confirm removal
4. Cannot remove if it's the default

## Invoices & Receipts

### Viewing Invoices
1. Go to Settings > Billing
2. Click "Billing History"
3. See all past invoices
4. Filter by date or status

### Downloading Invoices
- Click on any invoice
- Click "Download PDF"
- Invoices include:
  - Invoice number
  - Date and period
  - Itemized charges
  - Payment details
  - Tax information

### Invoice Details
Each invoice shows:
- Plan name and period
- Users (for team plans)
- Add-ons if any
- Subtotal and taxes
- Total paid

## Billing Cycles

### Monthly Billing
- Charged on the same day each month
- Payment due immediately
- Easy to cancel

### Annual Billing
- Pay upfront for the year
- Save up to 20%
- Best value

### Changing Billing Cycle
1. Go to Settings > Billing
2. Click "Change Billing Cycle"
3. Choose Monthly or Annual
4. Confirm the change
5. Pro-rated adjustment applied

## Taxes

### Sales Tax
We collect where required:
- US sales tax by state
- EU VAT
- UK VAT
- Australian GST

### Tax Exemption
If you're tax exempt:
1. Go to Settings > Billing
2. Click "Tax Information"
3. Upload exemption certificate
4. We'll review within 2 business days

### Changing Tax Status
Contact support with:
- Current billing email
- New tax status
- Supporting documentation

## Troubleshooting

### Payment Failed

**Common causes:**
- Insufficient funds
- Expired card
- Bank decline
- Incorrect details

**What to do:**
1. Check your card details
2. Contact your bank
3. Try another payment method
4. Contact support if needed

### Subscription Paused
If payment fails:
- 3-day grace period
- Access reduced after
- Full access restored on payment

### Refunds
We offer refunds if:
- Request within 14 days
- Technical issues prevented use
- Duplicate charge

Request via support with:
- Account email
- Invoice number
- Reason for refund

## FAQ

**Can I get a trial?**
Yes! Start a 14-day Pro trial, no card required.

**What happens when I cancel?**
You keep access until your paid period ends.

**Can I change plans mid-cycle?**
Yes, upgrades are pro-rated. Downgrades apply at renewal.

**Do you offer discounts?**
Education and nonprofit discounts available. Contact support.

## Need Help?

- Billing questions: billing@fluxstudio.art
- General support: support@fluxstudio.art
  `.trim(),
};
