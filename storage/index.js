/**
 * Storage Module Entry Point
 *
 * Re-exports the storage adapter singleton from the unified lib/storage module.
 *
 * Usage:
 *   const storage = require('./storage');
 *   await storage.saveFile({ buffer, mimeType, userId });
 */

const storageAdapter = require('../lib/storage');

module.exports = storageAdapter;
