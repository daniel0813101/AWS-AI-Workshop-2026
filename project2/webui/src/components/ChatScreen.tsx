import { DisplayMessage, ConnectionStatus } from '../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusIndicator } from './StatusIndicator';

interface Props {
  callsign: string;
  messages: DisplayMessage[];
  connectionStatus: ConnectionStatus;
  onSend: (text: string) => void;
  onLeave: () => void;
  onReconnect: () => void;
}

export function ChatScreen({
  callsign,
  messages,
  connectionStatus,
  onSend,
  onLeave,
  onReconnect,
}: Props) {
  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header__left">
          <img
            src="images/generated-1776398227245.png"
            alt=""
            className="chat-header__mascot"
            aria-hidden="true"
          />
          <div>
            <h1 className="chat-header__title">Anonymous Chat</h1>
            <p className="chat-header__callsign">
              You are <strong>{callsign}</strong>
            </p>
          </div>
        </div>
        <div className="chat-header__right">
          <StatusIndicator status={connectionStatus} onReconnect={onReconnect} />
          <button className="btn btn--ghost btn--small" onClick={onLeave} aria-label="Leave chat">
            Leave
          </button>
        </div>
      </header>

      <main className="chat-main">
        <MessageList messages={messages} ownCallsign={callsign} />
      </main>

      <footer className="chat-footer">
        <MessageInput onSend={onSend} connectionStatus={connectionStatus} />
      </footer>
    </div>
  );
}
