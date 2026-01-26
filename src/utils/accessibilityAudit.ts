/**
 * Accessibility Audit Utility
 * Automated accessibility checks for WCAG 2.1 AA compliance
 */

export interface AccessibilityIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  type: string;
  element: string;
  description: string;
  wcagCriterion: string;
  suggestion: string;
}

export interface AccessibilityAuditResult {
  passed: boolean;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

/**
 * Check for images without alt text
 */
function checkImageAltText(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const images = document.querySelectorAll('img');

  images.forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        severity: 'critical',
        type: 'missing-alt-text',
        element: `img[src="${img.src}"]`,
        description: 'Image is missing alt text',
        wcagCriterion: 'WCAG 2.1 Level A - 1.1.1 Non-text Content',
        suggestion: 'Add descriptive alt text to the image or alt="" for decorative images',
      });
    }
  });

  return issues;
}

/**
 * Check for proper heading hierarchy
 */
function checkHeadingHierarchy(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

  let previousLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1]);

    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        severity: 'moderate',
        type: 'heading-hierarchy',
        element: heading.tagName.toLowerCase(),
        description: `Heading level skips from h${previousLevel} to h${level}`,
        wcagCriterion: 'WCAG 2.1 Level AA - 1.3.1 Info and Relationships',
        suggestion: 'Use heading levels in sequential order (h1, h2, h3, etc.)',
      });
    }

    previousLevel = level;
  });

  return issues;
}

/**
 * Check for sufficient color contrast
 */
function checkColorContrast(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  // Note: Actual color contrast checking requires complex calculations
  // This is a simplified version - consider using axe-core for production

  const textElements = document.querySelectorAll('p, span, div, a, button, label, input, textarea');

  textElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // Simplified check - in production use proper contrast ratio calculation
    if (color === backgroundColor) {
      issues.push({
        severity: 'critical',
        type: 'color-contrast',
        element: element.tagName.toLowerCase(),
        description: 'Text color matches background color',
        wcagCriterion: 'WCAG 2.1 Level AA - 1.4.3 Contrast (Minimum)',
        suggestion: 'Ensure text has sufficient contrast against its background (4.5:1 for normal text)',
      });
    }
  });

  return issues;
}

/**
 * Check for form labels
 */
function checkFormLabels(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');

  inputs.forEach((input) => {
    const id = input.id;
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;

    if (!label && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        severity: 'critical',
        type: 'missing-form-label',
        element: input.tagName.toLowerCase(),
        description: 'Form input is missing a label',
        wcagCriterion: 'WCAG 2.1 Level A - 3.3.2 Labels or Instructions',
        suggestion: 'Add a <label> element or use aria-label/aria-labelledby attribute',
      });
    }
  });

  return issues;
}

/**
 * Check for keyboard accessibility
 */
function checkKeyboardAccessibility(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const interactiveElements = document.querySelectorAll('div[onclick], span[onclick], a[href]');

  interactiveElements.forEach((element) => {
    const tabIndex = element.getAttribute('tabindex');
    const role = element.getAttribute('role');

    if (element.tagName === 'DIV' || element.tagName === 'SPAN') {
      if (!tabIndex && !role) {
        issues.push({
          severity: 'serious',
          type: 'keyboard-accessibility',
          element: `${element.tagName.toLowerCase()}[onclick]`,
          description: 'Interactive element is not keyboard accessible',
          wcagCriterion: 'WCAG 2.1 Level A - 2.1.1 Keyboard',
          suggestion: 'Add tabindex="0" and appropriate role, or use a <button> element instead',
        });
      }
    }

    if (element.tagName === 'A' && !element.getAttribute('href')) {
      issues.push({
        severity: 'moderate',
        type: 'link-without-href',
        element: 'a',
        description: 'Link element is missing href attribute',
        wcagCriterion: 'WCAG 2.1 Level A - 2.1.1 Keyboard',
        suggestion: 'Add href attribute or use a <button> element for actions',
      });
    }
  });

  return issues;
}

/**
 * Check for ARIA attributes
 */
function checkARIAAttributes(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const elements = document.querySelectorAll('[role]');

  elements.forEach((element) => {
    const role = element.getAttribute('role');

    // Check for required ARIA attributes based on role
    if (role === 'button' && element.tagName !== 'BUTTON') {
      const ariaPressed = element.getAttribute('aria-pressed');
      const ariaExpanded = element.getAttribute('aria-expanded');

      if (!ariaPressed && !ariaExpanded) {
        issues.push({
          severity: 'minor',
          type: 'missing-aria-attribute',
          element: `${element.tagName.toLowerCase()}[role="button"]`,
          description: 'Button role may need aria-pressed or aria-expanded',
          wcagCriterion: 'WCAG 2.1 Level A - 4.1.2 Name, Role, Value',
          suggestion: 'Consider adding aria-pressed or aria-expanded if applicable',
        });
      }
    }

    if (role === 'dialog' && !element.getAttribute('aria-labelledby') && !element.getAttribute('aria-label')) {
      issues.push({
        severity: 'serious',
        type: 'missing-aria-label',
        element: `${element.tagName.toLowerCase()}[role="dialog"]`,
        description: 'Dialog is missing accessible name',
        wcagCriterion: 'WCAG 2.1 Level A - 4.1.2 Name, Role, Value',
        suggestion: 'Add aria-labelledby or aria-label to provide an accessible name',
      });
    }
  });

  return issues;
}

/**
 * Check for page title
 */
function checkPageTitle(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const title = document.querySelector('title');

  if (!title || !title.textContent?.trim()) {
    issues.push({
      severity: 'critical',
      type: 'missing-page-title',
      element: 'title',
      description: 'Page is missing a title element or title is empty',
      wcagCriterion: 'WCAG 2.1 Level A - 2.4.2 Page Titled',
      suggestion: 'Add a descriptive <title> element to the page',
    });
  }

  return issues;
}

/**
 * Check for landmark regions
 */
function checkLandmarks(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  const hasMain = document.querySelector('main, [role="main"]');
  const hasNav = document.querySelector('nav, [role="navigation"]');

  if (!hasMain) {
    issues.push({
      severity: 'moderate',
      type: 'missing-landmark',
      element: 'main',
      description: 'Page is missing a main landmark',
      wcagCriterion: 'WCAG 2.1 Level AA - 1.3.1 Info and Relationships',
      suggestion: 'Add a <main> element or [role="main"] to identify the main content area',
    });
  }

  if (!hasNav) {
    issues.push({
      severity: 'minor',
      type: 'missing-landmark',
      element: 'nav',
      description: 'Page is missing a navigation landmark',
      wcagCriterion: 'WCAG 2.1 Level AA - 1.3.1 Info and Relationships',
      suggestion: 'Add a <nav> element or [role="navigation"] to identify navigation areas',
    });
  }

  return issues;
}

/**
 * Check for skip links
 */
function checkSkipLinks(): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const skipLink = document.querySelector('a[href^="#"]');

  if (!skipLink) {
    issues.push({
      severity: 'moderate',
      type: 'missing-skip-link',
      element: 'a',
      description: 'Page is missing a skip navigation link',
      wcagCriterion: 'WCAG 2.1 Level A - 2.4.1 Bypass Blocks',
      suggestion: 'Add a skip link at the beginning of the page to allow keyboard users to skip repetitive content',
    });
  }

  return issues;
}

/**
 * Run complete accessibility audit
 */
export function runAccessibilityAudit(): AccessibilityAuditResult {
  const allIssues: AccessibilityIssue[] = [
    ...checkImageAltText(),
    ...checkHeadingHierarchy(),
    ...checkColorContrast(),
    ...checkFormLabels(),
    ...checkKeyboardAccessibility(),
    ...checkARIAAttributes(),
    ...checkPageTitle(),
    ...checkLandmarks(),
    ...checkSkipLinks(),
  ];

  const summary = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    serious: allIssues.filter(i => i.severity === 'serious').length,
    moderate: allIssues.filter(i => i.severity === 'moderate').length,
    minor: allIssues.filter(i => i.severity === 'minor').length,
  };

  // Calculate score (100 - weighted sum of issues)
  const score = Math.max(0, 100 - (
    summary.critical * 20 +
    summary.serious * 10 +
    summary.moderate * 5 +
    summary.minor * 2
  ));

  const passed = summary.critical === 0 && summary.serious === 0;

  return {
    passed,
    score,
    issues: allIssues,
    summary,
  };
}

/**
 * Print accessibility audit report to console
 */
export function printAccessibilityReport(result: AccessibilityAuditResult): void {
  console.group('🔍 Accessibility Audit Report');

  console.log(`Score: ${result.score}/100`);
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');

  console.log('Summary:');
  console.log(`  Critical: ${result.summary.critical}`);
  console.log(`  Serious: ${result.summary.serious}`);
  console.log(`  Moderate: ${result.summary.moderate}`);
  console.log(`  Minor: ${result.summary.minor}`);
  console.log('');

  if (result.issues.length > 0) {
    console.log('Issues:');
    result.issues.forEach((issue, index) => {
      console.group(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
      console.log(`Element: ${issue.element}`);
      console.log(`Description: ${issue.description}`);
      console.log(`WCAG: ${issue.wcagCriterion}`);
      console.log(`Suggestion: ${issue.suggestion}`);
      console.groupEnd();
    });
  } else {
    console.log('✨ No accessibility issues found!');
  }

  console.groupEnd();
}

/**
 * Enable automatic accessibility monitoring
 */
export function enableAccessibilityMonitoring(): void {
  // Run audit on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const result = runAccessibilityAudit();
      printAccessibilityReport(result);
    }, 1000);
  });

  // Run audit on DOM changes (debounced)
  let timeoutId: number;
  const observer = new MutationObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      const result = runAccessibilityAudit();
      if (!result.passed) {
        console.warn('⚠️ Accessibility issues detected after DOM change');
        printAccessibilityReport(result);
      }
    }, 2000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['alt', 'aria-label', 'aria-labelledby', 'role', 'tabindex'],
  });
}

export default {
  runAccessibilityAudit,
  printAccessibilityReport,
  enableAccessibilityMonitoring,
};
