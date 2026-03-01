/**
 * Composed API Service - re-exports split domain modules as a unified API
 */

import { ApiService } from './base';
import { authApi } from './auth';
import { organizationsApi } from './organizations';
import { projectsApi } from './projects';
import { messagesApi } from './messages';
import { printingApi } from './printing';
import { browserApi } from './browser';
import { filesApi } from './files';
import { formationsApi } from './formations';
import { teamsApi } from './teams';
import { aiApi } from './ai';
import { connectorsApi } from './connectors';

export type { ApiResponse, ApiError, UserSettings } from './base';
export { ApiService } from './base';

const baseService = new ApiService();

export const apiService = Object.assign(baseService, {
  ...authApi(baseService),
  ...organizationsApi(baseService),
  ...projectsApi(baseService),
  ...messagesApi(baseService),
  ...printingApi(baseService),
  ...browserApi(baseService),
  ...filesApi(baseService),
  ...formationsApi(baseService),
  ...teamsApi(baseService),
  ...aiApi(baseService),
  ...connectorsApi(baseService),
});

export default apiService;
