/**
 * Payments API endpoints — with Zod response validation
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  checkoutSessionResponseSchema,
  portalSessionResponseSchema,
  pricingResponseSchema,
  subscriptionResponseSchema,
  type CheckoutSessionResponse,
  type PortalSessionResponse,
  type PricingResponse,
  type SubscriptionResponse,
} from '../apiValidation';

export function paymentsApi(service: ApiService) {
  return {
    createCheckoutSession(data: { priceId: string; mode?: string; successUrl?: string; cancelUrl?: string; metadata?: Record<string, string> }) {
      return service.makeValidatedRequest<CheckoutSessionResponse>(
        buildApiUrl('/payments/create-checkout-session'),
        checkoutSessionResponseSchema,
        { method: 'POST', body: JSON.stringify(data) },
      );
    },

    createPortalSession(data?: { returnUrl?: string }) {
      return service.makeValidatedRequest<PortalSessionResponse>(
        buildApiUrl('/payments/create-portal-session'),
        portalSessionResponseSchema,
        { method: 'POST', body: JSON.stringify(data ?? {}) },
      );
    },

    getPricing() {
      return service.makeValidatedRequest<PricingResponse>(
        buildApiUrl('/payments/pricing'),
        pricingResponseSchema,
      );
    },

    getSubscription() {
      return service.makeValidatedRequest<SubscriptionResponse>(
        buildApiUrl('/payments/subscription'),
        subscriptionResponseSchema,
      );
    },

    createPaymentIntent(data: { projectId: string; serviceTier: string; projectType: string; customizations?: Record<string, unknown> }) {
      return service.makeRequest(buildApiUrl('/payments/create-payment-intent'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}
