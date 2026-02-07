/**
 * UI Components Accessibility Tests
 * @file src/components/ui/__tests__/accessibility.test.tsx
 *
 * Uses vitest-axe for automated WCAG 2.1 AA compliance testing.
 * Tests key interactive components for accessibility violations.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';

// Import components to test
import { Button } from '../button';
import { Input } from '../input';
import { Textarea } from '../textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { Badge } from '../badge';
import { Checkbox } from '../checkbox';
import { Label } from '../label';

// Extend expect with axe matchers
expect.extend(matchers);

// Type augmentation for vitest-axe matchers
declare module 'vitest' {
  interface Assertion<T> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

describe('UI Components Accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Button', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with icon button', async () => {
      const { container } = render(
        <Button aria-label="Settings" size="icon">
          <span aria-hidden="true">Settings Icon</span>
        </Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with all variants', async () => {
      const variants = ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger', 'success', 'link'] as const;
      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>{variant}</Button>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
        cleanup();
      }
    });
  });

  describe('Input', () => {
    it('should have no accessibility violations with label', async () => {
      const { container } = render(
        <Input label="Email" type="email" placeholder="Enter email" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with error state', async () => {
      const { container } = render(
        <Input label="Email" error="Invalid email address" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with helper text', async () => {
      const { container } = render(
        <Input label="Password" type="password" helperText="Must be at least 8 characters" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have aria-describedby linking to helper text', () => {
      const { container } = render(
        <Input id="test-input" label="Name" helperText="Enter your full name" />
      );
      const input = container.querySelector('input');
      const helpText = container.querySelector('[id$="-description"]');
      expect(input?.getAttribute('aria-describedby')).toBe(helpText?.id);
    });

    it('should have aria-invalid on error', () => {
      const { container } = render(
        <Input label="Email" error="Required field" />
      );
      const input = container.querySelector('input');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Textarea', () => {
    it('should have no accessibility violations with label', async () => {
      const { container } = render(
        <Textarea label="Description" placeholder="Enter description" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with error state', async () => {
      const { container } = render(
        <Textarea label="Message" error="Message is too short" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have aria-describedby linking to error message', () => {
      const { container } = render(
        <Textarea id="test-textarea" label="Bio" error="Required" />
      );
      const textarea = container.querySelector('textarea');
      const errorText = container.querySelector('[id$="-description"]');
      expect(textarea?.getAttribute('aria-describedby')).toBe(errorText?.id);
      expect(textarea?.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Card', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have focus-visible styles on interactive card', () => {
      const { container } = render(
        <Card interactive tabIndex={0}>
          <CardContent>Interactive card</CardContent>
        </Card>
      );
      const card = container.querySelector('[class*="cursor-pointer"]');
      expect(card?.className).toContain('focus-visible:ring-2');
    });
  });

  describe('DropdownMenu', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tooltip', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              Tooltip content
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Alert', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Important Notice</AlertTitle>
          <AlertDescription>This is an important alert message.</AlertDescription>
        </Alert>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with destructive variant', async () => {
      const { container } = render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong.</AlertDescription>
        </Alert>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Badge', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Badge>Active</Badge>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with all variants', async () => {
      const variants = ['default', 'primary', 'secondary', 'success', 'warning', 'error'] as const;
      for (const variant of variants) {
        const { container } = render(<Badge variant={variant}>{variant}</Badge>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
        cleanup();
      }
    });
  });

  describe('Checkbox with Label', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria attributes when checked', async () => {
      const { container } = render(
        <div className="flex items-center space-x-2">
          <Checkbox id="notifications" defaultChecked aria-describedby="notifications-desc" />
          <Label htmlFor="notifications">Enable notifications</Label>
          <span id="notifications-desc" className="sr-only">You will receive email notifications</span>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus visible consistency', () => {
    it('Button should have focus-visible ring', () => {
      const { container } = render(<Button>Test</Button>);
      const button = container.querySelector('button');
      expect(button?.className).toMatch(/focus-visible:ring/);
    });

    it('Checkbox should have focus-visible ring', () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector('button');
      expect(checkbox?.className).toMatch(/focus-visible:ring/);
    });
  });

  describe('Form field associations', () => {
    it('Input with label should have correct for/id association', () => {
      const { container } = render(<Input id="my-input" label="My Label" />);
      const label = container.querySelector('label');
      const input = container.querySelector('input');
      expect(label?.getAttribute('for')).toBe(input?.id);
    });

    it('Textarea with label should have correct for/id association', () => {
      const { container } = render(<Textarea id="my-textarea" label="My Label" />);
      const label = container.querySelector('label');
      const textarea = container.querySelector('textarea');
      expect(label?.getAttribute('for')).toBe(textarea?.id);
    });
  });

  describe('Semantic button elements', () => {
    it('Button should be a semantic button element', () => {
      const { container } = render(<Button>Click</Button>);
      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('Button as link should be an anchor element', () => {
      const { container } = render(<Button asChild><a href="/test">Link</a></Button>);
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.tagName).toBe('A');
    });
  });
});
