/**
 * Printing API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  quickPrintSchema,
  QuickPrintInput,
} from '../apiValidation';

export function printingApi(service: ApiService) {
  return {
    quickPrint(input: QuickPrintInput) {
      const validated = validate(quickPrintSchema, input);
      return service.makeRequest(buildApiUrl('/printing/quick-print'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },
  };
}
