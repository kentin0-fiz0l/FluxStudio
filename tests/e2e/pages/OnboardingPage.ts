import { Page, Locator, expect } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly skipButton: Locator;
  readonly stepIndicator: Locator;
  readonly currentStep: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2').first();
    this.nextButton = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Get Started")');
    this.prevButton = page.locator('button:has-text("Back"), button:has-text("Previous")');
    this.skipButton = page.locator('button:has-text("Skip"), a:has-text("Skip")');
    this.stepIndicator = page.locator('[class*="step"], [data-testid*="step"], [role="progressbar"]');
    this.currentStep = page.locator('[class*="active"], [aria-current="step"]');
  }

  async goto() {
    await this.page.goto('/onboarding');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async goNext() {
    await this.nextButton.first().click();
  }

  async goBack() {
    await this.prevButton.first().click();
  }

  async skip() {
    await this.skipButton.first().click();
  }
}
