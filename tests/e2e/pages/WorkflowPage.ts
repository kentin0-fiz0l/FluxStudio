import { Page, Locator, expect } from '@playwright/test';

export class WorkflowPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly canvas: Locator;
  readonly toolbar: Locator;
  readonly nodeList: Locator;
  readonly saveButton: Locator;
  readonly zoomControls: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2').first();
    this.canvas = page.locator('[data-testid*="canvas"], canvas, [class*="canvas"], [class*="workflow-editor"], [class*="react-flow"]');
    this.toolbar = page.locator('[data-testid*="toolbar"], [class*="toolbar"], [role="toolbar"]');
    this.nodeList = page.locator('[data-testid*="node"], [class*="node"]');
    this.saveButton = page.locator('button:has-text("Save"), [aria-label*="save"]');
    this.zoomControls = page.locator('[class*="zoom"], [aria-label*="zoom"]');
  }

  async goto() {
    await this.page.goto('/workflows');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async getNodeCount() {
    return this.nodeList.count();
  }
}
