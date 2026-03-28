import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileCanvasToolbar } from '../MobileCanvasToolbar';

function defaultProps(overrides: Partial<Parameters<typeof MobileCanvasToolbar>[0]> = {}) {
  return {
    activeTool: 'select' as const,
    setActiveTool: vi.fn(),
    fingerMode: 'select' as const,
    setFingerMode: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: false,
    canRedo: false,
    zoom: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onSave: vi.fn(),
    saveStatus: 'idle' as const,
    setIsExportDialogOpen: vi.fn(),
    showGrid: true,
    setShowGrid: vi.fn(),
    showLabels: true,
    setShowLabels: vi.fn(),
    showFieldOverlay: false,
    setShowFieldOverlay: vi.fn(),
    playbackState: { isPlaying: false },
    onPlay: vi.fn(),
    onPause: vi.fn(),
    ...overrides,
  };
}

describe('MobileCanvasToolbar', () => {
  // -------------------------------------------------------------------------
  // Rendering with default props
  // -------------------------------------------------------------------------
  it('renders the primary toolbar with default props', () => {
    render(<MobileCanvasToolbar {...defaultProps()} />);

    expect(screen.getByRole('toolbar', { name: /canvas tools/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/select tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/switch to pan mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Add performer')).toBeInTheDocument();
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Tool selection buttons
  // -------------------------------------------------------------------------
  it('calls setActiveTool("select") when clicking the Select button', () => {
    const props = defaultProps({ activeTool: 'add' });
    render(<MobileCanvasToolbar {...props} />);

    fireEvent.click(screen.getByLabelText(/select tool/i));
    expect(props.setActiveTool).toHaveBeenCalledWith('select');
  });

  it('calls setActiveTool("add") when clicking the Add button', () => {
    const props = defaultProps();
    render(<MobileCanvasToolbar {...props} />);

    fireEvent.click(screen.getByLabelText('Add performer'));
    expect(props.setActiveTool).toHaveBeenCalledWith('add');
  });

  // -------------------------------------------------------------------------
  // Pan / finger-mode toggle
  // -------------------------------------------------------------------------
  it('toggles fingerMode from select to pan when clicking Pan button', () => {
    const props = defaultProps({ fingerMode: 'select' });
    render(<MobileCanvasToolbar {...props} />);

    fireEvent.click(screen.getByLabelText(/switch to pan mode/i));
    expect(props.setFingerMode).toHaveBeenCalledWith('pan');
  });

  it('toggles fingerMode from pan to select when clicking Pan button', () => {
    const props = defaultProps({ fingerMode: 'pan' });
    render(<MobileCanvasToolbar {...props} />);

    fireEvent.click(screen.getByLabelText(/switch to select mode/i));
    expect(props.setFingerMode).toHaveBeenCalledWith('select');
  });

  // -------------------------------------------------------------------------
  // Undo / Redo
  // -------------------------------------------------------------------------
  it('disables the Undo button when canUndo is false', () => {
    render(<MobileCanvasToolbar {...defaultProps({ canUndo: false })} />);
    expect(screen.getByLabelText('Undo')).toBeDisabled();
  });

  it('enables the Undo button and calls onUndo when canUndo is true', () => {
    const props = defaultProps({ canUndo: true });
    render(<MobileCanvasToolbar {...props} />);

    const btn = screen.getByLabelText('Undo');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it('disables the Redo button when canRedo is false', () => {
    render(<MobileCanvasToolbar {...defaultProps({ canRedo: false })} />);
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });

  it('enables the Redo button and calls onRedo when canRedo is true', () => {
    const props = defaultProps({ canRedo: true });
    render(<MobileCanvasToolbar {...props} />);

    const btn = screen.getByLabelText('Redo');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(props.onRedo).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Play / Pause
  // -------------------------------------------------------------------------
  it('shows Play label and calls onPlay when not playing', () => {
    const props = defaultProps({ playbackState: { isPlaying: false } });
    render(<MobileCanvasToolbar {...props} />);

    const btn = screen.getByLabelText('Play');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(props.onPlay).toHaveBeenCalledTimes(1);
    expect(props.onPause).not.toHaveBeenCalled();
  });

  it('shows Pause label and calls onPause when playing', () => {
    const props = defaultProps({ playbackState: { isPlaying: true } });
    render(<MobileCanvasToolbar {...props} />);

    const btn = screen.getByLabelText('Pause');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(props.onPause).toHaveBeenCalledTimes(1);
    expect(props.onPlay).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Overflow menu open / close
  // -------------------------------------------------------------------------
  it('opens the overflow sheet when clicking "More options"', () => {
    render(<MobileCanvasToolbar {...defaultProps()} />);

    // Initially no view toggle switches should be visible
    expect(screen.queryByRole('switch', { name: /grid/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('More options'));

    // After opening, view toggle switches should appear
    expect(screen.getByRole('switch', { name: /grid/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /labels/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /field overlay/i })).toBeInTheDocument();
  });

  it('closes the overflow sheet when clicking the backdrop', () => {
    render(<MobileCanvasToolbar {...defaultProps()} />);

    // Open
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('switch', { name: /grid/i })).toBeInTheDocument();

    // Click backdrop (the div with aria-hidden="true")
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    // Sheet should close
    expect(screen.queryByRole('switch', { name: /grid/i })).not.toBeInTheDocument();
  });

  it('toggles the More button label between "More options" and "Close menu"', () => {
    render(<MobileCanvasToolbar {...defaultProps()} />);

    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Save button states (inside overflow)
  // -------------------------------------------------------------------------
  it('shows "Save" text when saveStatus is idle', () => {
    render(<MobileCanvasToolbar {...defaultProps({ saveStatus: 'idle' })} />);
    fireEvent.click(screen.getByLabelText('More options'));

    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
    expect(saveBtn).toHaveTextContent('Save');
  });

  it('shows "Saving..." and is disabled when saveStatus is saving', () => {
    render(<MobileCanvasToolbar {...defaultProps({ saveStatus: 'saving' })} />);
    fireEvent.click(screen.getByLabelText('More options'));

    const saveBtn = screen.getByRole('button', { name: /saving/i });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent('Saving...');
  });

  it('shows "Saved" when saveStatus is saved', () => {
    render(<MobileCanvasToolbar {...defaultProps({ saveStatus: 'saved' })} />);
    fireEvent.click(screen.getByLabelText('More options'));

    expect(screen.getByRole('button', { name: /saved/i })).toHaveTextContent('Saved');
  });

  it('shows "Failed" when saveStatus is error', () => {
    render(<MobileCanvasToolbar {...defaultProps({ saveStatus: 'error' })} />);
    fireEvent.click(screen.getByLabelText('More options'));

    expect(screen.getByRole('button', { name: /failed/i })).toHaveTextContent('Failed');
  });

  // -------------------------------------------------------------------------
  // View toggles in overflow
  // -------------------------------------------------------------------------
  it('calls setShowGrid with toggled value when clicking Grid toggle', () => {
    const props = defaultProps({ showGrid: true });
    render(<MobileCanvasToolbar {...props} />);
    fireEvent.click(screen.getByLabelText('More options'));

    fireEvent.click(screen.getByRole('switch', { name: /grid/i }));
    expect(props.setShowGrid).toHaveBeenCalledWith(false);
  });

  it('calls setShowLabels with toggled value when clicking Labels toggle', () => {
    const props = defaultProps({ showLabels: false });
    render(<MobileCanvasToolbar {...props} />);
    fireEvent.click(screen.getByLabelText('More options'));

    fireEvent.click(screen.getByRole('switch', { name: /labels/i }));
    expect(props.setShowLabels).toHaveBeenCalledWith(true);
  });

  it('calls setShowFieldOverlay with toggled value when clicking Field Overlay toggle', () => {
    const props = defaultProps({ showFieldOverlay: false });
    render(<MobileCanvasToolbar {...props} />);
    fireEvent.click(screen.getByLabelText('More options'));

    fireEvent.click(screen.getByRole('switch', { name: /field overlay/i }));
    expect(props.setShowFieldOverlay).toHaveBeenCalledWith(true);
  });

  // -------------------------------------------------------------------------
  // Export button in overflow
  // -------------------------------------------------------------------------
  it('calls setIsExportDialogOpen(true) when clicking Export in overflow', () => {
    const props = defaultProps();
    render(<MobileCanvasToolbar {...props} />);
    fireEvent.click(screen.getByLabelText('More options'));

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(props.setIsExportDialogOpen).toHaveBeenCalledWith(true);
  });
});
