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
import { channelsApi } from './channels';
import { connectorsApi } from './connectors';
import { designBoardsApi } from './design-boards';
import { filesApi } from './files';
import { formationsApi } from './formations';
import { teamsApi } from './teams';
import { aiApi } from './ai';
import { notificationsApi } from './notifications';
import { analyticsApi } from './analytics';
import { paymentsApi } from './payments';
import { searchApi } from './search';
import { sessionsApi } from './sessions';
import { assetsApi } from './assets';
import { documentsApi } from './documents';
import { accountApi } from './account';
import { mediaApi } from './media';
import { pluginsApi } from './plugins';
import { templatesApi } from './templates';
import { supportApi } from './support';
import { usersApi } from './users';

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
  ...channelsApi(baseService),
  ...connectorsApi(baseService),
  ...designBoardsApi(baseService),
  ...filesApi(baseService),
  ...formationsApi(baseService),
  ...teamsApi(baseService),
  ...aiApi(baseService),
  ...notificationsApi(baseService),
  ...analyticsApi(baseService),
  ...paymentsApi(baseService),
  ...searchApi(baseService),
  ...sessionsApi(baseService),
  ...assetsApi(baseService),
  ...documentsApi(baseService),
  ...accountApi(baseService),
  ...mediaApi(baseService),
  ...pluginsApi(baseService),
  ...templatesApi(baseService),
  ...supportApi(baseService),
  ...usersApi(baseService),
});

export default apiService;
