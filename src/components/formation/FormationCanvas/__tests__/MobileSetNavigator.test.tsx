import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSetNavigator } from '../MobileSetNavigator';
import type { Keyframe } from '../../../../services/formationTypes';

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function makeKeyframe(id: string, performerCount: number): Keyframe {
  const positions = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < performerCount; i++) {
    positions.set(`performer-${i}`, { x: i * 10, y: i * 10 });
  }
  return {
    id,
    timestamp: 0,
    positions,
  };
}

describe('MobileSetNavigator', () => {
  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  it('returns null when keyframes is empty', () => {
    const { container } = render(
      <MobileSetNavigator
        keyframes={[]}
        selectedKeyframeId="none"
        onKeyframeSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Rendering set buttons
  // -------------------------------------------------------------------------
  it('renders a button for each keyframe labelled Set 1, Set 2, etc.', () => {
    const keyframes = [makeKeyframe('kf-1', 3), makeKeyframe('kf-2', 5)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-1"
        onKeyframeSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Selected state
  // -------------------------------------------------------------------------
  it('marks the selected keyframe with aria-selected="true"', () => {
    const keyframes = [makeKeyframe('kf-1', 2), makeKeyframe('kf-2', 4)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-2"
        onKeyframeSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  // -------------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------------
  it('calls onKeyframeSelect with the correct id when a set is clicked', () => {
    const onSelect = vi.fn();
    const keyframes = [makeKeyframe('kf-a', 1), makeKeyframe('kf-b', 2)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-a"
        onKeyframeSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Set 2'));
    expect(onSelect).toHaveBeenCalledWith('kf-b');
  });

  // -------------------------------------------------------------------------
  // Performer count display
  // -------------------------------------------------------------------------
  it('shows performer count with plural "dots" when count > 1', () => {
    const keyframes = [makeKeyframe('kf-1', 3)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-1"
        onKeyframeSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('3 dots')).toBeInTheDocument();
  });

  it('shows singular "dot" when performer count is 1', () => {
    const keyframes = [makeKeyframe('kf-1', 1)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-1"
        onKeyframeSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('1 dot')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Accessibility roles
  // -------------------------------------------------------------------------
  it('has role="tablist" on the container and role="tab" on each button', () => {
    const keyframes = [makeKeyframe('kf-1', 2), makeKeyframe('kf-2', 3)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-1"
        onKeyframeSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // aria-label on tabs includes performer count
  // -------------------------------------------------------------------------
  it('sets an aria-label with set number and performer count on each tab', () => {
    const keyframes = [makeKeyframe('kf-1', 5)];

    render(
      <MobileSetNavigator
        keyframes={keyframes}
        selectedKeyframeId="kf-1"
        onKeyframeSelect={vi.fn()}
      />,
    );

    const tab = screen.getByRole('tab');
    expect(tab).toHaveAttribute('aria-label', 'Set 1, 5 performers');
  });
});
