/**
 * Pagination Middleware for FluxStudio
 *
 * Parses `limit`, `offset`, and `page` query parameters and attaches
 * a normalised `req.pagination` object to every request.
 *
 * Defaults:
 *   - limit: 20  (max 100)
 *   - offset: 0
 *   - page: 1
 *
 * Invalid or out-of-range values silently fall back to defaults.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;

/**
 * Parse a query-string value into a positive integer, or return the fallback.
 * @param {*} raw - The raw query string value
 * @param {number} fallback - Value returned when parsing fails
 * @returns {number}
 */
function toPositiveInt(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return fallback;
  }
  return parsed;
}

/**
 * Pagination middleware factory
 * @param {Object} [options]
 * @param {number} [options.defaultLimit=20]  - Default page size
 * @param {number} [options.maxLimit=100]     - Maximum allowed page size
 * @returns {Function} Express middleware
 */
function pagination(options = {}) {
  const {
    defaultLimit = DEFAULT_LIMIT,
    maxLimit = MAX_LIMIT,
  } = options;

  return (req, _res, next) => {
    const rawLimit = toPositiveInt(req.query.limit, defaultLimit);
    const limit = Math.min(rawLimit, maxLimit) || defaultLimit;

    const page = toPositiveInt(req.query.page, DEFAULT_PAGE) || DEFAULT_PAGE;

    // If an explicit offset is provided, use it; otherwise derive from page
    let offset;
    if (req.query.offset !== undefined && req.query.offset !== '') {
      offset = toPositiveInt(req.query.offset, 0);
    } else {
      offset = (page - 1) * limit;
    }

    req.pagination = { limit, offset, page };
    next();
  };
}

module.exports = pagination;
