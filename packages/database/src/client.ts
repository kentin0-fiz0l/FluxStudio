/**
 * FluxStudio Prisma Client
 *
 * Singleton PrismaClient instance for use across the application.
 * Handles connection pooling and prevents multiple instances in development.
 */

import { PrismaClient } from "@prisma/client";

// Extend global type to include prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

import type { Prisma } from "@prisma/client";

/**
 * PrismaClient configuration options
 */
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
};

/**
 * Singleton PrismaClient instance
 *
 * In development, we store the client on the global object to prevent
 * creating multiple instances during hot reloading.
 *
 * In production, we create a single instance per process.
 */
export const prisma: PrismaClient =
  globalThis.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

/**
 * Connect to the database
 *
 * Call this at application startup to establish the database connection.
 * Prisma will lazily connect on first query if not called explicitly.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[Database] Connected successfully");
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from the database
 *
 * Call this during graceful shutdown to properly close connections.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log("[Database] Disconnected successfully");
  } catch (error) {
    console.error("[Database] Disconnect failed:", error);
    throw error;
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Transaction helper type
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Execute operations within a transaction
 *
 * @example
 * ```ts
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: { ... } });
 *   const org = await tx.organization.create({ data: { ... } });
 *   return { user, org };
 * });
 * ```
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

export default prisma;
