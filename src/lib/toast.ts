/**
 * Simple Toast Notification Utility
 *
 * Provides basic toast notifications without heavy dependencies.
 * Can be replaced with a full-featured library like react-hot-toast later.
 */

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION = 'top-right';
const MAX_VISIBLE_TOASTS = 5;

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
};

const typeStyles = {
  success: 'bg-success-600 text-white',
  error: 'bg-error-600 text-white',
  info: 'bg-info-600 text-white',
  warning: 'bg-warning-600 text-white',
};

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

function createToastContainer(position: string) {
  const existingContainer = document.getElementById('toast-container');
  if (existingContainer) return existingContainer;

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = `fixed ${positionClasses[position as keyof typeof positionClasses]} z-[9999] flex flex-col gap-2 pointer-events-none`;
  document.body.appendChild(container);
  return container;
}

function showToast(message: string, type: ToastType, options: ToastOptions = {}) {
  const duration = options.duration ?? DEFAULT_DURATION;
  const position = options.position ?? DEFAULT_POSITION;

  const container = createToastContainer(position);

  // Enforce max visible toasts — remove the oldest if at limit
  while (container.children.length >= MAX_VISIBLE_TOASTS) {
    const oldest = container.firstElementChild;
    if (oldest) container.removeChild(oldest);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg pointer-events-auto max-w-md overflow-hidden`;
  toastEl.style.transform = 'translateX(100%)';
  toastEl.style.opacity = '0';
  toastEl.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';

  toastEl.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-lg font-semibold flex-shrink-0">${typeIcons[type]}</span>
      <span class="flex-1 text-sm font-medium">${message}</span>
      <button class="ml-2 text-white/80 hover:text-white transition-colors flex-shrink-0" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    ${duration > 0 ? `<div class="mt-2 h-0.5 bg-white/30 rounded-full overflow-hidden"><div class="h-full bg-white/70 rounded-full" style="width:100%;transition:width ${duration}ms linear"></div></div>` : ''}
  `;

  const closeButton = toastEl.querySelector('button');
  const removeToast = () => {
    toastEl.style.transform = 'translateX(100%)';
    toastEl.style.opacity = '0';
    setTimeout(() => {
      if (toastEl.parentNode === container) {
        container.removeChild(toastEl);
      }
      if (container.children.length === 0 && container.parentNode) {
        document.body.removeChild(container);
      }
    }, 300);
  };

  closeButton?.addEventListener('click', removeToast);

  container.appendChild(toastEl);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toastEl.style.transform = 'translateX(0)';
    toastEl.style.opacity = '1';

    // Start progress bar countdown
    if (duration > 0) {
      const progressBar = toastEl.querySelector<HTMLDivElement>('.h-full');
      if (progressBar) {
        requestAnimationFrame(() => { progressBar.style.width = '0%'; });
      }
    }
  });

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

// ============================================================================
// Persistent connection status toast
// ============================================================================

let connectionToastEl: HTMLDivElement | null = null;

function showConnectionToast(message: string, type: 'offline' | 'reconnecting' | 'reconnected') {
  const container = createToastContainer(DEFAULT_POSITION);

  // Remove existing connection toast if any
  if (connectionToastEl && connectionToastEl.parentNode) {
    connectionToastEl.parentNode.removeChild(connectionToastEl);
  }

  const styles: Record<string, string> = {
    offline: 'bg-neutral-800 text-white',
    reconnecting: 'bg-yellow-600 text-white',
    reconnected: 'bg-success-600 text-white',
  };
  const icons: Record<string, string> = {
    offline: '⚡',
    reconnecting: '🔄',
    reconnected: '✓',
  };

  const toastEl = document.createElement('div');
  toastEl.className = `${styles[type]} px-4 py-3 rounded-lg shadow-lg pointer-events-auto max-w-md overflow-hidden`;
  toastEl.style.transform = 'translateX(100%)';
  toastEl.style.opacity = '0';
  toastEl.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';

  const retryHtml = type === 'offline'
    ? `<button class="ml-3 px-2 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded transition-colors" data-retry>Retry</button>`
    : '';

  toastEl.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-lg font-semibold flex-shrink-0">${icons[type]}</span>
      <span class="flex-1 text-sm font-medium">${message}</span>
      ${retryHtml}
    </div>
  `;

  connectionToastEl = toastEl;
  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.style.transform = 'translateX(0)';
    toastEl.style.opacity = '1';
  });

  // Auto-dismiss reconnected toast after 3 seconds
  if (type === 'reconnected') {
    setTimeout(() => {
      if (connectionToastEl === toastEl) {
        toastEl.style.transform = 'translateX(100%)';
        toastEl.style.opacity = '0';
        setTimeout(() => {
          if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
          if (connectionToastEl === toastEl) connectionToastEl = null;
          if (container.children.length === 0 && container.parentNode) {
            document.body.removeChild(container);
          }
        }, 300);
      }
    }, 3000);
  }

  return toastEl;
}

function dismissConnectionToast() {
  if (connectionToastEl && connectionToastEl.parentNode) {
    const el = connectionToastEl;
    el.style.transform = 'translateX(100%)';
    el.style.opacity = '0';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
    connectionToastEl = null;
  }
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),

  // Connection state toasts
  offline: (message = 'Connection lost. Working offline.') => showConnectionToast(message, 'offline'),
  reconnecting: (message = 'Reconnecting...') => showConnectionToast(message, 'reconnecting'),
  reconnected: (message = 'Connection restored') => showConnectionToast(message, 'reconnected'),
  dismissConnection: dismissConnectionToast,
};
