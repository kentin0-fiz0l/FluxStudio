/**
 * Support Routes - Support Ticket Submission API
 *
 * Provides endpoints for:
 * - Submitting support requests
 * - Ticket creation via email
 *
 * FluxStudio User Adoption Roadmap - Phase 4
 */

const express = require('express');
const { optionalAuth } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const { zodValidate } = require('../middleware/zodValidate');
const { submitTicketSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Support');

const router = express.Router();

// Try to load email service
let emailModule = null;
try {
  emailModule = require('../lib/email/emailService');
} catch (error) {
  log.warn('Email service not available for support tickets');
}

// Allowed categories
const VALID_CATEGORIES = ['general', 'billing', 'technical', 'feature', 'account'];

/**
 * POST /api/support/ticket
 * Submit a support request
 */
router.post('/ticket', optionalAuth, validateInput.sanitizeInput, zodValidate(submitTicketSchema), async (req, res) => {
  try {
    const { name, email, category, subject, message } = req.body;
    const userId = req.user?.id || null;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!message || message.trim().length < 20) {
      return res.status(400).json({ error: 'Message must be at least 20 characters' });
    }

    // Validate category
    const validCategory = VALID_CATEGORIES.includes(category) ? category : 'general';

    // Create ticket ID
    const ticketId = `FLX-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    // Build email content
    const emailSubject = `[Support Ticket ${ticketId}] [${validCategory.toUpperCase()}] ${subject}`;
    const emailBody = `
Support Ticket: ${ticketId}
Category: ${validCategory}
Submitted: ${new Date().toISOString()}
${userId ? `User ID: ${userId}` : '(Guest submission)'}

From: ${name}
Email: ${email}

Subject: ${subject}

Message:
${message}

---
This ticket was submitted via the FluxStudio support form.
    `.trim();

    // Send email to support
    if (emailModule) {
      try {
        await emailModule.sendEmail({
          to: process.env.SUPPORT_EMAIL || 'support@fluxstudio.art',
          subject: emailSubject,
          text: emailBody,
          replyTo: email,
        });

        // Send confirmation to user
        await emailModule.sendEmail({
          to: email,
          subject: `We received your support request - ${ticketId}`,
          text: `
Hi ${name},

Thank you for contacting FluxStudio support. We've received your request and will get back to you within 24-48 hours.

Your ticket reference: ${ticketId}

For urgent matters, please reply to this email.

Best regards,
The FluxStudio Team
          `.trim(),
        });
      } catch (emailError) {
        log.error('Error sending support emails', emailError);
        // Continue - we still want to return success if ticket was logged
      }
    }

    // Log ticket submission (in production, you'd save this to database)
    log.info('Ticket submitted', {
      ticketId,
      category: validCategory,
      subject,
      email,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      ticketId,
      message: 'Support request submitted successfully',
    });
  } catch (error) {
    log.error('Support ticket error', error);
    res.status(500).json({ error: 'Failed to submit support request' });
  }
});

/**
 * GET /api/support/categories
 * Get available support categories
 */
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'general', label: 'General Question', description: 'General inquiries about FluxStudio' },
    { value: 'billing', label: 'Billing & Payments', description: 'Questions about invoices, subscriptions, refunds' },
    { value: 'technical', label: 'Technical Issue', description: 'Bugs, errors, or technical problems' },
    { value: 'feature', label: 'Feature Request', description: 'Suggestions for new features' },
    { value: 'account', label: 'Account Issues', description: 'Login problems, account recovery' },
  ];

  res.json({ success: true, categories });
});

module.exports = router;
