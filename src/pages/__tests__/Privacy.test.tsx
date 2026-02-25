/**
 * Privacy Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Privacy } from '../Privacy';

describe('Privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    renderPage();
    expect(screen.getByText('Last updated: February 2026')).toBeInTheDocument();
  });

  test('displays information we collect section', () => {
    renderPage();
    expect(screen.getByText('1. Information We Collect')).toBeInTheDocument();
  });

  test('displays how we use your information section', () => {
    renderPage();
    expect(screen.getByText('2. How We Use Your Information')).toBeInTheDocument();
  });

  test('displays data security section', () => {
    renderPage();
    expect(screen.getByText('4. Data Security')).toBeInTheDocument();
  });

  test('displays contact information', () => {
    renderPage();
    expect(screen.getByText('11. Contact Us')).toBeInTheDocument();
    expect(screen.getByText('privacy@fluxstudio.art')).toBeInTheDocument();
  });

  test('displays footer links', () => {
    renderPage();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
});
