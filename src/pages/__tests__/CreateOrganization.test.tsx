/**
 * CreateOrganization Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CreateOrganization } from '../CreateOrganization';

describe('CreateOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <CreateOrganization />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Create New Organization')).toBeInTheDocument();
  });

  test('displays back to organizations button', () => {
    renderPage();
    expect(screen.getByText('Back to Organizations')).toBeInTheDocument();
  });

  test('displays basic information section', () => {
    renderPage();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Type/)).toBeInTheDocument();
  });

  test('displays contact information section', () => {
    renderPage();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Phone/)).toBeInTheDocument();
  });

  test('displays organization type options', () => {
    renderPage();
    const select = screen.getByLabelText(/Organization Type/) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBeGreaterThanOrEqual(6);
  });

  test('displays form action buttons', () => {
    renderPage();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Organization')).toBeInTheDocument();
  });

  test('displays description and website fields', () => {
    renderPage();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
  });
});
