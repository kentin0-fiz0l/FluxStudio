import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test/utils';
import { BeatMarkers } from '../BeatMarkers';
import type { BeatMap } from '../../../contexts/metmap/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

const makeBeatMap = (beats: number[]): BeatMap => ({
  bpm: 120,
  beats,
  onsets: [],
  confidence: 0.9,
});

describe('BeatMarkers', () => {
  it('returns null when beats array is empty', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([])} duration={60} containerWidth={800} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when duration <= 0', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([1, 2, 3])} duration={0} containerWidth={800} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when containerWidth <= 0', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([1, 2, 3])} duration={60} containerWidth={0} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders SVG element with correct dimensions', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([10, 20, 30])} duration={60} containerWidth={600} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '600');
    expect(svg).toHaveAttribute('height', '96'); // default height
  });

  it('renders correct number of lines', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([10, 20, 30])} duration={60} containerWidth={600} />
    );
    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(3);
  });

  it('positions lines proportionally', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([30])} duration={60} containerWidth={600} />
    );
    const line = container.querySelector('line')!;
    // 30/60 * 600 = 300
    expect(line.getAttribute('x1')).toBe('300');
    expect(line.getAttribute('x2')).toBe('300');
  });

  it('uses custom height', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([10])} duration={60} containerWidth={600} height={200} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '200');

    const line = container.querySelector('line')!;
    expect(line.getAttribute('y2')).toBe('200');
  });

  it('has aria-hidden on SVG', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([10])} duration={60} containerWidth={600} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies className prop', () => {
    const { container } = render(
      <BeatMarkers beatMap={makeBeatMap([10])} duration={60} containerWidth={600} className="custom" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom');
  });
});
