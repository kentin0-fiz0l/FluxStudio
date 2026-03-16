/**
 * Standardized API response helpers.
 * Adopt gradually — no breaking changes to existing response shapes.
 */

const success = (res, data, meta = {}) =>
  res.json({ success: true, data, ...meta });

const paginated = (res, data, { total, limit, offset }) =>
  res.json({
    success: true,
    data,
    pagination: { total, limit, offset, hasMore: offset + limit < total }
  });

const error = (res, statusCode, message, code = null) =>
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(code && { code })
  });

module.exports = { success, paginated, error };
