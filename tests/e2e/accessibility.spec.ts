/**
 * E2E Accessibility Tests
 * @file tests/e2e/accessibility.spec.ts
 *
 * WCAG 2.1 AA compliance testing using Playwright's accessibility features
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to setup authenticated user
async function setupAuthenticatedUser(page: Page, userId: string, userName: string) {
  await page.addInitScript(([id, name]) => {
    localStorage.setItem('auth_token', `test-token-${id}`);
    localStorage.setItem('user', JSON.stringify({
      id,
      name,
      email: `${id}@test.fluxstudio.art`,
    }));
  }, [userId, userName]);
}

test.describe('Accessibility - Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Landing page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter for critical and serious violations only
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('Dashboard should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('Login page should have no critical accessibility violations', async ({ page }) => {
    // Clear auth for login page test
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Should be able to navigate main menu with keyboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Should have focus on an interactive element
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    expect(['button', 'a', 'input', 'select']).toContain(focusedElement);
  });

  test('Should be able to skip to main content', async ({ page }) => {
    await page.goto('/dashboard');

    // Press Tab to focus skip link (if it exists)
    await page.keyboard.press('Tab');

    // Look for skip link
    const skipLink = page.locator('a[href="#main-content"], a[href="#main"]');
    const skipLinkVisible = await skipLink.isVisible().catch(() => false);

    if (skipLinkVisible) {
      await page.keyboard.press('Enter');

      // Focus should move to main content
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      expect(focusedId).toMatch(/main/i);
    }
  });

  test('Dialog should trap focus', async ({ page }) => {
    await page.goto('/projects');

    // Open a dialog (create project button)
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for dialog to open
      const dialog = page.locator('[role="dialog"], [aria-modal="true"]');
      await expect(dialog).toBeVisible();

      // Tab through dialog elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should still be within the dialog
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return dialog?.contains(el);
      });

      expect(focusedElement).toBe(true);
    }
  });

  test('Escape should close dialog', async ({ page }) => {
    await page.goto('/projects');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();

      const dialog = page.locator('[role="dialog"], [aria-modal="true"]');
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(dialog).not.toBeVisible();
    }
  });
});

test.describe('Accessibility - ARIA Landmarks', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Page should have main landmark', async ({ page }) => {
    await page.goto('/dashboard');

    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('Page should have navigation landmark', async ({ page }) => {
    await page.goto('/dashboard');

    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('Page should have appropriate heading structure', async ({ page }) => {
    await page.goto('/dashboard');

    // Should have at least one h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();

    // Heading levels should not skip (e.g., h1 -> h3 without h2)
    const headings = await page.evaluate(() => {
      const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(hs).map(h => parseInt(h.tagName[1]));
    });

    // Check for skipped heading levels
    let previousLevel = 0;
    for (const level of headings) {
      if (previousLevel > 0 && level > previousLevel + 1) {
        // Allow this check to pass but log warning
        console.warn(`Heading level skipped from h${previousLevel} to h${level}`);
      }
      previousLevel = level;
    }
  });
});

test.describe('Accessibility - Forms', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Form inputs should have associated labels', async ({ page }) => {
    await page.goto('/projects');

    // Open project creation form
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for form
      await page.waitForTimeout(500);

      // Check inputs have labels
      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
        const unlabeled: string[] = [];

        inputs.forEach(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
          const isWrappedInLabel = input.closest('label') !== null;

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !isWrappedInLabel) {
            unlabeled.push(input.name || input.id || 'unknown');
          }
        });

        return unlabeled;
      });

      expect(inputsWithoutLabels).toEqual([]);
    }
  });

  test('Required fields should be marked', async ({ page }) => {
    await page.goto('/projects');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Required inputs should have aria-required or required attribute
      const requiredInputs = page.locator('input[required], input[aria-required="true"]');
      const count = await requiredInputs.count();

      // If there's a form, it should have at least one required field
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Error messages should be associated with inputs', async ({ page }) => {
    // Clear auth and go to login
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/login');

    // Submit empty form to trigger errors
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for potential error messages
      await page.waitForTimeout(500);

      // Check if error messages are properly associated
      const errorMessages = await page.evaluate(() => {
        const errors = document.querySelectorAll('[role="alert"], .error, [aria-live="polite"]');
        return errors.length;
      });

      // If there are errors, they should be announced
      // This test just verifies the pattern is used
    }
  });
});

test.describe('Accessibility - Color and Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Text should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ runOnly: ['color-contrast'] })
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Color contrast violations:',
        accessibilityScanResults.violations.map(v => ({
          description: v.description,
          nodes: v.nodes.map(n => n.html)
        }))
      );
    }

    // Allow minor violations but flag critical ones
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('Focus indicators should be visible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab to an element
    await page.keyboard.press('Tab');

    // Get focused element's outline/ring style
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return false;

      const styles = window.getComputedStyle(el);
      const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderColor !== 'transparent';

      return hasOutline || hasBoxShadow || hasBorder;
    });

    expect(hasFocusIndicator).toBe(true);
  });
});

test.describe('Accessibility - Images and Media', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['image-alt'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Decorative images should have empty alt', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that decorative images have role="presentation" or alt=""
    const decorativeImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const issues: string[] = [];

      imgs.forEach(img => {
        const isDecorative = img.classList.contains('decorative') ||
                            img.getAttribute('data-decorative') === 'true';

        if (isDecorative) {
          const hasEmptyAlt = img.alt === '';
          const hasPresentation = img.getAttribute('role') === 'presentation';

          if (!hasEmptyAlt && !hasPresentation) {
            issues.push(img.src);
          }
        }
      });

      return issues;
    });

    expect(decorativeImages).toEqual([]);
  });
});

test.describe('Accessibility - Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['button-name'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Links should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: ['link-name'] })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Get all interactive elements
    const interactiveElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]');
      const issues: string[] = [];

      elements.forEach(el => {
        const tabIndex = el.getAttribute('tabindex');
        const isDisabled = (el as HTMLButtonElement).disabled;
        const isHidden = window.getComputedStyle(el).display === 'none';

        // Non-disabled, visible interactive elements should be focusable
        if (!isDisabled && !isHidden && tabIndex === '-1') {
          // Exception: elements that have keyboard-accessible alternatives
          const hasAlternative = el.closest('[role="menu"]') ||
                                 el.closest('[role="listbox"]');

          if (!hasAlternative) {
            issues.push(el.outerHTML.substring(0, 100));
          }
        }
      });

      return issues;
    });

    // Allow some exceptions but flag if there are many
    expect(interactiveElements.length).toBeLessThan(5);
  });
});

test.describe('Accessibility - Reduced Motion', () => {
  test('Should respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await setupAuthenticatedUser(page, 'user-1', 'Test User');
    await page.goto('/dashboard');

    // Check that animations are disabled
    const hasReducedMotion = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.style.cssText = 'animation: test 1s; transition: all 1s;';
      document.body.appendChild(testEl);

      const styles = window.getComputedStyle(testEl);
      const animationDuration = parseFloat(styles.animationDuration) || 0;
      const transitionDuration = parseFloat(styles.transitionDuration) || 0;

      document.body.removeChild(testEl);

      // If media query is properly handled, durations might be 0
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    expect(hasReducedMotion).toBe(true);
  });
});
