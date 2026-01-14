/**
 * @fluxstudio/database
 *
 * Database layer for FluxStudio using Prisma ORM.
 * Provides type-safe database access and utilities.
 */

// Re-export Prisma client and utilities
export {
  prisma,
  connectDatabase,
  disconnectDatabase,
  healthCheck,
  withTransaction,
  type TransactionClient,
} from "./client.js";

// Re-export all Prisma types for convenience
export * from "@prisma/client";
