import { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string; dot: string }
> = {
  idle:         { label: 'Not connected',  className: 'status--idle',         dot: '⚪' },
  connecting:   { label: 'Connecting…',    className: 'status--connecting',   dot: '🟡' },
  connected:    { label: 'Connected',      className: 'status--connected',    dot: '🟢' },
  reconnecting: { label: 'Reconnecting…', className: 'status--reconnecting', dot: '🟠' },
  disconnected: { label: 'Disconnected',   className: 'status--disconnected', dot: '🔴' },
  failed:       { label: 'Connection lost',className: 'status--failed',       dot: '🔴' },
};

export function StatusIndicator({ status, onReconnect }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={`status-indicator ${config.className}`} aria-live="polite" aria-atomic="true">
      <span className="status-indicator__dot" aria-hidden="true">{config.dot}</span>
      <span className="status-indicator__label">{config.label}</span>
      {status === 'failed' && onReconnect && (
        <button className="status-indicator__retry" onClick={onReconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
