import { useState, KeyboardEvent } from 'react';
import { ConnectionStatus } from '../types';

interface Props {
  onSend: (text: string) => void;
  connectionStatus: ConnectionStatus;
}

const MAX_LENGTH = 1000;

export function MessageInput({ onSend, connectionStatus }: Props) {
  const [text, setText] = useState('');
  const canSend = connectionStatus === 'connected' && text.trim().length > 0;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !canSend) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <div className="message-input__wrapper">
        <textarea
          className="message-input__field"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          maxLength={MAX_LENGTH}
          rows={1}
          aria-label="Message input"
          disabled={connectionStatus !== 'connected'}
        />
        <button
          className="message-input__send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      {text.length > MAX_LENGTH * 0.9 && (
        <p className="message-input__counter">
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
