/**
 * Payments API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function paymentsApi(service: ApiService) {
  return {
    createCheckoutSession(data: { priceId: string; mode?: string; successUrl?: string; cancelUrl?: string; metadata?: Record<string, string> }) {
      return service.makeRequest(buildApiUrl('/payments/create-checkout-session'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    createPortalSession(data?: { returnUrl?: string }) {
      return service.makeRequest(buildApiUrl('/payments/create-portal-session'), {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      });
    },

    getPricing() {
      return service.makeRequest(buildApiUrl('/payments/pricing'));
    },

    getSubscription() {
      return service.makeRequest(buildApiUrl('/payments/subscription'));
    },

    createPaymentIntent(data: { projectId: string; serviceTier: string; projectType: string; customizations?: Record<string, unknown> }) {
      return service.makeRequest(buildApiUrl('/payments/create-payment-intent'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}
