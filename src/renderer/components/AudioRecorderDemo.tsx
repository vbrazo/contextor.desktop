import React, { useState } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { AudioPermissionChecker } from './AudioPermissionChecker';
import { styles } from '../design-system/styles';

// ============================================================================
// AUDIO RECORDER DEMO COMPONENT
// ============================================================================

export const AudioRecorderDemo: React.FC = () => {
  const [recordedAudio, setRecordedAudio] = useState<Buffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleRecordingComplete = async (buffer: Buffer) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log('🎤 Recording completed, buffer size:', buffer.length);
      setRecordedAudio(buffer);
      
      // Here you would typically:
      // 1. Upload the audio to your server
      // 2. Process it with AI
      // 3. Display the results
      
      // For demo purposes, we'll just show a success message
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to process recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to process recording');
      setIsProcessing(false);
    }
  };

  const handleRecordingError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Recording error:', errorMessage);
  };

  const handlePermissionsReady = () => {
    setPermissionsReady(true);
    setPermissionError(null);
    console.log('✅ Permissions are ready for recording');
  };

  const handlePermissionsError = (errorMessage: string) => {
    setPermissionsReady(false);
    setPermissionError(errorMessage);
    console.error('Permission error:', errorMessage);
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.floatingContainer,
        padding: '20px',
        maxWidth: '400px',
        margin: '20px auto',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center'
        }}>
          🎤 Dual Audio Recorder Demo
        </h2>
        
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          This demo showcases the enhanced audio recording functionality that captures both microphone and system audio simultaneously.
        </p>

        {/* Permission Checker */}
        {!permissionsReady && (
          <AudioPermissionChecker
            onPermissionGranted={handlePermissionsReady}
            onPermissionDenied={handlePermissionsError}
          />
        )}

        {/* Audio Recorder Component */}
        {permissionsReady && (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onError={handleRecordingError}
            disabled={isProcessing}
          />
        )}

        {/* Permission Error Display */}
        {permissionError && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ⚠️ {permissionError}
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
            color: 'white',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            🔄 Processing audio with AI...
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Success Display */}
        {recordedAudio && !isProcessing && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ✅ Recording completed successfully! ({Math.round(recordedAudio.length / 1024)}KB)
          </div>
        )}

        {/* Feature List */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '8px'
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            🚀 Features
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.6'
          }}>
            <li>🎤 Microphone recording (16kHz, mono, 16-bit)</li>
            <li>🔊 System audio capture (48kHz, mono, 32-bit float)</li>
            <li>🎵 Real-time audio mixing with normalization</li>
            <li>⚡ Live recording status and duration</li>
            <li>🎨 Beautiful UI with animations</li>
            <li>🤖 AI processing integration</li>
            <li>📱 Responsive design</li>
          </ul>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(0, 122, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 122, 255, 0.2)'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#007AFF'
          }}>
            💡 How to Test
          </h4>
          <ol style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.5'
          }}>
            <li>Click "Start Recording"</li>
            <li>Speak into your microphone</li>
            <li>Play some system audio (music, video, etc.)</li>
            <li>Click "Stop Recording"</li>
            <li>Watch the AI process the combined audio</li>
          </ol>
        </div>
      </div>
    </div>
  );
}; 