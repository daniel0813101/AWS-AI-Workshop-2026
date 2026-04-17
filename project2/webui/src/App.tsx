import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { ChatScreen } from './components/ChatScreen';
import { useWebSocket } from './hooks/useWebSocket';
import { ConnectionStatus } from './types';

type Screen = 'join' | 'chat';

export default function App() {
  const [screen, setScreen] = useState<Screen>('join');
  const [callsign, setCallsign] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const { messages, connectionStatus, sendMessage, connect, disconnect, reconnectNow } =
    useWebSocket();

  useEffect(() => {
    if (!isJoining) return;

    if (connectionStatus === 'connected') {
      setIsJoining(false);
      setJoinError(null);
      setScreen('chat');
    } else if (connectionStatus === 'failed') {
      setIsJoining(false);
      setJoinError('Could not connect. Please check the endpoint and try again.');
    }
  }, [connectionStatus, isJoining]);

  const handleJoin = (cs: string) => {
    setJoinError(null);
    setIsJoining(true);
    setCallsign(cs);
    connect(cs);
  };

  const handleLeave = () => {
    disconnect();
    setScreen('join');
    setCallsign('');
    setJoinError(null);
  };

  const connectingStatus: ConnectionStatus = isJoining ? connectionStatus : 'idle';

  if (screen === 'join') {
    return (
      <JoinScreen
        onJoin={handleJoin}
        connectionStatus={connectingStatus}
        joinError={joinError}
      />
    );
  }

  return (
    <ChatScreen
      callsign={callsign}
      messages={messages}
      connectionStatus={connectionStatus}
      onSend={sendMessage}
      onLeave={handleLeave}
      onReconnect={reconnectNow}
    />
  );
}
