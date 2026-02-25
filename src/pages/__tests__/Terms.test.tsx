/**
 * Terms Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Terms } from '../Terms';

describe('Terms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    renderPage();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  test('displays acceptance of terms section', () => {
    renderPage();
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
  });

  test('displays description of service section', () => {
    renderPage();
    expect(screen.getByText('2. Description of Service')).toBeInTheDocument();
  });

  test('displays user accounts section', () => {
    renderPage();
    expect(screen.getByText('3. User Accounts')).toBeInTheDocument();
  });

  test('displays contact information', () => {
    renderPage();
    expect(screen.getByText('10. Contact Us')).toBeInTheDocument();
    expect(screen.getByText('legal@fluxstudio.art')).toBeInTheDocument();
  });

  test('displays footer links', () => {
    renderPage();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
});
