import React from 'react';
import { useDualAudioRecorder } from '../hooks/useDualAudioRecorder';
import { styles } from '../design-system/styles';

// ============================================================================
// AUDIO RECORDER COMPONENT
// ============================================================================

interface AudioRecorderProps {
  onRecordingComplete?: (buffer: Buffer) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onError,
  disabled = false,
  className = ''
}) => {
  const { state, startRecording, stopRecording, resetError } = useDualAudioRecorder();

  // Handle recording toggle
  const handleToggleRecording = async () => {
    try {
      if (state.isRecording) {
        const buffer = await stopRecording();
        if (buffer && onRecordingComplete) {
          onRecordingComplete(buffer);
        }
      } else {
        await startRecording();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording failed';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle error dismissal
  const handleErrorDismiss = () => {
    resetError();
  };

  return (
    <div className={`audio-recorder ${className}`}>
      {/* Error Display */}
      {state.error && (
        <div className="error-banner" style={styles.errorBanner}>
          <span>{state.error}</span>
          <button 
            onClick={handleErrorDismiss}
            style={styles.errorDismissButton}
          >
            ×
          </button>
        </div>
      )}

      {/* Recording Status */}
      {state.isRecording && (
        <div className="recording-status" style={styles.recordingStatus}>
          <div className="recording-indicator" style={styles.recordingIndicator}>
            <div className="pulse-dot" style={styles.pulseDot}></div>
            <span>Recording...</span>
          </div>
          <div className="recording-duration" style={styles.recordingDuration}>
            {formatDuration(state.recordingDuration)}
          </div>
        </div>
      )}

      {/* Audio Sources Status */}
      <div className="audio-sources" style={styles.audioSources}>
        <div className="source-status" style={styles.sourceStatus}>
          <span className="source-label">🎤 Microphone:</span>
          <span className={`source-status ${state.isMicActive ? 'active' : 'inactive'}`}>
            {state.isMicActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="source-status" style={styles.sourceStatus}>
          <span className="source-label">🔊 System Audio:</span>
          <span className={`source-status ${state.isSystemAudioActive ? 'active' : 'inactive'}`}>
            {state.isSystemAudioActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Record Button */}
      <button
        onClick={handleToggleRecording}
        disabled={disabled}
        className={`record-button ${state.isRecording ? 'recording' : ''}`}
        style={{
          ...styles.recordButton,
          ...(state.isRecording ? styles.recordButtonRecording : {}),
          ...(disabled ? styles.recordButtonDisabled : {})
        }}
      >
        {state.isRecording ? (
          <>
            <div className="stop-icon" style={styles.stopIcon}></div>
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <div className="mic-icon" style={styles.micIcon}>🎤</div>
            <span>Start Recording</span>
          </>
        )}
      </button>

      {/* Instructions */}
      {!state.isRecording && (
        <div className="instructions" style={styles.instructions}>
          <p>Click to record both microphone and system audio simultaneously.</p>
          <p>Speak while playing any system audio for best results.</p>
        </div>
      )}
    </div>
  );
}; 