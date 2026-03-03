/**
 * FieldOverlay Component Tests
 *
 * Tests SVG rendering, end zone labels, yard line numbers.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('../../../utils/drillGeometry', () => ({
  STANDARD_FOOTBALL_FIELD: {
    width: 120,
    height: 53.3,
    endZoneDepth: 10,
    yardLineInterval: 5,
    hashMarks: { college: 20 },
    yardNumbers: [10, 20, 30, 40, 50, 40, 30, 20, 10],
  },
}));

import { FieldOverlay } from '../FieldOverlay';

describe('FieldOverlay', () => {
  test('renders SVG element', () => {
    const { container } = render(<FieldOverlay canvasWidth={1200} canvasHeight={533} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  test('renders end zone labels', () => {
    render(<FieldOverlay canvasWidth={1200} canvasHeight={533} />);
    const endZoneTexts = screen.getAllByText('END ZONE');
    expect(endZoneTexts.length).toBe(2);
  });

  test('renders yard numbers', () => {
    render(<FieldOverlay canvasWidth={1200} canvasHeight={533} />);
    // Yard numbers include 10, 20, 30, 40, 50
    // Each yard number appears twice (top and bottom)
    const tens = screen.getAllByText('10');
    expect(tens.length).toBeGreaterThanOrEqual(2);
  });

  test('SVG has pointer-events-none class', () => {
    const { container } = render(<FieldOverlay canvasWidth={1200} canvasHeight={533} />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('pointer-events-none')).toBe(true);
  });

  test('renders with given canvas dimensions in viewBox', () => {
    const { container } = render(<FieldOverlay canvasWidth={800} canvasHeight={400} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 800 400');
  });
});
