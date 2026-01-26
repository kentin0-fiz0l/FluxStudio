/**
 * Accessibility Utilities Tests
 * @file src/utils/__tests__/accessibility.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  announceToScreenReader,
  createFocusTrap,
  generateUniqueId,
  isElementFocusable,
  getFocusableElements,
  ariaHelpers,
  keyboardHelpers,
  checkColorContrast,
  getSkipLinkProps,
  prefersReducedMotion,
  prefersHighContrast,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('announceToScreenReader', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      // Clean up any remaining elements
      document.body.innerHTML = '';
    });

    it('should create a live region with polite priority by default', () => {
      announceToScreenReader('Test announcement');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should create a live region with assertive priority when specified', () => {
      announceToScreenReader('Urgent announcement', 'assertive');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should set message content after delay', () => {
      announceToScreenReader('Test message');

      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion?.textContent).toBe('');

      vi.advanceTimersByTime(100);
      expect(liveRegion?.textContent).toBe('Test message');
    });

    it('should remove live region after announcement', () => {
      announceToScreenReader('Test message');

      vi.advanceTimersByTime(100);
      expect(document.querySelector('[role="status"]')).toBeTruthy();

      vi.advanceTimersByTime(1000);
      expect(document.querySelector('[role="status"]')).toBeFalsy();
    });

    it('should have sr-only styling for visual hiding', () => {
      announceToScreenReader('Hidden visually');

      const liveRegion = document.querySelector('[role="status"]') as HTMLElement;
      expect(liveRegion?.style.position).toBe('absolute');
      expect(liveRegion?.style.width).toBe('1px');
      expect(liveRegion?.style.height).toBe('1px');
    });
  });

  describe('createFocusTrap', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button id="btn1">First</button>
        <input id="input1" type="text" />
        <a id="link1" href="#">Link</a>
        <button id="btn2">Last</button>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should return activate and deactivate functions', () => {
      const trap = createFocusTrap(container);

      expect(trap.activate).toBeDefined();
      expect(trap.deactivate).toBeDefined();
      expect(typeof trap.activate).toBe('function');
      expect(typeof trap.deactivate).toBe('function');
    });

    it('should focus first focusable element on activate', () => {
      const trap = createFocusTrap(container);
      trap.activate();

      expect(document.activeElement?.id).toBe('btn1');
    });

    it('should restore focus on deactivate', () => {
      const outsideButton = document.createElement('button');
      outsideButton.id = 'outside';
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      const trap = createFocusTrap(container);
      trap.activate();
      expect(document.activeElement?.id).toBe('btn1');

      trap.deactivate();
      expect(document.activeElement?.id).toBe('outside');
    });

    it('should trap Tab key to cycle through elements', () => {
      const trap = createFocusTrap(container);
      trap.activate();

      const lastButton = container.querySelector('#btn2') as HTMLElement;
      lastButton.focus();

      // Simulate Tab on last element
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      // The trap should prevent default and cycle focus
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should trap Shift+Tab to cycle backwards', () => {
      const trap = createFocusTrap(container);
      trap.activate();

      // Focus is on first element after activate
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();

      expect(id1).not.toBe(id2);
    });

    it('should use default prefix', () => {
      const id = generateUniqueId();
      expect(id).toMatch(/^flux-/);
    });

    it('should use custom prefix', () => {
      const id = generateUniqueId('modal');
      expect(id).toMatch(/^modal-/);
    });

    it('should include timestamp for additional uniqueness', () => {
      const id = generateUniqueId();
      // ID format: prefix-counter-timestamp
      const parts = id.split('-');
      expect(parts.length).toBe(3);
    });
  });

  describe('isElementFocusable', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should return false for elements with tabindex=-1', () => {
      const element = document.createElement('button');
      element.tabIndex = -1;
      document.body.appendChild(element);

      expect(isElementFocusable(element)).toBe(false);
    });

    it('should return false for disabled elements', () => {
      const element = document.createElement('button');
      element.disabled = true;
      document.body.appendChild(element);

      expect(isElementFocusable(element)).toBe(false);
    });

    it('should return false for aria-hidden elements', () => {
      const element = document.createElement('button');
      element.setAttribute('aria-hidden', 'true');
      document.body.appendChild(element);

      expect(isElementFocusable(element)).toBe(false);
    });

    it('should return true for visible, enabled buttons', () => {
      const element = document.createElement('button');
      element.style.width = '100px';
      element.style.height = '40px';
      document.body.appendChild(element);

      expect(isElementFocusable(element)).toBe(true);
    });
  });

  describe('getFocusableElements', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should find buttons', () => {
      container.innerHTML = '<button>Click me</button>';
      const button = container.querySelector('button') as HTMLElement;
      button.style.width = '100px';
      button.style.height = '40px';

      const focusable = getFocusableElements(container);
      expect(focusable).toContain(button);
    });

    it('should find links with href', () => {
      container.innerHTML = '<a href="#">Link</a>';
      const link = container.querySelector('a') as HTMLElement;
      link.style.width = '100px';
      link.style.height = '40px';

      const focusable = getFocusableElements(container);
      expect(focusable).toContain(link);
    });

    it('should find inputs', () => {
      container.innerHTML = '<input type="text" />';
      const input = container.querySelector('input') as HTMLElement;
      input.style.width = '100px';
      input.style.height = '40px';

      const focusable = getFocusableElements(container);
      expect(focusable).toContain(input);
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = '<button disabled>Disabled</button>';
      const focusable = getFocusableElements(container);
      expect(focusable.length).toBe(0);
    });
  });

  describe('ariaHelpers', () => {
    describe('labeledBy', () => {
      it('should return proper aria-labelledby structure', () => {
        const result = ariaHelpers.labeledBy('dialog-1', ['title-1', 'subtitle-1']);

        expect(result).toEqual({
          id: 'dialog-1',
          'aria-labelledby': 'title-1 subtitle-1',
        });
      });
    });

    describe('describedBy', () => {
      it('should return proper aria-describedby structure', () => {
        const result = ariaHelpers.describedBy('input-1', ['hint-1', 'error-1']);

        expect(result).toEqual({
          id: 'input-1',
          'aria-describedby': 'hint-1 error-1',
        });
      });
    });

    describe('liveRegion', () => {
      it('should return polite live region props by default', () => {
        const result = ariaHelpers.liveRegion();

        expect(result).toEqual({
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        });
      });

      it('should return assertive live region props when specified', () => {
        const result = ariaHelpers.liveRegion('assertive');

        expect(result['aria-live']).toBe('assertive');
      });
    });

    describe('expandable', () => {
      it('should return expanded state props', () => {
        const result = ariaHelpers.expandable(true, 'content-1');

        expect(result).toEqual({
          'aria-expanded': true,
          'aria-controls': 'content-1',
        });
      });

      it('should return collapsed state props', () => {
        const result = ariaHelpers.expandable(false, 'content-1');

        expect(result['aria-expanded']).toBe(false);
      });
    });

    describe('selectable', () => {
      it('should return selected state props', () => {
        expect(ariaHelpers.selectable(true)).toEqual({ 'aria-selected': true });
        expect(ariaHelpers.selectable(false)).toEqual({ 'aria-selected': false });
      });
    });

    describe('loading', () => {
      it('should return loading state props', () => {
        const loading = ariaHelpers.loading(true);
        expect(loading['aria-busy']).toBe(true);
        expect(loading['aria-label']).toBe('Loading...');
      });

      it('should return not loading state props', () => {
        const notLoading = ariaHelpers.loading(false);
        expect(notLoading['aria-busy']).toBe(false);
        expect(notLoading['aria-label']).toBeUndefined();
      });
    });
  });

  describe('keyboardHelpers', () => {
    let items: HTMLElement[];

    beforeEach(() => {
      items = [];
      for (let i = 0; i < 5; i++) {
        const item = document.createElement('button');
        item.id = `item-${i}`;
        item.focus = vi.fn();
        items.push(item);
      }
    });

    describe('handleArrowNavigation', () => {
      it('should navigate down with ArrowDown in vertical orientation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        const result = keyboardHelpers.handleArrowNavigation(event, items, 0);

        expect(result).toBe(1);
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(items[1].focus).toHaveBeenCalled();
      });

      it('should navigate up with ArrowUp in vertical orientation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 2);

        expect(result).toBe(1);
        expect(items[1].focus).toHaveBeenCalled();
      });

      it('should navigate right with ArrowRight in horizontal orientation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 0, {
          orientation: 'horizontal',
        });

        expect(result).toBe(1);
      });

      it('should navigate left with ArrowLeft in horizontal orientation', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 2, {
          orientation: 'horizontal',
        });

        expect(result).toBe(1);
      });

      it('should wrap from last to first when wrap is true', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 4, { wrap: true });

        expect(result).toBe(0);
      });

      it('should not wrap when wrap is false', () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 4, { wrap: false });

        expect(result).toBe(4);
      });

      it('should return null for non-arrow keys', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        const result = keyboardHelpers.handleArrowNavigation(event, items, 0);

        expect(result).toBeNull();
      });
    });

    describe('handleHomeEndNavigation', () => {
      it('should navigate to first item on Home key', () => {
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        const result = keyboardHelpers.handleHomeEndNavigation(event, items);

        expect(result).toBe(0);
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(items[0].focus).toHaveBeenCalled();
      });

      it('should navigate to last item on End key', () => {
        const event = new KeyboardEvent('keydown', { key: 'End' });
        const result = keyboardHelpers.handleHomeEndNavigation(event, items);

        expect(result).toBe(4);
        expect(items[4].focus).toHaveBeenCalled();
      });

      it('should return null for other keys', () => {
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        const result = keyboardHelpers.handleHomeEndNavigation(event, items);

        expect(result).toBeNull();
      });
    });
  });

  describe('checkColorContrast', () => {
    it('should calculate contrast ratio for black on white', () => {
      const result = checkColorContrast('#000000', '#ffffff');

      expect(result.ratio).toBe(21);
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
    });

    it('should calculate contrast ratio for white on black', () => {
      const result = checkColorContrast('#ffffff', '#000000');

      expect(result.ratio).toBe(21);
    });

    it('should handle shorthand hex colors', () => {
      const result = checkColorContrast('#000', '#fff');

      expect(result.ratio).toBe(21);
    });

    it('should handle rgb colors', () => {
      const result = checkColorContrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)');

      expect(result.ratio).toBe(21);
    });

    it('should identify failing contrast ratios', () => {
      // Light gray on white - poor contrast
      const result = checkColorContrast('#cccccc', '#ffffff');

      expect(result.passesAA).toBe(false);
      expect(result.passesAAA).toBe(false);
    });

    it('should differentiate between normal and large text requirements', () => {
      // Medium contrast that passes large text but not normal
      const result = checkColorContrast('#767676', '#ffffff');

      expect(result.passesAALarge).toBe(true); // 3:1 for large text
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getSkipLinkProps', () => {
    it('should return proper skip link attributes', () => {
      const result = getSkipLinkProps('main-content');

      expect(result.href).toBe('#main-content');
      expect(result.className).toContain('sr-only');
      expect(result.className).toContain('focus:not-sr-only');
    });
  });

  describe('prefersReducedMotion', () => {
    it('should return boolean', () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('prefersHighContrast', () => {
    it('should return boolean', () => {
      const result = prefersHighContrast();
      expect(typeof result).toBe('boolean');
    });
  });
});
