/**
 * FormationWarningsPanel Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { FormationWarningsPanel } from '../FormationWarningsPanel';
import type { FormationWarning } from '../../../services/formationValidator';

describe('FormationWarningsPanel', () => {
  const errorWarning: FormationWarning = {
    severity: 'error',
    message: 'Performers are too close together',
    performerIds: ['p1', 'p2'],
  };

  const warningWarning: FormationWarning = {
    severity: 'warning',
    message: 'Step distance exceeds recommended maximum',
    performerIds: ['p3'],
  };

  const infoWarning: FormationWarning = {
    severity: 'info',
    message: 'Formation is symmetric',
    performerIds: [],
  };

  // ---------- Empty state ----------

  test('renders nothing when warnings array is empty', () => {
    const { container } = render(<FormationWarningsPanel warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // ---------- Header / summary ----------

  test('renders singular "Warning" label for single warning', () => {
    render(<FormationWarningsPanel warnings={[warningWarning]} />);
    expect(screen.getByText('1 Warning')).toBeInTheDocument();
  });

  test('renders plural "Warnings" label for multiple warnings', () => {
    render(<FormationWarningsPanel warnings={[warningWarning, infoWarning]} />);
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
  });

  test('shows error count badge when errors are present', () => {
    render(<FormationWarningsPanel warnings={[errorWarning, warningWarning]} />);
    expect(screen.getByText('1 error')).toBeInTheDocument();
  });

  test('shows plural error badge for multiple errors', () => {
    const anotherError: FormationWarning = {
      severity: 'error',
      message: 'Collision detected',
      performerIds: ['p4'],
    };
    render(<FormationWarningsPanel warnings={[errorWarning, anotherError]} />);
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  test('shows warning count badge when only warnings (no errors)', () => {
    render(<FormationWarningsPanel warnings={[warningWarning]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  // ---------- Expand / collapse ----------

  test('does not show warning messages when collapsed', () => {
    render(<FormationWarningsPanel warnings={[warningWarning]} />);
    expect(screen.queryByText('Step distance exceeds recommended maximum')).not.toBeInTheDocument();
  });

  test('shows warning messages after clicking to expand', () => {
    render(<FormationWarningsPanel warnings={[warningWarning, infoWarning]} />);
    const toggleButton = screen.getByText('2 Warnings');
    fireEvent.click(toggleButton);
    expect(screen.getByText('Step distance exceeds recommended maximum')).toBeInTheDocument();
    expect(screen.getByText('Formation is symmetric')).toBeInTheDocument();
  });

  test('hides warning messages after clicking to collapse', () => {
    render(<FormationWarningsPanel warnings={[warningWarning]} />);
    const toggleButton = screen.getByText('1 Warning');
    // Expand
    fireEvent.click(toggleButton);
    expect(screen.getByText('Step distance exceeds recommended maximum')).toBeInTheDocument();
    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('Step distance exceeds recommended maximum')).not.toBeInTheDocument();
  });

  // ---------- Severity rendering ----------

  test('renders all severity types when expanded', () => {
    render(
      <FormationWarningsPanel warnings={[errorWarning, warningWarning, infoWarning]} />
    );
    fireEvent.click(screen.getByText('3 Warnings'));
    expect(screen.getByText('Performers are too close together')).toBeInTheDocument();
    expect(screen.getByText('Step distance exceeds recommended maximum')).toBeInTheDocument();
    expect(screen.getByText('Formation is symmetric')).toBeInTheDocument();
  });
});
