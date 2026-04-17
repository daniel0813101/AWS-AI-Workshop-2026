import { useRef, useState, useCallback, useEffect } from 'react';
import { ServerMessage, ConnectionStatus, DisplayMessage } from '../types';
import { WS_ENDPOINT } from '../config';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

interface UseWebSocketReturn {
  messages: DisplayMessage[];
  connectionStatus: ConnectionStatus;
  sendMessage: (text: string) => boolean;
  connect: (callsign: string) => void;
  disconnect: () => void;
  reconnectNow: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const callsignRef = useRef<string>('');
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef<boolean>(false);
  const hasEverConnectedRef = useRef<boolean>(false);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  const clearTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const addMessage = useCallback((msg: ServerMessage) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages(prev => [...prev, { ...msg, id }]);
  }, []);

  const connectWs = useCallback(
    (callsign: string) => {
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      intentionalCloseRef.current = false;
      callsignRef.current = callsign;
      setConnectionStatus('connecting');

      const url = `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsign)}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        setConnectionStatus('failed');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        hasEverConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        setConnectionStatus('connected');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as ServerMessage;
          addMessage(data);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (intentionalCloseRef.current) return;

        if (!hasEverConnectedRef.current) {
          setConnectionStatus('failed');
          return;
        }

        const attempts = reconnectAttemptsRef.current;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionStatus('failed');
          return;
        }

        setConnectionStatus('reconnecting');
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, attempts),
          MAX_RECONNECT_DELAY,
        );
        reconnectAttemptsRef.current = attempts + 1;
        reconnectTimerRef.current = setTimeout(() => connectWs(callsignRef.current), delay);
      };

      ws.onerror = () => {
        // onerror always precedes onclose; let onclose handle state
      };
    },
    [addMessage],
  );

  const connect = useCallback(
    (callsign: string) => {
      clearTimer();
      hasEverConnectedRef.current = false;
      reconnectAttemptsRef.current = 0;
      setMessages([]);
      connectWs(callsign);
    },
    [connectWs],
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearTimer();
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionStatus('idle');
  }, []);

  const reconnectNow = useCallback(() => {
    clearTimer();
    reconnectAttemptsRef.current = 0;
    connectWs(callsignRef.current);
  }, [connectWs]);

  const sendMessage = useCallback((text: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }));
      return true;
    }
    return false;
  }, []);

  useEffect(
    () => () => {
      intentionalCloseRef.current = true;
      clearTimer();
      wsRef.current?.close();
    },
    [],
  );

  return { messages, connectionStatus, sendMessage, connect, disconnect, reconnectNow };
}
