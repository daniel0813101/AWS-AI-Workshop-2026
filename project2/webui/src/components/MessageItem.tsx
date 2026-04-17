import { DisplayMessage } from '../types';

interface Props {
  message: DisplayMessage;
  ownCallsign: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageItem({ message, ownCallsign }: Props) {
  if (message.type === 'system') {
    const verb = message.event === 'user_joined' ? 'joined' : 'left';
    return (
      <div className="message message--system" role="status">
        <span className="message__system-text">
          {message.callsign} {verb} the chat
        </span>
        <span className="message__time">{formatTime(message.timestamp)}</span>
      </div>
    );
  }

  const isOwn = message.callsign === ownCallsign;
  return (
    <div className={`message message--chat ${isOwn ? 'message--own' : 'message--other'}`}>
      {!isOwn && (
        <span className="message__callsign">{message.callsign}</span>
      )}
      <div className="message__bubble">
        <p className="message__text">{message.text}</p>
        <span className="message__time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
