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

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION = 'top-right';

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

  const toast = document.createElement('div');
  toast.className = `${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto transform transition-all duration-300 translate-y-0 opacity-100 max-w-md`;

  toast.innerHTML = `
    <span class="text-lg font-semibold">${typeIcons[type]}</span>
    <span class="flex-1 text-sm font-medium">${message}</span>
    <button class="ml-2 text-white/80 hover:text-white transition-colors" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  const closeButton = toast.querySelector('button');
  const removeToast = () => {
    toast.style.transform = 'translateY(-10px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      container.removeChild(toast);
      if (container.children.length === 0) {
        document.body.removeChild(container);
      }
    }, 300);
  };

  closeButton?.addEventListener('click', removeToast);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
};
