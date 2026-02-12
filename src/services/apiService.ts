/**
 * FluxStudio API Service — backwards-compatible re-export
 * The implementation has been split into domain modules under ./api/
 */

export { apiService, ApiService } from './api';
export type { ApiResponse, ApiError, UserSettings } from './api';
export { default } from './api';
