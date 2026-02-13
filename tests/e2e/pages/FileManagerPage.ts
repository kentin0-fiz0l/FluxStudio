import { Page, Locator, expect } from '@playwright/test';

export class FileManagerPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly fileList: Locator;
  readonly fileItems: Locator;
  readonly uploadButton: Locator;
  readonly searchInput: Locator;
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2').first();
    this.fileList = page.locator('[data-testid*="file-list"], [class*="file-list"], [role="list"]');
    this.fileItems = page.locator('[data-testid*="file-item"], [class*="file-item"], [role="listitem"], tr[class*="file"]');
    this.uploadButton = page.locator('button:has-text("Upload"), [aria-label*="upload"]');
    this.searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    this.breadcrumb = page.locator('[aria-label*="breadcrumb"], nav[class*="breadcrumb"]');
  }

  async goto() {
    await this.page.goto('/files');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async getFileCount() {
    return this.fileItems.count();
  }

  async clickFile(index: number) {
    await this.fileItems.nth(index).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }
}
