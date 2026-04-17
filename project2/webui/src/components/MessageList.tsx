import { useEffect, useRef } from 'react';
import { DisplayMessage } from '../types';
import { MessageItem } from './MessageItem';

interface Props {
  messages: DisplayMessage[];
  ownCallsign: string;
}

export function MessageList({ messages, ownCallsign }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list" role="log" aria-label="Chat messages" aria-live="polite">
      {messages.length === 0 && (
        <div className="message-list__empty">
          <p>No messages yet. Say hello! 👋</p>
        </div>
      )}
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} ownCallsign={ownCallsign} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
