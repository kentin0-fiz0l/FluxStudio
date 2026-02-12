/**
 * Composed API Service - re-exports split domain modules as a unified API
 */

import { ApiService } from './base';
import { authApi } from './auth';
import { organizationsApi } from './organizations';
import { projectsApi } from './projects';
import { messagesApi } from './messages';
import { printingApi } from './printing';

export type { ApiResponse, ApiError, UserSettings } from './base';
export { ApiService } from './base';

const baseService = new ApiService();

export const apiService = Object.assign(baseService, {
  ...authApi(baseService),
  ...organizationsApi(baseService),
  ...projectsApi(baseService),
  ...messagesApi(baseService),
  ...printingApi(baseService),
});

export default apiService;
