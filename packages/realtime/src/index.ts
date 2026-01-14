/**
 * @fluxstudio/realtime
 *
 * Real-time collaboration layer for FluxStudio using Yjs.
 * Provides both server and client components.
 */

// Re-export from submodules for convenience
export * from "./server/index.js";
export * from "./client/index.js";

// Re-export Yjs for convenience
export * as Y from "yjs";
export * as awarenessProtocol from "y-protocols/awareness";
