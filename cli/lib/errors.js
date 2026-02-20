import { error } from './output.js';

export function handleError(err) {
  if (err.status === 401) {
    error('Authentication required. Run: flux login');
  } else if (err.status === 403) {
    error('Permission denied: ' + err.message);
  } else if (err.status === 404) {
    error('Not found: ' + err.message);
  } else if (err.code === 'ECONNREFUSED') {
    error('Cannot connect to server. Is FluxStudio running?');
  } else if (err.code === 'ENOTFOUND') {
    error('Server not found. Check your --server URL or config.');
  } else {
    error(err.message || 'An unexpected error occurred');
  }
  process.exit(1);
}
