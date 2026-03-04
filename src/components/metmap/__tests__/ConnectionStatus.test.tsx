import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ConnectionStatus } from '../ConnectionStatus';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('lucide-react', () => ({
  Wifi: (props: Record<string, unknown>) => <svg data-testid="wifi-icon" {...props} />,
  WifiOff: (props: Record<string, unknown>) => <svg data-testid="wifi-off-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
}));

describe('ConnectionStatus', () => {
  const onRetry = vi.fn();

  it('returns null when status is synced', () => {
    const { container } = render(
      <ConnectionStatus status="synced" reconnectAttempts={0} onRetry={onRetry} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when disconnected with 0 reconnect attempts', () => {
    const { container } = render(
      <ConnectionStatus status="disconnected" reconnectAttempts={0} onRetry={onRetry} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows reconnecting state when status is connecting', () => {
    render(
      <ConnectionStatus status="connecting" reconnectAttempts={3} onRetry={onRetry} />
    );
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('shows reconnecting for disconnected with 1-9 attempts', () => {
    render(
      <ConnectionStatus status="disconnected" reconnectAttempts={5} onRetry={onRetry} />
    );
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('shows offline state when reconnectAttempts >= 10', () => {
    render(
      <ConnectionStatus status="disconnected" reconnectAttempts={10} onRetry={onRetry} />
    );
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('renders retry button in offline state', () => {
    render(
      <ConnectionStatus status="disconnected" reconnectAttempts={15} onRetry={onRetry} />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const { user } = render(
      <ConnectionStatus status="disconnected" reconnectAttempts={10} onRetry={onRetry} />
    );
    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('applies className prop', () => {
    const { container } = render(
      <ConnectionStatus status="connecting" reconnectAttempts={3} onRetry={onRetry} className="test-class" />
    );
    expect(container.firstChild).toHaveClass('test-class');
  });
});
