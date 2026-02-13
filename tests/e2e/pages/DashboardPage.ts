import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly widgets: Locator;
  readonly navLinks: Locator;
  readonly projectCards: Locator;
  readonly activityFeed: Locator;
  readonly statsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2').first();
    this.widgets = page.locator('[data-testid*="widget"], .widget, .card, [class*="widget"]');
    this.navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    this.projectCards = page.locator('[data-testid*="project"], .project-card, [class*="project"]');
    this.activityFeed = page.locator('[data-testid*="activity"], [class*="activity"], [aria-label*="activity"]');
    this.statsSection = page.locator('[data-testid*="stat"], [class*="stat"], [class*="metric"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async navigateTo(linkText: string) {
    await this.navLinks.filter({ hasText: new RegExp(linkText, 'i') }).first().click();
  }

  async getWidgetCount() {
    return this.widgets.count();
  }
}
