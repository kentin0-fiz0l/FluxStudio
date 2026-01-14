/**
 * @fluxstudio/realtime/client
 *
 * Client-side real-time collaboration with Yjs.
 */

export { FluxRealtimeProvider } from "./FluxRealtimeProvider.js";
export type {
  FluxRealtimeProviderOptions,
  ConnectionStatus,
} from "./FluxRealtimeProvider.js";

export {
  useFluxDocument,
  useFluxPresence,
  useYMap,
  useYArray,
  useYText,
} from "./hooks.js";

export type {
  UseFluxDocumentOptions,
  UseFluxDocumentReturn,
  PresenceState,
} from "./hooks.js";
