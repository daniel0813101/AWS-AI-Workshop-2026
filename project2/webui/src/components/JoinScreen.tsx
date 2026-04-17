import { useState, FormEvent } from 'react';
import { ConnectionStatus } from '../types';

interface Props {
  onJoin: (callsign: string) => void;
  connectionStatus: ConnectionStatus;
  joinError: string | null;
}

const CALLSIGN_REGEX = /^[a-zA-Z0-9_]{1,20}$/;

export function JoinScreen({ onJoin, connectionStatus, joinError }: Props) {
  const [callsign, setCallsign] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isLoading = connectionStatus === 'connecting';

  const validate = (value: string): string | null => {
    if (!value.trim()) return 'Callsign cannot be empty.';
    if (!CALLSIGN_REGEX.test(value))
      return 'Callsign must be 1–20 characters: letters, numbers, or underscores only.';
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const error = validate(callsign);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    onJoin(callsign.trim());
  };

  const errorMessage = validationError || joinError;

  return (
    <div className="join-screen">
      <div className="join-screen__mascots" aria-hidden="true">
        <img
          src="images/generated-1776398347106.png"
          alt=""
          className="join-screen__mascot join-screen__mascot--left"
        />
        <img
          src="images/generated-1776398349411.png"
          alt=""
          className="join-screen__mascot join-screen__mascot--right"
        />
      </div>

      <div className="join-screen__card">
        <div className="join-screen__header">
          <span className="join-screen__icon" aria-hidden="true">💬</span>
          <h1 className="join-screen__title">Anonymous Chat</h1>
          <p className="join-screen__subtitle">Pick a callsign and join the conversation</p>
        </div>

        <form className="join-screen__form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="callsign-input">
              Your Callsign
            </label>
            <input
              id="callsign-input"
              className={`form-input ${errorMessage ? 'form-input--error' : ''}`}
              type="text"
              value={callsign}
              onChange={e => {
                setCallsign(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. CoolDog, Ghost_42"
              maxLength={20}
              autoComplete="off"
              autoFocus
              aria-describedby={errorMessage ? 'callsign-error' : undefined}
              aria-invalid={errorMessage ? 'true' : 'false'}
              disabled={isLoading}
            />
            {errorMessage && (
              <p id="callsign-error" className="form-error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--large"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn__spinner" aria-hidden="true" />
                Connecting…
              </>
            ) : (
              'Join Chat'
            )}
          </button>
        </form>

        <p className="join-screen__hint">
          No account needed — just pick a name and start chatting!
        </p>
      </div>
    </div>
  );
}
