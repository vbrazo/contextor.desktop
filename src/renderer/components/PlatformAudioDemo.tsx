import React, { useState, useEffect } from 'react';
import { PlatformPermissionChecker } from './PlatformPermissionChecker';
import { PlatformAudioCapture } from '../services/platformAudioCapture';

// ============================================================================
// PLATFORM AUDIO DEMO COMPONENT
// ============================================================================

export const PlatformAudioDemo: React.FC = () => {
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [platform, setPlatform] = useState<'macos' | 'windows' | 'linux'>('windows');

  const audioCapture = new PlatformAudioCapture();

  useEffect(() => {
    detectPlatform();
    const interval = setInterval(() => {
      if (isRecording) {
        const state = audioCapture.getState();
        setRecordingDuration(state.recordingDuration);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  const detectPlatform = () => {
    if (process.platform === 'darwin') {
      setPlatform('macos');
    } else if (process.platform === 'linux') {
      setPlatform('linux');
    } else {
      setPlatform('windows');
    }
  };

  const handlePermissionsReady = () => {
    setPermissionsReady(true);
    setPermissionError(null);
    console.log('✅ Permissions are ready for platform audio capture');
  };

  const handlePermissionsError = (errorMessage: string) => {
    setPermissionsReady(false);
    setPermissionError(errorMessage);
    console.error('❌ Permission error:', errorMessage);
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      
      console.log('🎯 Starting platform audio capture...');
      const result = await audioCapture.startCapture(5, 'medium'); // 5s screenshot interval
      
      if (result.success) {
        setIsRecording(true);
        console.log('✅ Platform audio capture started successfully');
      } else {
        throw new Error(result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      
      console.log('🛑 Stopping platform audio capture...');
      const result = await audioCapture.stopCapture();
      
      if (result.success) {
        setIsRecording(false);
        setRecordingDuration(0);
        
        if (result.audioChunks && result.audioChunks.length > 0) {
          setAudioChunks(result.audioChunks);
          console.log(`✅ Recording completed with ${result.audioChunks.length} audio chunks`);
          
          // Process the audio chunks
          await processAudioChunks(result.audioChunks);
        } else {
          console.log('⚠️ No audio chunks captured');
        }
      } else {
        throw new Error('Failed to stop recording');
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsRecording(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualScreenshot = async () => {
    try {
      console.log('📸 Capturing manual screenshot...');
      const result = await audioCapture.captureManualScreenshot('medium');
      
      if (result.success) {
        console.log('✅ Manual screenshot captured successfully');
        // Here you could display the screenshot or send it for processing
      } else {
        console.error('❌ Failed to capture manual screenshot:', result.error);
        setError(result.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('❌ Error capturing manual screenshot:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const processAudioChunks = async (chunks: any[]) => {
    try {
      console.log('🔄 Processing audio chunks...');
      
      // Analyze the chunks
      const micChunks = chunks.filter(chunk => chunk.source === 'microphone');
      const systemChunks = chunks.filter(chunk => chunk.source === 'system');
      
      console.log(`📊 Audio Analysis:
        - Total chunks: ${chunks.length}
        - Microphone chunks: ${micChunks.length}
        - System audio chunks: ${systemChunks.length}
        - Recording duration: ${Math.round(recordingDuration / 1000)}s
      `);
      
      // Here you would typically:
      // 1. Combine and process the audio chunks
      // 2. Send to AI service for analysis
      // 3. Display results
      
      // For demo purposes, we'll just show a success message
      setTimeout(() => {
        console.log('✅ Audio processing completed');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error processing audio chunks:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎤 Platform Audio Capture Demo</h1>
        <p style={styles.subtitle}>
          Cross-platform audio capture with Glass-inspired architecture
        </p>
        <div style={styles.platformBadge}>
          {platform === 'macos' && '🍎 macOS'}
          {platform === 'windows' && '🪟 Windows'}
          {platform === 'linux' && '🐧 Linux'}
        </div>
      </div>

      {/* Permission Checker */}
      {!permissionsReady && (
        <PlatformPermissionChecker
          onPermissionsReady={handlePermissionsReady}
          onPermissionsError={handlePermissionsError}
        />
      )}

      {/* Main Demo Interface */}
      {permissionsReady && (
        <div style={styles.demoContainer}>
          {/* Status Display */}
          <div style={styles.statusContainer}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>🎤 Microphone:</span>
              <span style={{
                ...styles.statusValue,
                color: isRecording ? '#4CAF50' : '#666'
              }}>
                {isRecording ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>🔊 System Audio:</span>
              <span style={{
                ...styles.statusValue,
                color: isRecording ? '#4CAF50' : '#666'
              }}>
                {isRecording ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>📸 Screenshots:</span>
              <span style={{
                ...styles.statusValue,
                color: isRecording ? '#4CAF50' : '#666'
              }}>
                {isRecording ? 'Auto (5s)' : 'Manual'}
              </span>
            </div>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div style={styles.recordingStatus}>
              <div style={styles.recordingIndicator}>
                <div style={styles.pulseDot}></div>
                <span style={styles.recordingText}>Recording...</span>
              </div>
              <div style={styles.recordingDuration}>
                {formatDuration(recordingDuration)}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div style={styles.controls}>
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={isProcessing}
                style={{
                  ...styles.recordButton,
                  ...(isProcessing ? styles.disabledButton : {})
                }}
              >
                {isProcessing ? 'Starting...' : '🎤 Start Recording'}
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                disabled={isProcessing}
                style={{
                  ...styles.stopButton,
                  ...(isProcessing ? styles.disabledButton : {})
                }}
              >
                {isProcessing ? 'Stopping...' : '⏹️ Stop Recording'}
              </button>
            )}

            <button
              onClick={handleManualScreenshot}
              disabled={isRecording || isProcessing}
              style={{
                ...styles.screenshotButton,
                ...(isRecording || isProcessing ? styles.disabledButton : {})
              }}
            >
              📸 Manual Screenshot
            </button>
          </div>

          {/* Results Display */}
          {audioChunks.length > 0 && (
            <div style={styles.resultsContainer}>
              <h3 style={styles.resultsTitle}>📊 Recording Results</h3>
              <div style={styles.resultsGrid}>
                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Total Chunks:</span>
                  <span style={styles.resultValue}>{audioChunks.length}</span>
                </div>
                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Microphone:</span>
                  <span style={styles.resultValue}>
                    {audioChunks.filter(chunk => chunk.source === 'microphone').length}
                  </span>
                </div>
                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>System Audio:</span>
                  <span style={styles.resultValue}>
                    {audioChunks.filter(chunk => chunk.source === 'system').length}
                  </span>
                </div>
                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Duration:</span>
                  <span style={styles.resultValue}>
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={styles.errorContainer}>
              <h4 style={styles.errorTitle}>❌ Error</h4>
              <p style={styles.errorText}>{error}</p>
              <button
                onClick={() => setError(null)}
                style={styles.dismissButton}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Permission Error Display */}
          {permissionError && (
            <div style={styles.errorContainer}>
              <h4 style={styles.errorTitle}>🔐 Permission Error</h4>
              <p style={styles.errorText}>{permissionError}</p>
              <button
                onClick={() => setPermissionError(null)}
                style={styles.dismissButton}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Feature List */}
          <div style={styles.featuresContainer}>
            <h3 style={styles.featuresTitle}>✨ Features</h3>
            <ul style={styles.featuresList}>
              <li>🎯 Platform-specific audio capture (macOS, Windows, Linux)</li>
              <li>🔊 System audio capture with echo cancellation</li>
              <li>🎤 Microphone capture with noise suppression</li>
              <li>📸 Automatic and manual screenshot capture</li>
              <li>🔐 Comprehensive permission management</li>
              <li>⚡ Real-time audio processing</li>
              <li>🛡️ Graceful error handling and fallbacks</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  
  title: {
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#666',
  },
  
  platformBadge: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  demoContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  
  statusContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  
  statusItem: {
    background: 'rgba(248, 249, 250, 0.8)',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  
  statusLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginRight: '8px',
  },
  
  statusValue: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  recordingStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(76, 175, 80, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid rgba(76, 175, 80, 0.2)',
  },
  
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  
  pulseDot: {
    width: '12px',
    height: '12px',
    background: '#4CAF50',
    borderRadius: '50%',
    marginRight: '8px',
    animation: 'pulse 1s infinite',
  },
  
  recordingText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  
  recordingDuration: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  
  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  
  recordButton: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.2s ease',
    flex: '1',
    minWidth: '200px',
  },
  
  stopButton: {
    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
    transition: 'all 0.2s ease',
    flex: '1',
    minWidth: '200px',
  },
  
  screenshotButton: {
    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
    transition: 'all 0.2s ease',
    flex: '1',
    minWidth: '200px',
  },
  
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  
  resultsContainer: {
    background: 'rgba(248, 249, 250, 0.8)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  
  resultsTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  resultLabel: {
    fontSize: '14px',
    color: '#666',
  },
  
  resultValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  errorContainer: {
    background: 'rgba(244, 67, 54, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid rgba(244, 67, 54, 0.2)',
  },
  
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f44336',
  },
  
  errorText: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#666',
  },
  
  dismissButton: {
    background: 'rgba(244, 67, 54, 0.2)',
    color: '#f44336',
    border: '1px solid rgba(244, 67, 54, 0.3)',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  featuresContainer: {
    background: 'rgba(0, 122, 255, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid rgba(0, 122, 255, 0.2)',
  },
  
  featuresTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  
  featuresList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
}; 