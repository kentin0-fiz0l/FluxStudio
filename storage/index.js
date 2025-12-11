/**
 * Storage Module Entry Point
 *
 * Exports the storage adapter singleton for use throughout the application.
 *
 * Usage:
 *   const storage = require('./storage');
 *   await storage.saveFile({ buffer, mimeType, userId });
 */

const storageAdapter = require('./storage-adapter');

module.exports = storageAdapter;
