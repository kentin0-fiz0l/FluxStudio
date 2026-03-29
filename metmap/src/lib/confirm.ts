/**
 * Imperative Confirm/Prompt Dialog Utilities
 *
 * DOM-based dialogs that can be called from any context (no React provider needed).
 * Styled with Tailwind classes to match the FluxStudio design system.
 */

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface PromptOptions {
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm';
  overlay.style.transition = 'opacity 200ms ease-out';
  overlay.style.opacity = '0';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  return overlay;
}

function removeOverlay(overlay: HTMLDivElement) {
  overlay.style.opacity = '0';
  setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 200);
}

/**
 * Show a styled confirmation dialog. Returns a promise that resolves to true/false.
 *
 * Usage:
 *   if (!(await confirmDialog('Delete this item?'))) return;
 */
export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const {
    title = 'Confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    destructive = false,
  } = options;

  return new Promise((resolve) => {
    const overlay = createOverlay();

    const confirmBtnClass = destructive
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

    overlay.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        <h2 id="confirm-title" class="text-lg font-semibold text-white mb-2">${title}</h2>
        <p id="confirm-desc" class="text-sm text-neutral-300 mb-6 whitespace-pre-wrap">${message}</p>
        <div class="flex justify-end gap-3">
          <button data-action="cancel" class="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-600 text-neutral-300 hover:bg-neutral-800 transition-colors">${cancelText}</button>
          <button data-action="confirm" class="px-4 py-2 text-sm font-medium rounded-lg ${confirmBtnClass} transition-colors">${confirmText}</button>
        </div>
      </div>
    `;

    const cleanup = (result: boolean) => {
      removeOverlay(overlay);
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]')!.addEventListener('click', () => cleanup(false));
    overlay.querySelector('[data-action="confirm"]')!.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', handler); cleanup(false); }
    });

    (overlay.querySelector('[data-action="confirm"]') as HTMLButtonElement).focus();
  });
}

/**
 * Show a styled prompt dialog. Returns a promise that resolves to the input string or null.
 *
 * Usage:
 *   const name = await promptDialog('Enter a name:');
 *   if (name === null) return; // cancelled
 */
export function promptDialog(message: string, options: PromptOptions = {}): Promise<string | null> {
  const {
    title = 'Input',
    placeholder = '',
    defaultValue = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
  } = options;

  return new Promise((resolve) => {
    const overlay = createOverlay();

    overlay.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" role="dialog" aria-modal="true" aria-labelledby="prompt-title" aria-describedby="prompt-desc">
        <h2 id="prompt-title" class="text-lg font-semibold text-white mb-2">${title}</h2>
        <p id="prompt-desc" class="text-sm text-neutral-300 mb-4 whitespace-pre-wrap">${message}</p>
        <input data-input type="text" value="${defaultValue}" placeholder="${placeholder}" class="w-full px-3 py-2 mb-6 text-sm bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div class="flex justify-end gap-3">
          <button data-action="cancel" class="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-600 text-neutral-300 hover:bg-neutral-800 transition-colors">${cancelText}</button>
          <button data-action="confirm" class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">${confirmText}</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('[data-input]') as HTMLInputElement;

    const cleanup = (result: string | null) => {
      removeOverlay(overlay);
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]')!.addEventListener('click', () => cleanup(null));
    overlay.querySelector('[data-action="confirm"]')!.addEventListener('click', () => cleanup(input.value));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cleanup(input.value); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', handler); cleanup(null); }
    });

    input.focus();
    input.select();
  });
}
